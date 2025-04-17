import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Activity, ActivityService } from '../../services/activity.service';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../services/auth.service';
import { Observable, of, catchError, take } from 'rxjs';

export interface DisplayMetrics {
  likeCount: number;
  commentCount: number;
  rating: {
    value: number;
    count: number;
  };
}

@Component({
  selector: 'app-activity-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './activity-card.component.html',
})
export class ActivityCardComponent implements OnInit {
  private activityService = inject(ActivityService);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  
  @Input() activity!: Activity;
  @Input() featured = false;
  @Output() favoriteToggle = new EventEmitter<string>();
  
  // State signals
  isFavorited = signal<boolean>(false);
  
  // Display metrics signal
  metrics = signal<DisplayMetrics>({
    likeCount: 0,
    commentCount: 0,
    rating: {
      value: 0,
      count: 0
    }
  });
  
  // Computed properties for display
  displayImage = computed(() => {
    return this.activity.images && this.activity.images.length > 0 
      ? this.activity.images[0] 
      : 'https://via.placeholder.com/400x300?text=Activity';
  });
  
  displayCategories = computed(() => {
    return this.activity.categories || [];
  });

  displaySubCategories = computed(() => {
    return this.activity.subcategories || [];
  });
  
  displayTags = computed(() => {
    return this.activity.tags || [];
  });
  
  displayCity = computed(() => {
    return this.activity.city || 'Unknown location';
  });
  
  displayName = computed(() => {
    return this.activity.name || 'Unnamed Activity';
  });
  
  displayPrice = computed(() => {
    if (!this.activity.filters?.price) return null;
    
    const priceMap: Record<string, string> = {
      'free': 'Free',
      'paid': 'Paid',
      'unknown': 'Varies'
    };
    
    return priceMap[this.activity.filters.price];
  });
  
  displayAccessibility = computed(() => {
    if (!this.activity.filters?.accessibility) return null;
    
    const accessibilityMap: Record<string, string> = {
      'full': 'Fully Accessible',
      'limited': 'Limited Accessibility',
      'none': 'Not Accessible',
      'unknown': 'Accessibility Unknown'
    };
    
    return accessibilityMap[this.activity.filters.accessibility];
  });
  
  displayRating = computed(() => {
    const metadata = this.activity.metadata?.social?.ratings;
    return metadata?.averageRating ? metadata.averageRating.toFixed(1) : '0.0';
  });
  
  ngOnInit(): void {
    // Load metrics on init
    this.loadActivityMetrics();
    
    // Check favorite status if authenticated
    if (this.authService.isAuthenticated()) {
      this.checkFavoriteStatus();
    }
  }
  
  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Only authenticated users can favorite activities
    if (!this.authService.isAuthenticated()) {
      // Emit event to parent component to handle navigation
      this.favoriteToggle.emit(this.activity.id);
      return;
    }

    console.log('Toggling favorite for activity:', this.activity.id);
    
    // Use FavoritesService to toggle favorite status
    this.favoritesService.toggleFavorite(this.activity.id).subscribe({
      next: () => {
        this.isFavorited.update(prev => !prev);
        // Emit event to parent component
        this.favoriteToggle.emit(this.activity.id);
      },
      error: (error) => {
        console.error('Error toggling favorite:', error);
      }
    });
  }
  
  isFavorite(): boolean {
    return this.isFavorited();
  }
  
  hasLiked(): Observable<boolean> {
    return this.activityService.hasLiked(this.activity.id).pipe(
      catchError(() => of(false))
    );
  }
  
  /**
   * Check if the activity is in user's favorites
   */
  private checkFavoriteStatus(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }
    
    this.favoritesService.checkIsFavorite(this.activity.id)
      .pipe(take(1))
      .subscribe({
        next: (isFavorite) => {
          this.isFavorited.set(isFavorite);
        },
        error: () => {
          this.isFavorited.set(false);
        }
      });
  }
  
  getMainCategory(): string {
    return this.displayCategories()[0] || 'Autres';
  }
  
  getSubCategory(): string {
    return this.displaySubCategories()[0] || 'Autres';
  }
  
  getOpeningStatus(): string | null {
    return this.activity.filters?.opening_status || null;
  }
  
  /**
   * Get the primary tag for display
   */
  getPrimaryTag(): string | null {
    return this.displayTags()[0] || null;
  }
  
  /**
   * Get a formatted time period if available in the tags
   */
  getTimePeriod(): string | null {
    const timeRegex = /(morning|afternoon|evening|night|weekend|weekday)/i;
    const timeTag = this.displayTags().find(tag => timeRegex.test(tag));
    return timeTag || null;
  }
  
  /**
   * Load activity metrics like likes and ratings
   */
  private loadActivityMetrics(): void {
    // Get like count
    this.activityService.getLikeCount(this.activity.id)
      .pipe(take(1))
      .subscribe(count => {
        const current = this.metrics();
        this.metrics.set({
          ...current,
          likeCount: count
        });
      });
      
    // Extract rating information from metadata if available
    if (this.activity.metadata?.social?.ratings) {
      const ratings = this.activity.metadata.social.ratings;
      const current = this.metrics();
      this.metrics.set({
        ...current,
        rating: {
          value: ratings.averageRating || 0,
          count: ratings.ratingCount || 0
        }
      });
    }
  }
}
