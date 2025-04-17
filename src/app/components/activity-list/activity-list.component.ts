import { Component, Input, Output, EventEmitter, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { Activity } from '../../services/activity.service';
import { ActivityCardComponent } from '../activity-card/activity-card.component';

export type SortOption = 'newest' | 'rating' | 'popularity' | 'alphabetical';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [CommonModule, ActivityCardComponent],
  templateUrl: './activity-list.component.html',
})
export class ActivityListComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Input properties with defaults
  @Input() set activities(value: Activity[]) {
    this._activities.set(value);
    this.updateTotalPages();
  }
  get activities(): Activity[] {
    return this._activities();
  }
  @Input() set loading(value: boolean) {
    this._loading.set(value);
  }
  get loading(): boolean {
    return this._loading();
  }
  @Input() emptyStateMessage = 'No activities found. Try adjusting your filters or search for something else.';
  @Input() emptyStateIcon = 'smile';
  @Input() itemsPerPage = 20;
  @Input() enablePagination = true;
  @Input() enableSorting = true;
  @Input() sortOptions: SortOption[] = ['newest', 'rating', 'popularity', 'alphabetical'];
  @Input() set currentSort(value: SortOption) {
    this._currentSort.set(value);
  }
  
  // Output events
  @Output() favoriteToggle = new EventEmitter<string>();
  @Output() activitySelected = new EventEmitter<Activity>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() sortChanged = new EventEmitter<SortOption>();
  @Output() refresh = new EventEmitter<void>();
  
  // Reactive state using signals
  _activities = signal<Activity[]>([]);
  _loading = signal<boolean>(false);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  _currentSort = signal<SortOption>('newest');
  
  // Computed properties
  displayedActivities = computed(() => {
    const activities = this._activities();
    
    if (!this.enablePagination) {
      return this.applySorting(activities);
    }
    
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    return this.applySorting(activities).slice(startIndex, endIndex);
  });
  
  hasActivities = computed(() => this._activities().length > 0);
  
  // Empty state icon mapping
  get emptyStateIconPath(): string {
    const iconMap: Record<string, string> = {
      'smile': 'M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'search': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      'filter': 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
      'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      'error': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    };
    
    return iconMap[this.emptyStateIcon] || iconMap['smile'];
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Track by function for ngFor optimization
  trackByActivityId(_: number, activity: Activity): string {
    return activity.id;
  }

  // Handle favorite toggle from activity card
  onFavoriteToggle(activityId: string): void {
    this.favoriteToggle.emit(activityId);
  }
  
  // Handle activity selection (typically for showing details)
  onActivitySelected(activity: Activity): void {
    this.activitySelected.emit(activity);
  }
  
  // Pagination methods
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.setPage(this.currentPage() + 1);
    }
  }
  
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.setPage(this.currentPage() - 1);
    }
  }
  
  setPage(page: number): void {
    this.currentPage.set(page);
    this.pageChanged.emit(page);
    
    // Scroll to top of list when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // Sorting methods
  setSorting(sort: SortOption): void {
    this._currentSort.set(sort);
    this.sortChanged.emit(sort);
  }
  
  getSortLabel(sort: SortOption): string {
    const labels: Record<SortOption, string> = {
      'newest': 'Newest',
      'rating': 'Highest Rated',
      'popularity': 'Most Popular',
      'alphabetical': 'A-Z'
    };
    return labels[sort];
  }
  
  // Refresh activities (emit event to parent component)
  refreshActivities(): void {
    this.refresh.emit();
  }
  
  // Helpers
  private updateTotalPages(): void {
    const total = Math.ceil(this._activities().length / this.itemsPerPage);
    this.totalPages.set(Math.max(1, total));
    
    // Reset to page 1 if current page is out of bounds
    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(1);
    }
  }
  
  private applySorting(activities: Activity[]): Activity[] {
    const sorted = [...activities];
    
    switch (this._currentSort()) {
      case 'newest':
        return sorted.sort((a, b) => {
          return (b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0) - 
                 (a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0);
        });
        
      case 'rating':
        return sorted.sort((a, b) => {
          const ratingA = a.metadata?.social?.ratings?.averageRating || 0;
          const ratingB = b.metadata?.social?.ratings?.averageRating || 0;
          return ratingB - ratingA;
        });
        
      case 'popularity':
        return sorted.sort((a, b) => {
          const likesA = a.metadata?.social?.likeCount || 0;
          const likesB = b.metadata?.social?.likeCount || 0;
          return likesB - likesA;
        });
        
      case 'alphabetical':
        return sorted.sort((a, b) => {
          return (a.name || '').localeCompare(b.name || '');
        });
        
      default:
        return sorted;
    }
  }
}
