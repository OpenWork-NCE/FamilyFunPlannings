import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { Activity } from '../../services/activity.service';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [CommonModule, ActivityCardComponent],
  templateUrl: './activity-list.component.html',
})
export class ActivityListComponent {
  @Input() activities: Activity[] = [];
  @Input() loading: boolean = false;
  @Output() favoriteToggle = new EventEmitter<number>();

  // Track by function for ngFor
  trackByActivityId(index: number, activity: Activity): number {
    return activity.id;
  }

  onFavoriteToggle(activityId: number): void {
    this.favoriteToggle.emit(activityId);
  }
}
