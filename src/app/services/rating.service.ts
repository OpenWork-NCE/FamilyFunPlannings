import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Rating {
  id: number;
  activityId: string;
  rating: number;
  review?: string;
  userId: number;
  createdDate: string;
  updatedDate: string;
}

export interface RatingStats {
  averageRating: number;
  ratingCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class RatingService {
  private apiUrl = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  // Get ratings for a specific activity
  getRatingsByActivityId(activityId: string): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.apiUrl}/${activityId}/ratings`).pipe(
      catchError(error => {
        console.error('Error fetching ratings:', error);
        return throwError(() => new Error('Failed to fetch ratings'));
      })
    );
  }

  // Get rating statistics for an activity
  getRatingStats(activityId: string): Observable<RatingStats> {
    return this.http.get<RatingStats>(`${this.apiUrl}/${activityId}/rating-stats`).pipe(
      catchError(error => {
        console.error('Error fetching rating stats:', error);
        return throwError(() => new Error('Failed to fetch rating statistics'));
      })
    );
  }

  // Rate an activity
  rateActivity(activityId: string, rating: number, review?: string): Observable<Rating> {
    return this.http.post<Rating>(`${this.apiUrl}/${activityId}/rate`, { rating, review }).pipe(
      catchError(error => {
        console.error('Error rating activity:', error);
        return throwError(() => new Error('Failed to rate activity'));
      })
    );
  }

  // Check if user has rated an activity
  hasRatedActivity(activityId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${activityId}/has-rated`).pipe(
      catchError(error => {
        console.error('Error checking if activity is rated:', error);
        return throwError(() => new Error('Failed to check if activity is rated'));
      })
    );
  }
} 