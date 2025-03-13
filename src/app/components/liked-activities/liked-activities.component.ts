import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivityService, Activity } from '../../services/activity.service';
import { Observable, map, switchMap, of } from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-liked-activities',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent,
  ],
  templateUrl: './liked-activities.component.html',
  styleUrls: ['./liked-activities.component.css'],
})
export class LikedActivitiesComponent implements OnInit {
  favoriteActivities: Activity[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  isDarkMode: boolean = false;

  constructor(private activityService: ActivityService) {}

  ngOnInit(): void {
    this.loadFavoriteActivities();
    this.detectDarkMode();
  }

  /**
   * Detect if dark mode is enabled
   */
  detectDarkMode(): void {
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

  loadFavoriteActivities(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.activityService.getFavorites().subscribe({
      next: (favoriteIds) => {
        this.favoriteActivities = [];

        // Get full activity details for each favorite ID
        favoriteIds.forEach((id) => {
          const activity = this.activityService.getActivityByIdSync(id);
          if (activity) {
            this.favoriteActivities.push(activity);
          }
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading favorite activities', error);
        this.errorMessage =
          'Failed to load your favorite activities. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  removeFromFavorites(activityId: number): void {
    this.activityService.toggleFavorite(activityId);
    // Refresh the list
    this.loadFavoriteActivities();
  }

  getActivityImage(activity: Activity): string | undefined {
    if (activity.images && activity.images.length > 0) {
      return activity.images[0];
    }
    return undefined;
  }
}
