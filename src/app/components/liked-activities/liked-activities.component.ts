import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { ActivityCardComponent } from '../activity-card/activity-card.component';

import { FavoritesService, Favorite } from '../../services/favorites.service';
import { Activity } from '../../services/activity.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-liked-activities',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent,
    ActivityCardComponent
  ],
  templateUrl: './liked-activities.component.html',
  styleUrls: ['./liked-activities.component.css'],
})
export class LikedActivitiesComponent implements OnInit, OnDestroy {
  favoriteActivities: Activity[] = [];
  favoriteItems: Favorite[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  isDarkMode = false;
  
  private destroy$ = new Subject<void>();
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // Redirect unauthenticated users to login
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }
    
    this.loadFavoriteActivities();
    this.detectDarkMode();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Detect if dark mode is enabled
   */
  detectDarkMode(): void {
    if (typeof window === 'undefined') return; // Guard for SSR
    
    // Check if the user prefers dark mode
    this.isDarkMode =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Listen for changes in color scheme preference
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        this.isDarkMode = event.matches;
      });

    // Also check if the document has a dark class (for manual toggles)
    if (document.documentElement.classList.contains('dark')) {
      this.isDarkMode = true;
    }
  }

  /**
   * Load all favorites for the current user
   */
  loadFavoriteActivities(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Use FavoritesService to get favorite activities
    this.favoritesService.getFavoriteActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          this.favoriteActivities = activities;
          
          // Also load the raw favorite items to get IDs and additional metadata
          this.loadFavoriteItems();
        },
        error: (error) => {
          console.error('Error loading favorite activities', error);
          this.errorMessage =
            'Failed to load your favorite activities. Please try again later.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Load raw favorite items to get IDs and additional metadata
   */
  loadFavoriteItems(): void {
    this.favoritesService.getUserFavorites()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (favorites) => {
          this.favoriteItems = favorites;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading favorite items', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle favorite toggle event from activity card
   */
  onFavoriteToggle(activityId: string): void {
    this.removeFromFavorites(activityId);
  }

  /**
   * Remove an activity from favorites
   */
  removeFromFavorites(activityId: string): void {
    this.isLoading = true;
    
    // Use FavoritesService to remove favorite
    this.favoritesService.removeFromFavorites(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Show success feedback
          console.log(`Removed activity ${activityId} from favorites`);
          
          // Update local state without full reload for better UX
          this.favoriteActivities = this.favoriteActivities.filter(
            activity => activity.id !== activityId
          );
          
          this.favoriteItems = this.favoriteItems.filter(
            item => item.activityId !== activityId
          );
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error removing favorite', error);
          this.errorMessage = 'Failed to remove from favorites. Please try again.';
          this.isLoading = false;
          
          // Refresh the list to ensure consistency
          this.loadFavoriteActivities();
        }
      });
  }

  /**
   * Get favorite item ID by activity ID
   */
  getFavoriteId(activityId: string): number | undefined {
    const favorite = this.favoriteItems.find(item => item.activityId === activityId);
    return favorite?.id;
  }

  /**
   * Get date when the activity was added to favorites
   */
  getAddedDate(activityId: string): string | undefined {
    const favorite = this.favoriteItems.find(item => item.activityId === activityId);
    return favorite?.addedDate;
  }

  /**
   * Format date to a readable string
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date', e);
      return dateString;
    }
  }

  /**
   * Navigate to activities page
   */
  navigateToActivities(): void {
    this.router.navigate(['/activities']);
  }
}
