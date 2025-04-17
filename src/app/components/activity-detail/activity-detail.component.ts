import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Activity, ActivityService } from '../../services/activity.service';
import { FavoritesService } from '../../services/favorites.service';
import { RatingService, RatingStats } from '../../services/rating.service';
import { Group, GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { ActivityDetailInfoComponent } from '../activity-detail-info/activity-detail-info.component';
import { CommentComponent } from '../comment/comment.component';
import { DialogComponent } from '../dialog/dialog.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { Subject, forkJoin, catchError, takeUntil, of } from 'rxjs';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ActivityDetailInfoComponent,
    CommentComponent,
    DialogComponent,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent,
  ],
  templateUrl: './activity-detail.component.html',
  styleUrls: ['./activity-detail.component.css'],
})
export class ActivityDetailComponent implements OnInit, OnDestroy {
  activity?: Activity;
  isLoading = true;
  errorMessage = '';
  currentImageIndex = 0;
  ratingStats?: RatingStats;
  userRating?: number;
  isLiked = false;
  isFavorited = false;
  
  // Flag to detect browser environment
  private isBrowser: boolean;

  // Share dialog
  showShareDialog = false;
  shareForm!: FormGroup;
  userGroups: Group[] = [];
  isLoadingGroups = false;
  shareErrorMessage = '';
  shareSuccessMessage = '';
  isSubmittingShare = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityService: ActivityService,
    private favoritesService: FavoritesService,
    private ratingService: RatingService,
    private groupService: GroupService,
    public authService: AuthService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadActivityData();
    this.initShareForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadActivityData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Invalid activity ID';
      this.isLoading = false;
      return;
    }

    // Load activity details and related data
    this.activityService.getActivityById(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('[ActivityDetail] Error loading activity:', error);
          this.errorMessage = 'Failed to load activity details';
          return of(null);
        })
      )
      .subscribe(activity => {
        if (!activity) {
          this.isLoading = false;
          return;
        }

        this.activity = activity;

        // Check if user is authenticated to load personal data
        if (this.authService.isAuthenticated()) {
          // Load additional data in parallel
          forkJoin({
            ratingStats: this.ratingService.getRatingStats(id).pipe(
              catchError(() => of({ averageRating: 0, ratingCount: 0 }))
            ),
            userRating: this.ratingService.hasRatedActivity(id).pipe(
              catchError(() => of(false))
            ),
            isFavorite: this.favoritesService.checkIsFavorite(id).pipe(
              catchError(() => of(false))
            ),
            isLiked: this.activityService.hasLiked(id).pipe(
              catchError(() => of(false))
            )
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (results) => {
              this.ratingStats = results.ratingStats;
              this.userRating = typeof results.userRating === 'number' ? results.userRating : undefined;
              this.isFavorited = results.isFavorite;
              this.isLiked = results.isLiked;
              this.isLoading = false;
            },
            error: () => {
              this.isLoading = false;
            }
          });
        } else {
          // For non-authenticated users, just show activity data
          this.isLoading = false;
          
          // Use metadata if available for public data
          if (activity.metadata?.social?.ratings) {
            this.ratingStats = {
              averageRating: activity.metadata.social.ratings.averageRating,
              ratingCount: activity.metadata.social.ratings.ratingCount
            };
          }
        }
      });
  }

  // Image carousel methods
  nextImage(): void {
    if (!this.activity || !this.activity.images.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.activity.images.length;
  }

  prevImage(): void {
    if (!this.activity || !this.activity.images.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.activity.images.length) % this.activity.images.length;
  }

  goToImage(index: number): void {
    if (!this.activity || !this.activity.images.length) return;
    if (index >= 0 && index < this.activity.images.length) {
      this.currentImageIndex = index;
    }
  }

  // Like functionality - social action to show appreciation
  toggleLike(): void {
    if (!this.activity) return;

    // Only authenticated users can like activities
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.isLoading = true;
    if (this.isLiked) {
      // Unlike the activity
      this.activityService.unlikeActivity(this.activity.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isLiked = false;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('[ActivityDetail] Error unliking activity:', error);
            this.isLoading = false;
          }
        });
    } else {
      // Like the activity
      this.activityService.likeActivity(this.activity.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isLiked = true;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('[ActivityDetail] Error liking activity:', error);
            this.isLoading = false;
          }
        });
    }
  }

  // Favorite functionality - personal bookmark action
  toggleFavorite(): void {
    if (!this.activity) return;

    // Only authenticated users can add favorites
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.isLoading = true;
    this.favoritesService.toggleFavorite(this.activity.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isFavorited = !this.isFavorited;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[ActivityDetail] Error toggling favorite:', error);
          this.isLoading = false;
        }
      });
  }

  // Rating functionality
  rateActivity(rating: number): void {
    if (!this.activity || !this.authService.isAuthenticated()) {
      if (!this.authService.isAuthenticated()) {
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: this.router.url }
        });
      }
      return;
    }

    this.isLoading = true;
    this.ratingService.rateActivity(this.activity.id, rating)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.userRating = rating;
          // Refresh rating stats
          if (this.activity) {
            this.ratingService.getRatingStats(this.activity.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe(stats => {
                this.ratingStats = stats;
                this.isLoading = false;
              });
          } else {
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('[ActivityDetail] Error rating activity:', error);
          this.isLoading = false;
        }
      });
  }

  // Share to group functionality
  private initShareForm(): void {
    if (!this.isBrowser) {
      // Create a basic form without date defaults if on server
      this.shareForm = this.fb.group({
        groupId: ['', Validators.required],
        plannedDateStart: ['', Validators.required],
        plannedDateEnd: ['', Validators.required],
        allDayEvent: [false],
        additionalInfo: [''],
        meetingPoint: ['']
      });
      return;
    }
    
    // Browser-only code for date handling
    // Set default time to 1 hour from now
    const today = new Date();
    today.setHours(today.getHours() + 1);
    today.setMinutes(0, 0, 0);

    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const todayStr = today.toISOString().slice(0, 16);

    this.shareForm = this.fb.group({
      groupId: ['', Validators.required],
      plannedDateStart: [todayStr, Validators.required],
      plannedDateEnd: ['', Validators.required],
      allDayEvent: [false],
      additionalInfo: [''],
      meetingPoint: ['']
    });

    // When start date changes, update end date to be 2 hours later by default
    this.shareForm.get('plannedDateStart')?.valueChanges.subscribe(startDate => {
      if (startDate) {
        try {
          const startDateTime = new Date(startDate);
          const endDateTime = new Date(startDateTime);
          endDateTime.setHours(endDateTime.getHours() + 2);
          this.shareForm.get('plannedDateEnd')?.setValue(endDateTime.toISOString().slice(0, 16));
        } catch (error) {
          console.error('[ActivityDetail] Error calculating end date:', error);
        }
      }
    });
  }

  openShareDialog(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }
    this.loadUserGroups();
    this.showShareDialog = true;
  }

  closeShareDialog(): void {
    this.showShareDialog = false;
    this.shareErrorMessage = '';
    this.shareSuccessMessage = '';
  }

  private loadUserGroups(): void {
    this.isLoadingGroups = true;
    this.shareErrorMessage = '';

    // Load groups where user is the creator (only owners can add activities)
    this.groupService.getUserCreatedGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          this.userGroups = groups;
          this.isLoadingGroups = false;
        },
        error: (error) => {
          console.error('[ActivityDetail] Error loading groups:', error);
          this.shareErrorMessage = 'Failed to load your groups';
          this.isLoadingGroups = false;
        }
      });
  }

  onShareActivity(): void {
    if (!this.isBrowser || this.shareForm.invalid || !this.activity) {
      return;
    }

    this.isSubmittingShare = true;
    this.shareErrorMessage = '';
    this.shareSuccessMessage = '';

    const groupId = Number(this.shareForm.get('groupId')?.value);
    const plannedDateStart = this.shareForm.get('plannedDateStart')?.value;
    const plannedDateEnd = this.shareForm.get('plannedDateEnd')?.value;
    const allDayEvent = !!this.shareForm.get('allDayEvent')?.value;
    const additionalInfo = this.shareForm.get('additionalInfo')?.value || undefined;
    const meetingPoint = this.shareForm.get('meetingPoint')?.value || undefined;

    // Validate dates
    try {
      const startDate = new Date(plannedDateStart);
      const endDate = new Date(plannedDateEnd);
      const now = new Date();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }

      if (startDate < now) {
        throw new Error('Start date cannot be in the past');
      }

      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }
    } catch (error) {
      this.shareErrorMessage = error instanceof Error ? error.message : 'Invalid date';
      this.isSubmittingShare = false;
      return;
    }

    const activityData = {
      activityId: this.activity.id,
      plannedDateStart,
      plannedDateEnd,
      allDayEvent,
      additionalInfo,
      meetingPoint
    };

    this.groupService.addActivityToGroup(groupId, activityData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.shareSuccessMessage = 'Activity scheduled in group successfully!';
          this.isSubmittingShare = false;
          
          // Reset form but keep the group selection
          const currentGroupId = this.shareForm.get('groupId')?.value;
          this.shareForm.reset({ groupId: currentGroupId });
          this.initShareForm();
        },
        error: (error) => {
          console.error('[ActivityDetail] Error sharing activity to group:', error);
          this.shareErrorMessage = error.message || 'Failed to add activity to group';
          this.isSubmittingShare = false;
        }
      });
  }

  // Helper method to get the average rating either from the rating service or from activity metadata
  getAverageRating(): number {
    if (this.ratingStats?.averageRating !== undefined) {
      return this.ratingStats.averageRating;
    }

    if (this.activity?.metadata?.social?.ratings?.averageRating !== undefined) {
      return this.activity.metadata.social.ratings.averageRating;
    }

    return 0;
  }

  // Helper method to get the rating count
  getRatingCount(): number {
    if (this.ratingStats?.ratingCount !== undefined) {
      return this.ratingStats.ratingCount;
    }

    if (this.activity?.metadata?.social?.ratings?.ratingCount !== undefined) {
      return this.activity.metadata.social.ratings.ratingCount;
    }

    return 0;
  }
}
