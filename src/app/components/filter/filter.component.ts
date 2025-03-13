import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityFilter } from '../../services/activity.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.component.html',
})
export class FilterComponent {
  @Input() isOpen: boolean = false;
  @Input() currentFilter: ActivityFilter = {};
  @Output() close = new EventEmitter<void>();
  @Output() applyFilter = new EventEmitter<ActivityFilter>();
  @Output() resetFilter = new EventEmitter<void>();

  // Local filter state
  filter: ActivityFilter = {};

  // Filter options
  locations: ('Indoor' | 'Outdoor' | 'Both')[] = ['Indoor', 'Outdoor', 'Both'];
  ageGroups: ('Kids' | 'Teens' | 'Parents' | 'All ages')[] = [
    'Kids',
    'Teens',
    'Parents',
    'All ages',
  ];
  timeOfDay: ('Morning' | 'Afternoon' | 'Evening')[] = [
    'Morning',
    'Afternoon',
    'Evening',
  ];
  categories: ('Adventure' | 'Educational' | 'Nature' | 'Arts' | 'Sports')[] = [
    'Adventure',
    'Educational',
    'Nature',
    'Arts',
    'Sports',
  ];

  // Budget range
  minBudget: number = 20;
  maxBudget: number = 100;
  currentMinBudget: number = 20;
  currentMaxBudget: number = 100;

  ngOnChanges(): void {
    // Initialize local filter with current filter values
    this.filter = { ...this.currentFilter };

    // Set budget range
    if (this.currentFilter.budgetRange) {
      this.currentMinBudget = this.currentFilter.budgetRange.min;
      this.currentMaxBudget = this.currentFilter.budgetRange.max;
    } else {
      this.currentMinBudget = this.minBudget;
      this.currentMaxBudget = this.maxBudget;
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onApply(): void {
    // Create a copy of the filter
    const filterToApply: ActivityFilter = { ...this.filter };

    // Add budget range if it's not the default
    if (
      this.currentMinBudget !== this.minBudget ||
      this.currentMaxBudget !== this.maxBudget
    ) {
      filterToApply.budgetRange = {
        min: this.currentMinBudget,
        max: this.currentMaxBudget,
      };
    }

    this.applyFilter.emit(filterToApply);
    this.close.emit();
  }

  onReset(): void {
    this.filter = {};
    this.currentMinBudget = this.minBudget;
    this.currentMaxBudget = this.maxBudget;
    this.resetFilter.emit();
    this.close.emit();
  }

  toggleLocation(location: 'Indoor' | 'Outdoor' | 'Both'): void {
    if (!this.filter.location) {
      this.filter.location = [];
    }

    const index = this.filter.location.indexOf(location);
    if (index === -1) {
      this.filter.location.push(location);
    } else {
      this.filter.location.splice(index, 1);
    }

    // Remove empty arrays
    if (this.filter.location.length === 0) {
      delete this.filter.location;
    }
  }

  toggleAgeGroup(ageGroup: 'Kids' | 'Teens' | 'Parents' | 'All ages'): void {
    if (!this.filter.ageGroups) {
      this.filter.ageGroups = [];
    }

    const index = this.filter.ageGroups.indexOf(ageGroup);
    if (index === -1) {
      this.filter.ageGroups.push(ageGroup);
    } else {
      this.filter.ageGroups.splice(index, 1);
    }

    // Remove empty arrays
    if (this.filter.ageGroups.length === 0) {
      delete this.filter.ageGroups;
    }
  }

  toggleTimeOfDay(time: 'Morning' | 'Afternoon' | 'Evening'): void {
    if (!this.filter.timeOfDay) {
      this.filter.timeOfDay = [];
    }

    const index = this.filter.timeOfDay.indexOf(time);
    if (index === -1) {
      this.filter.timeOfDay.push(time);
    } else {
      this.filter.timeOfDay.splice(index, 1);
    }

    // Remove empty arrays
    if (this.filter.timeOfDay.length === 0) {
      delete this.filter.timeOfDay;
    }
  }

  toggleCategory(
    category: 'Adventure' | 'Educational' | 'Nature' | 'Arts' | 'Sports'
  ): void {
    if (!this.filter.category) {
      this.filter.category = [];
    }

    const index = this.filter.category.indexOf(category);
    if (index === -1) {
      this.filter.category.push(category);
    } else {
      this.filter.category.splice(index, 1);
    }

    // Remove empty arrays
    if (this.filter.category.length === 0) {
      delete this.filter.category;
    }
  }

  isLocationSelected(location: 'Indoor' | 'Outdoor' | 'Both'): boolean {
    return this.filter.location?.includes(location) || false;
  }

  isAgeGroupSelected(
    ageGroup: 'Kids' | 'Teens' | 'Parents' | 'All ages'
  ): boolean {
    return this.filter.ageGroups?.includes(ageGroup) || false;
  }

  isTimeOfDaySelected(time: 'Morning' | 'Afternoon' | 'Evening'): boolean {
    return this.filter.timeOfDay?.includes(time) || false;
  }

  isCategorySelected(
    category: 'Adventure' | 'Educational' | 'Nature' | 'Arts' | 'Sports'
  ): boolean {
    return this.filter.category?.includes(category) || false;
  }
}
