import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity, ActivityService } from '../../services/activity.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-activity-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './activity-card.component.html',
})
export class ActivityCardComponent {
  @Input() activity!: Activity;
  @Input() featured: boolean = false;
  @Output() favoriteToggle = new EventEmitter<number>();

  constructor(private activityService: ActivityService) {}

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggle.emit(this.activity.id);
  }

  isFavorite(): boolean {
    return this.activityService.isFavorite(this.activity.id);
  }
}
