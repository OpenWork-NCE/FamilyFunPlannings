import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Activity, ActivityService } from '../../services/activity.service';
import { Group, GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { CarouselComponent } from '../carousel/carousel.component';
import { ActivityDetailInfoComponent } from '../activity-detail-info/activity-detail-info.component';
import { CommentComponent } from '../comment/comment.component';
import { DialogComponent } from '../dialog/dialog.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CarouselComponent,
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
export class ActivityDetailComponent implements OnInit {
  activity?: Activity;
  isLoading = true;
  errorMessage = '';
  currentImageIndex = 0;

  // Share dialog
  showShareDialog = false;
  shareForm!: FormGroup;
  userGroups: Group[] = [];
  isLoadingGroups = false;
  shareErrorMessage = '';
  shareSuccessMessage = '';
  isSubmittingShare = false;

  constructor(
    private route: ActivatedRoute,
    private activityService: ActivityService,
    private groupService: GroupService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadActivity();
    this.initShareForm();
  }

  private loadActivity(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (isNaN(id)) {
      this.errorMessage = 'Invalid activity ID';
      this.isLoading = false;
      return;
    }

    this.activityService.getActivityById(id).subscribe({
      next: (activity) => {
        if (activity) {
          this.activity = activity;
        } else {
          this.errorMessage = 'Activity not found';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load activity';
        this.isLoading = false;
      },
    });
  }

  // Image slider methods
  nextImage(): void {
    if (!this.activity || !this.activity.images.length) return;
    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.activity.images.length;
  }

  prevImage(): void {
    if (!this.activity || !this.activity.images.length) return;
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.activity.images.length) %
      this.activity.images.length;
  }

  goToImage(index: number): void {
    if (!this.activity || !this.activity.images.length) return;
    if (index >= 0 && index < this.activity.images.length) {
      this.currentImageIndex = index;
    }
  }

  private initShareForm(): void {
    // Get today's date in YYYY-MM-DDTHH:MM format for datetime-local input
    const today = new Date();
    today.setHours(today.getHours() + 1); // Set default time to 1 hour from now
    today.setMinutes(0, 0, 0); // Reset seconds and milliseconds

    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const todayStr = today.toISOString().slice(0, 16);

    console.log('Default planned date:', todayStr);

    this.shareForm = this.fb.group({
      groupId: ['', Validators.required],
      plannedDate: [todayStr, Validators.required],
    });
  }

  toggleFavorite(): void {
    if (!this.activity) return;

    this.activityService.toggleFavorite(this.activity.id);
  }

  isFavorite(): boolean {
    if (!this.activity) return false;

    return this.activityService.isFavorite(this.activity.id);
  }

  openShareDialog(): void {
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

    this.groupService.getOwnedGroups().subscribe({
      next: (groups) => {
        this.userGroups = groups;
        this.isLoadingGroups = false;
      },
      error: (error) => {
        this.shareErrorMessage = 'Failed to load groups';
        this.isLoadingGroups = false;
      },
    });
  }

  onShareActivity(): void {
    if (this.shareForm.invalid || !this.activity) {
      return;
    }

    this.isSubmittingShare = true;
    this.shareErrorMessage = '';
    this.shareSuccessMessage = '';

    const groupId = this.shareForm.get('groupId')?.value;
    let plannedDate = this.shareForm.get('plannedDate')?.value;

    // Ensure plannedDate is a valid date string in ISO format
    if (plannedDate) {
      try {
        // Convert to Date object first to validate
        const plannedDateObj = new Date(plannedDate);

        if (isNaN(plannedDateObj.getTime())) {
          this.shareErrorMessage =
            'Invalid date format. Please select a valid date.';
          this.isSubmittingShare = false;
          return;
        }

        // Format as ISO string for storage
        plannedDate = plannedDateObj.toISOString();
        console.log('Formatted planned date:', plannedDate);
      } catch (error) {
        this.shareErrorMessage = 'Error processing date. Please try again.';
        this.isSubmittingShare = false;
        console.error('Date parsing error:', error);
        return;
      }
    } else {
      this.shareErrorMessage =
        'A scheduled date is required for activities to appear in the calendar.';
      this.isSubmittingShare = false;
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(plannedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      this.shareErrorMessage = 'Scheduled date cannot be in the past';
      this.isSubmittingShare = false;
      return;
    }

    // Check if activity already exists in the group with the same date
    if (
      this.groupService.activityExistsInGroup(
        groupId,
        this.activity.id,
        plannedDate
      )
    ) {
      this.shareErrorMessage =
        'This activity already exists in the selected group with the same date';
      this.isSubmittingShare = false;
      return;
    }

    this.groupService
      .addActivityToGroup(groupId, this.activity, plannedDate)
      .subscribe({
        next: () => {
          this.shareSuccessMessage = 'Activity added to group successfully';
          this.isSubmittingShare = false;
          this.shareForm.reset();
          this.initShareForm(); // Reset with default date
        },
        error: (error) => {
          this.shareErrorMessage =
            error.message || 'Failed to add activity to group';
          this.isSubmittingShare = false;
        },
      });
  }

  isGroupOwner(group: Group): boolean {
    const userEmail = this.authService.getCurrentUserEmail();
    return group.owner === userEmail;
  }
}
