import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Activity } from './activity.service';
import { AuthService } from './auth.service';

export interface Favorite {
  id: number;
  activityId: string;
  addedDate: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private apiUrl = `${environment.apiUrl}/favorites`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private favoritesSubject = new BehaviorSubject<Favorite[]>([]);
  favorites$ = this.favoritesSubject.asObservable();
  
  private favoritedActivityIdsSubject = new BehaviorSubject<string[]>([]);
  favoritedActivityIds$ = this.favoritedActivityIdsSubject.asObservable();

  constructor() {
    // Load favorites if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.loadFavorites();
      } else {
        // Clear favorites when user logs out
        this.favoritesSubject.next([]);
        this.favoritedActivityIdsSubject.next([]);
      }
    });
  }

  /**
   * Load all user favorites
   */
  private loadFavorites(): void {
    this.getUserFavorites().subscribe({
      next: (favorites) => {
        this.favoritesSubject.next(favorites);
        const activityIds = favorites.map(favorite => favorite.activityId);
        this.favoritedActivityIdsSubject.next(activityIds);
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
      }
    });
  }

  /**
   * Add an activity to user's favorites
   */
  addToFavorites(activityId: string, notes?: string): Observable<Favorite> {
    return this.http.post<Favorite>(this.apiUrl, { activityId, notes }).pipe(
      tap(favorite => {
        // Update local state
        const currentFavorites = this.favoritesSubject.value;
        this.favoritesSubject.next([favorite, ...currentFavorites]);
        
        const currentIds = this.favoritedActivityIdsSubject.value;
        if (!currentIds.includes(activityId)) {
          this.favoritedActivityIdsSubject.next([activityId, ...currentIds]);
        }
      }),
      catchError(error => {
        console.error('Error adding to favorites:', error);
        return throwError(() => new Error('Failed to add to favorites'));
      })
    );
  }

  /**
   * Get all favorites for the current user
   */
  getUserFavorites(): Observable<Favorite[]> {
    return this.http.get<Favorite[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching user favorites:', error);
        return throwError(() => new Error('Failed to fetch user favorites'));
      })
    );
  }

  /**
   * Get favorite activities with complete details
   */
  getFavoriteActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/activities`).pipe(
      catchError(error => {
        console.error('Error fetching favorite activities:', error);
        return throwError(() => new Error('Failed to fetch favorite activities'));
      })
    );
  }

  /**
   * Check if an activity is in user's favorites
   */
  checkIsFavorite(activityId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${activityId}`).pipe(
      catchError(error => {
        console.error('Error checking favorite status:', error);
        return throwError(() => new Error('Failed to check favorite status'));
      })
    );
  }

  /**
   * Get a boolean indicating if the activity is in favorites (from local state)
   */
  isFavorite(activityId: string): boolean {
    return this.favoritedActivityIdsSubject.value.includes(activityId);
  }

  /**
   * Update notes for a favorited activity
   */
  updateFavoriteNotes(activityId: string, notes: string): Observable<Favorite> {
    return this.http.put<Favorite>(`${this.apiUrl}/${activityId}`, { notes }).pipe(
      tap(updatedFavorite => {
        // Update local state
        const currentFavorites = this.favoritesSubject.value;
        const updatedFavorites = currentFavorites.map(favorite => 
          favorite.activityId === activityId ? updatedFavorite : favorite
        );
        this.favoritesSubject.next(updatedFavorites);
      }),
      catchError(error => {
        console.error('Error updating favorite notes:', error);
        return throwError(() => new Error('Failed to update favorite notes'));
      })
    );
  }

  /**
   * Delete a favorite by its ID
   */
  deleteFavorite(favoriteId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${favoriteId}`).pipe(
      tap(() => {
        // Update local state
        const currentFavorites = this.favoritesSubject.value;
        const favorite = currentFavorites.find(f => f.id === favoriteId);
        
        if (favorite) {
          const updatedFavorites = currentFavorites.filter(f => f.id !== favoriteId);
          this.favoritesSubject.next(updatedFavorites);
          
          const currentIds = this.favoritedActivityIdsSubject.value;
          const updatedIds = currentIds.filter(id => id !== favorite.activityId);
          this.favoritedActivityIdsSubject.next(updatedIds);
        }
      }),
      catchError(error => {
        console.error('Error deleting favorite:', error);
        return throwError(() => new Error('Failed to delete favorite'));
      })
    );
  }

  /**
   * Remove an activity from favorites
   */
  removeFromFavorites(activityId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/activity/${activityId}`).pipe(
      tap(() => {
        // Update local state
        const currentFavorites = this.favoritesSubject.value;
        const updatedFavorites = currentFavorites.filter(f => f.activityId !== activityId);
        this.favoritesSubject.next(updatedFavorites);
        
        const currentIds = this.favoritedActivityIdsSubject.value;
        const updatedIds = currentIds.filter(id => id !== activityId);
        this.favoritedActivityIdsSubject.next(updatedIds);
      }),
      catchError(error => {
        console.error('Error removing from favorites:', error);
        return throwError(() => new Error('Failed to remove from favorites'));
      })
    );
  }

  /**
   * Toggle favorite status for an activity
   */
  toggleFavorite(activityId: string): Observable<Favorite | {message: string}> {
    if (this.isFavorite(activityId)) {
      return this.removeFromFavorites(activityId);
    } else {
      return this.addToFavorites(activityId);
    }
  }
} 