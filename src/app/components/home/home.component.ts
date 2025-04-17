import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { FilterComponent } from '../filter/filter.component';
import { ActivityListComponent, SortOption } from '../activity-list/activity-list.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { Activity, ActivityFilter, ActivityService } from '../../services/activity.service';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Router } from '@angular/router';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    SearchBarComponent,
    FilterComponent,
    ActivityListComponent,
    ActivityCardComponent,
    BottomNavComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private activityService = inject(ActivityService);

  // Reactive state using signals
  isFilterOpen = signal(false);
  isLoading = signal(true);
  error = signal<string | null>(null);
  currentCity = signal<string>('Paris');
  currentSort = signal<SortOption>('newest');
  currentPage = signal<number>(1);
  
  // Computed properties from the ActivityService
  activities = computed(() => this.activityService.activities());
  filteredActivities = computed(() => this.activityService.filteredActivities());
  
  featuredActivities = computed(() => 
    this.filteredActivities()
      .filter(activity => activity.metadata?.social?.ratings?.averageRating && 
              activity.metadata.social.ratings.averageRating > 4.0)
      .slice(0, 3)
  );
  
  noActivitiesFound = computed(() => 
    !this.isLoading() && 
    this.filteredActivities().length === 0
  );
  
  hasError = computed(() => !!this.error());

  // View references
  @ViewChild('activitySection') activitySection?: ElementRef;

  // Getter for the current filter (for template use)
  currentActivityFilter(): ActivityFilter {
    return this.activityService.currentFilter();
  }

  ngOnInit(): void {
    this.loadInitialActivities();
    
    // Listen for window resize events to handle responsive behavior
    this.handleWindowResize();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Handle window resize for responsive adjustments
  @HostListener('window:resize')
  handleWindowResize(): void {
    // Additional responsive behavior could be added here
    // const isMobile = window.innerWidth < 768;
    // Adjust UI based on screen size if needed
  }

  // Load initial activities
  loadInitialActivities(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.activityService.getActivitiesByCity(this.currentCity())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          // Process featured activities if needed
          if (response.activities.length > 0 && !this.featuredActivities().length) {
            this.processFeaturedActivities(response.activities);
          }
        },
        error: (err) => {
          console.error('Error loading activities', err);
          this.error.set('Failed to load activities. Please try again later.');
        }
      });
  }
  
  // Process and select featured activities
  private processFeaturedActivities(activities: Activity[]): void {
    // Get activities with highest ratings - for future use
    activities
      .filter(a => a.metadata?.social?.ratings?.averageRating)
      .sort((a, b) => 
        (b.metadata?.social?.ratings?.averageRating || 0) - 
        (a.metadata?.social?.ratings?.averageRating || 0)
      )
      .slice(0, 3);
  }

  // Open filter panel
  openFilter(): void {
    this.isFilterOpen.set(true);
  }

  // Close filter panel
  closeFilter(): void {
    this.isFilterOpen.set(false);
  }

  // Apply filters from filter component
  applyFilter(filter: ActivityFilter): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    // Set current city
    if (filter.city) {
      this.currentCity.set(filter.city);
    }
    
    // Apply filters through service
    this.activityService.applyFilters({
      ...filter,
      city: filter.city || this.currentCity()
    });
    
    // Get activities with updated filters
    this.activityService.getActivitiesByCity(filter.city || this.currentCity(), filter)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          // Finish loading after data is received
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: () => {
          // The ActivityService now contains the updated activity data
        },
        error: (err) => {
          console.error('Error applying filters', err);
          this.error.set('Failed to update activities. Please try again later.');
        }
      });
    
    // Reset to first page
    this.currentPage.set(1);
  }

  // Reset filters
  resetFilter(): void {
    this.isLoading.set(true);
    this.activityService.resetFilters();
    
    // Reload activities after reset
    this.activityService.getActivitiesByCity(this.currentCity())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: () => {
          // The ActivityService now contains the updated activity data
        },
        error: (err) => {
          console.error('Error resetting filters', err);
          this.error.set('Failed to reset activities. Please try again later.');
        }
      });
      
    this.currentPage.set(1);
  }

  // Handle search event from search bar
  onSearch(searchTerm: string): void {
    const currentFilter = this.activityService.currentFilter();
    
    this.applyFilter({
      ...currentFilter,
      searchTerm
    });
    
    // Scroll to activities section when search is performed
    setTimeout(() => {
      this.scrollToActivities();
    }, 100);
  }

  // Handle favorite toggle
  toggleFavorite(activityId: string): void {
    // Only authenticated users can favorite activities
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }
    
    this.favoritesService.toggleFavorite(activityId).subscribe();
  }
  
  // Handle city change
  onCityChange(city: string): void {
    if (city === this.currentCity()) return;
    
    this.isLoading.set(true);
    this.currentCity.set(city);
    
    const currentFilter = this.activityService.currentFilter();
    
    // Update city in filter and get new activities
    this.activityService.getActivitiesByCity(city, {
      ...currentFilter,
      city
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading.set(false))
    )
    .subscribe({
      next: () => {
        // The ActivityService now contains the updated activity data
      },
      error: (err) => {
        console.error('Error changing city', err);
        this.error.set(`Failed to load activities for ${city}. Please try again later.`);
      }
    });
  }
  
  // Handle sort change
  onSortChange(event: Event | SortOption): void {
    // Handle both event from template and direct SortOption from child component
    const newSort = typeof event === 'string' 
      ? event as SortOption
      : (event.target as HTMLSelectElement).value as SortOption;
      
    this.currentSort.set(newSort);
  }
  
  // Handle page change
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.scrollToActivities();
  }
  
  // Handle activity selection
  onActivitySelected(activity: Activity): void {
    this.router.navigate(['/activities', activity.id]);
  }
  
  // Refresh activities
  refreshActivities(): void {
    this.loadInitialActivities();
  }
  
  // Scroll to activities section
  private scrollToActivities(): void {
    if (this.activitySection) {
      this.activitySection.nativeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}
