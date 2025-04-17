import { Injectable, signal, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, map, catchError } from 'rxjs';
import { AuthService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export interface GeoPoint {
  longitude: number;
  latitude: number;
}

export interface ActivityMetadata {
  social?: {
    ratings?: {
      averageRating: number;
      ratingCount: number;
    };
    likeCount?: number;
    commentCount?: number;
    userHasLiked?: boolean;
    userRating?: number | null;
  };
}

export interface ActivityFilters {
  price?: 'free' | 'paid' | 'unknown';
  accessibility?: 'full' | 'limited' | 'none' | 'unknown';
  opening_status?: string;
}

export interface Activity {
  id: string;
  name: string;
  geo?: GeoPoint;
  categories: string[];
  subcategories?: string[];
  city: string;
  tags?: string[];
  filters?: ActivityFilters;
  images: string[];
  metadata?: ActivityMetadata;
  lastUpdated?: string;
  dataSource?: string;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface SubcategoryGroup {
  category: string;
  subcategories: CategoryCount[];
}

export interface PriceRanges {
  free: number;
  paid: number;
  unknown: number;
}

export interface Accessibility {
  full: number;
  limited: number;
  none: number;
  unknown: number;
}

export interface ActivityFiltersData {
  categories: CategoryCount[];
  subcategories: SubcategoryGroup[];
  price_ranges: PriceRanges;
  accessibility: Accessibility;
}

export interface ActivityResponse {
  city: string;
  filters: ActivityFiltersData;
  activities: Activity[];
  total: number;
}

export interface ActivityFilter {
  category?: string;
  subcategory?: string;
  price?: 'free' | 'paid' | 'unknown';
  accessibility?: 'full' | 'limited' | 'none' | 'unknown';
  searchTerm?: string;
  city?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private isBrowser: boolean;
  private apiUrl = `${environment.apiUrl}/activities`;

  // Use signals for reactive state
  activities = signal<Activity[]>([]);
  filteredActivities = signal<Activity[]>([]);
  featuredActivities = signal<Activity[]>([]);
  currentFilter = signal<ActivityFilter>({});
  filterData = signal<ActivityFiltersData | null>(null);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Get activities by city with optional filters
  getActivitiesByCity(city: string, filter?: ActivityFilter, limit = 50): Observable<ActivityResponse> {
    let params = new HttpParams().set('city', city).set('limit', limit.toString());
    
    if (filter) {
      if (filter.category) {
        params = params.set('category', filter.category);
        
        // Add subcategory if present and category is selected
        if (filter.subcategory) {
          params = params.set('subcategory', filter.subcategory);
        }
      }
      
      if (filter.price) {
        params = params.set('price', filter.price);
      }
      
      if (filter.accessibility) {
        params = params.set('accessibility', filter.accessibility);
      }
    }
    
    return this.http.get<ActivityResponse>(`${this.apiUrl}`, { params }).pipe(
      map(response => {
        this.activities.set(response.activities);
        this.filteredActivities.set(response.activities);
        this.filterData.set(response.filters);
        return response;
      }),
      catchError(error => {
        console.error('Error fetching activities:', error);
        return throwError(() => new Error('Failed to fetch activities'));
      })
    );
  }

  // Search activities by keyword
  searchActivities(query: string, city?: string, limit = 10): Observable<Activity[]> {
    let params = new HttpParams().set('query', query).set('limit', limit.toString());
    
    if (city) {
      params = params.set('city', city);
    }
    
    return this.http.get<Activity[]>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(error => {
        console.error('Error searching activities:', error);
        return throwError(() => new Error('Failed to search activities'));
      })
    );
  }

  // Get all activity categories
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`).pipe(
      catchError(error => {
        console.error('Error fetching categories:', error);
        return throwError(() => new Error('Failed to fetch categories'));
      })
    );
  }

  // Get subcategories for a specific category
  getSubcategories(category: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories/${encodeURIComponent(category)}/subcategories`).pipe(
      catchError(error => {
        console.error('Error fetching subcategories:', error);
        return throwError(() => new Error('Failed to fetch subcategories'));
      })
    );
  }

  // Get activity by ID
  getActivityById(id: string): Observable<Activity> {
    return this.http.get<Activity>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching activity with ID ${id}:`, error);
        return throwError(() => new Error('Failed to fetch activity details'));
      })
    );
  }

  // Like an activity
  likeActivity(activityId: string): Observable<{id: number; activityId: string; userId: number; createdDate: string}> {
    return this.http.post<{id: number; activityId: string; userId: number; createdDate: string}>(
      `${this.apiUrl}/${activityId}/like`, 
      {}
    ).pipe(
      catchError(error => {
        console.error('Error liking activity:', error);
        return throwError(() => new Error('Failed to like activity'));
      })
    );
  }

  // Unlike an activity
  unlikeActivity(activityId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${activityId}/like`).pipe(
      catchError(error => {
        console.error('Error unliking activity:', error);
        return throwError(() => new Error('Failed to unlike activity'));
      })
    );
  }

  // Check if user has liked an activity
  hasLiked(activityId: string): Observable<boolean> {
    if (!this.authService.isAuthenticated()) {
      return of(false);
    }
    
    return this.http.get<boolean>(`${this.apiUrl}/${activityId}/has-liked`).pipe(
      catchError(error => {
        console.error('Error checking if activity is liked:', error);
        return of(false);
      })
    );
  }

  // Get like count for an activity
  getLikeCount(activityId: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${activityId}/like-count`).pipe(
      catchError(error => {
        console.error('Error fetching like count:', error);
        return of(0);
      })
    );
  }

  // Apply filters to activities
  applyFilters(filter: ActivityFilter): void {
    this.currentFilter.set(filter);

    // If we have city set, call the API with updated filters
    if (filter.city) {
      this.getActivitiesByCity(filter.city, filter).subscribe();
    }
  }

  // Set selected category and optionally subcategory
  setSelectedCategory(category: string, subcategory?: string): void {
    const currentFilter = this.currentFilter();
    const updatedFilter: ActivityFilter = {
      ...currentFilter,
      category,
      subcategory: subcategory || undefined
    };
    
    this.applyFilters(updatedFilter);
  }

  // Set price filter
  setPriceFilter(price: 'free' | 'paid' | null): void {
    const currentFilter = this.currentFilter();
    const updatedFilter: ActivityFilter = {
      ...currentFilter,
      price: price || undefined
    };
    
    this.applyFilters(updatedFilter);
  }

  // Set accessibility filter
  setAccessibilityFilter(accessibility: 'full' | 'limited' | 'none' | null): void {
    const currentFilter = this.currentFilter();
    const updatedFilter: ActivityFilter = {
      ...currentFilter,
      accessibility: accessibility || undefined
    };
    
    this.applyFilters(updatedFilter);
  }

  // Reset filters
  resetFilters(): void {
    this.currentFilter.set({});
    const currentCity = this.currentFilter().city;
    
    if (currentCity) {
      this.getActivitiesByCity(currentCity).subscribe();
    }
  }
}
