import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { Activity, ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() activities: Activity[] = [];
  @Input() autoRotate: boolean = true;
  @Input() autoRotateInterval: number = 5000; // 5 seconds
  @Output() favoriteToggle = new EventEmitter<number>();

  currentIndex: number = 0;
  private autoRotateSubscription?: Subscription;

  constructor(private activityService: ActivityService) {}

  get images(): string[] {
    return this.activities.map((activity) => activity.images[0]);
  }

  ngOnInit(): void {
    if (this.autoRotate && this.activities.length > 1) {
      this.startAutoRotate();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRotate();
  }

  startAutoRotate(): void {
    this.autoRotateSubscription = interval(this.autoRotateInterval).subscribe(
      () => {
        this.next();
      }
    );
  }

  stopAutoRotate(): void {
    if (this.autoRotateSubscription) {
      this.autoRotateSubscription.unsubscribe();
      this.autoRotateSubscription = undefined;
    }
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.activities.length;
  }

  prev(): void {
    this.currentIndex =
      (this.currentIndex - 1 + this.activities.length) % this.activities.length;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  pauseAutoRotate(): void {
    this.stopAutoRotate();
  }

  resumeAutoRotate(): void {
    if (this.autoRotate && this.activities.length > 1) {
      this.startAutoRotate();
    }
  }

  onFavoriteToggle(activityId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggle.emit(activityId);
  }

  isFavorite(activityId: number): boolean {
    return this.activityService.isFavorite(activityId);
  }
}
