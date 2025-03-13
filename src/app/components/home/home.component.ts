import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { FilterComponent } from '../filter/filter.component';
import { ActivityListComponent } from '../activity-list/activity-list.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import {
  ActivityService,
  ActivityFilter,
} from '../../services/activity.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    CarouselComponent,
    SearchBarComponent,
    FilterComponent,
    ActivityListComponent,
    BottomNavComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  isFilterOpen = false;
  isLoading = true;

  constructor(public activityService: ActivityService) {}

  ngOnInit(): void {
    // Load activities and handle guest mode
    this.isLoading = true;
    this.activityService.getActivities().subscribe({
      next: (activities) => {
        // Set initial activities
        this.activityService.activities.set(activities);
        this.activityService.filteredActivities.set(activities);

        // Set featured activities
        this.activityService.featuredActivities.set(
          this.activityService.getRandomActivities(3)
        );

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading activities:', error);
        this.isLoading = false;
      },
    });
  }

  openFilter(): void {
    this.isFilterOpen = true;
  }

  closeFilter(): void {
    this.isFilterOpen = false;
  }

  applyFilter(filter: ActivityFilter): void {
    this.activityService.applyFilters(filter);
  }

  resetFilter(): void {
    this.activityService.resetFilters();
  }

  onSearch(searchTerm: string): void {
    const currentFilter = this.activityService.currentFilter();
    this.activityService.applyFilters({
      ...currentFilter,
      searchTerm,
    });
  }

  toggleFavorite(activityId: number): void {
    this.activityService.toggleFavorite(activityId);
  }
}
