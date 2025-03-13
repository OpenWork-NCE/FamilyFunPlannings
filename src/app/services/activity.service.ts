import { Injectable, signal, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';

export interface Activity {
  id: number;
  title: string;
  description: string;
  images: string[];
  rating: number;
  details: string;
  duration: string;
  location: string;
  additionalInfo?: string;
  createdAt: string;
  createdBy: string;
  ageGroups: ('Kids' | 'Teens' | 'Parents' | 'All ages')[];
  timeOfDay: ('Morning' | 'Afternoon' | 'Evening')[];
  budget: number;
  category: ('Adventure' | 'Educational' | 'Nature' | 'Arts' | 'Sports')[];
}

export interface ActivityFilter {
  location?: ('Indoor' | 'Outdoor' | 'Both')[];
  ageGroups?: ('Kids' | 'Teens' | 'Parents' | 'All ages')[];
  timeOfDay?: ('Morning' | 'Afternoon' | 'Evening')[];
  budgetRange?: { min: number; max: number };
  category?: ('Adventure' | 'Educational' | 'Nature' | 'Arts' | 'Sports')[];
  searchTerm?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly GUEST_FAVORITES_KEY = 'guest_favorites';
  private favoriteActivities: number[] = [];
  private favoritesSubject = new BehaviorSubject<number[]>([]);
  private isBrowser: boolean;

  // Use signals for reactive state
  activities = signal<Activity[]>([]);
  filteredActivities = signal<Activity[]>([]);
  featuredActivities = signal<Activity[]>([]);
  currentFilter = signal<ActivityFilter>({});

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Load favorites from localStorage
    this.loadFavorites();

    // Subscribe to auth state changes
    this.authService.isGuest$.subscribe((isGuest) => {
      if (isGuest) {
        this.loadGuestFavorites();
      } else {
        this.clearGuestFavorites();
      }
    });
  }

  // Fake data for activities
  private mockActivities: Activity[] = [
    {
      id: 1,
      title: 'Beach Picnic',
      description:
        'Enjoy a relaxing day at the beach with a picnic. Perfect for families and friends.',
      images: [
        '/assets/images/activities/beach-picnic.jpg',
        '/assets/images/activities/beach-picnic.jpg',
        '/assets/images/activities/beach-picnic.jpg',
      ],
      rating: 4.8,
      details: 'Outdoor activity • Family-friendly • 2-4 hours',
      duration: '2-4 hours',
      location: 'Outdoor',
      additionalInfo:
        'Bring sunscreen, beach towels, and your favorite picnic food.',
      createdAt: '2023-06-15',
      createdBy: 'admin@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents', 'All ages'],
      timeOfDay: ['Morning', 'Afternoon'],
      budget: 20,
      category: ['Nature'],
    },
    {
      id: 2,
      title: 'Bike Riding Adventure',
      description:
        'Explore scenic trails and paths on a family bike ride. Great exercise and fun for everyone.',
      images: [
        '/assets/images/activities/bike-riding.jpg',
        '/assets/images/activities/bike-riding.jpg',
        '/assets/images/activities/bike-riding.jpg',
      ],
      rating: 4.6,
      details: 'Outdoor activity • Active • 1-3 hours',
      duration: '1-3 hours',
      location: 'Outdoor',
      additionalInfo:
        'Ensure everyone has properly fitted helmets and bring water bottles.',
      createdAt: '2023-07-10',
      createdBy: 'admin@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents'],
      timeOfDay: ['Morning', 'Afternoon'],
      budget: 0,
      category: ['Adventure', 'Sports'],
    },
    {
      id: 3,
      title: 'Board Game Night',
      description:
        'Gather around for a fun evening of board games. Perfect for bonding and creating memories.',
      images: [
        '/assets/images/activities/board-game.jpg',
        '/assets/images/activities/board-game.jpg',
        '/assets/images/activities/board-game.jpg',
      ],
      rating: 4.7,
      details: 'Indoor activity • Cozy • 2-4 hours',
      duration: '2-4 hours',
      location: 'Indoor',
      additionalInfo:
        'Have a variety of games for different ages and preferences.',
      createdAt: '2023-08-05',
      createdBy: 'user@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents', 'All ages'],
      timeOfDay: ['Evening'],
      budget: 15,
      category: ['Educational'],
    },
    {
      id: 4,
      title: 'Cooking Class',
      description:
        'Learn to cook delicious meals together. A fun and educational activity for all ages.',
      images: [
        '/assets/images/activities/cooking-class.jpg',
        '/assets/images/activities/cooking-class.jpg',
        '/assets/images/activities/cooking-class.jpg',
      ],
      rating: 4.9,
      details: 'Indoor activity • Educational • 1-2 hours',
      duration: '1-2 hours',
      location: 'Indoor',
      additionalInfo:
        'Prepare ingredients in advance and consider dietary restrictions.',
      createdAt: '2023-09-20',
      createdBy: 'admin@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents'],
      timeOfDay: ['Morning', 'Afternoon', 'Evening'],
      budget: 30,
      category: ['Educational', 'Arts'],
    },
    {
      id: 5,
      title: 'Museum Tour',
      description:
        'Explore fascinating exhibits at a local museum. Educational and entertaining for the whole family.',
      images: [
        '/assets/images/activities/museum-tour.jpg',
        '/assets/images/activities/museum-tour.jpg',
        '/assets/images/activities/museum-tour.jpg',
      ],
      rating: 4.5,
      details: 'Indoor activity • Educational • 2-3 hours',
      duration: '2-3 hours',
      location: 'Indoor',
      additionalInfo:
        'Check for special exhibits and guided tours for families.',
      createdAt: '2023-10-15',
      createdBy: 'user@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents', 'All ages'],
      timeOfDay: ['Morning', 'Afternoon'],
      budget: 25,
      category: ['Educational'],
    },
    {
      id: 6,
      title: 'Nature Hike',
      description:
        'Discover the beauty of nature on a family-friendly hiking trail. Great for exercise and exploration.',
      images: [
        '/assets/images/activities/nature-hike.jpg',
        '/assets/images/activities/nature-hike.jpg',
        '/assets/images/activities/nature-hike.jpg',
      ],
      rating: 4.7,
      details: 'Outdoor activity • Active • 2-4 hours',
      duration: '2-4 hours',
      location: 'Outdoor',
      additionalInfo:
        'Wear appropriate footwear and bring water, snacks, and a first aid kit.',
      createdAt: '2023-11-05',
      createdBy: 'admin@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents'],
      timeOfDay: ['Morning', 'Afternoon'],
      budget: 0,
      category: ['Adventure', 'Nature'],
    },
    {
      id: 7,
      title: 'Zoo Visit',
      description:
        'Spend a day observing and learning about various animals at the zoo. Educational and fun for all ages.',
      images: [
        '/assets/images/activities/zoo-visit.jpg',
        '/assets/images/activities/zoo-visit.jpg',
        '/assets/images/activities/zoo-visit.jpg',
      ],
      rating: 4.8,
      details: 'Outdoor activity • Educational • 3-5 hours',
      duration: '3-5 hours',
      location: 'Outdoor',
      additionalInfo:
        'Check feeding times and special presentations. Bring a camera!',
      createdAt: '2023-12-10',
      createdBy: 'user@example.com',
      ageGroups: ['Kids', 'Teens', 'Parents', 'All ages'],
      timeOfDay: ['Morning', 'Afternoon'],
      budget: 40,
      category: ['Educational', 'Nature'],
    },
  ];

  // Get all activities
  getActivities(): Observable<Activity[]> {
    return of(this.mockActivities).pipe(delay(500)); // Simulate API delay
  }

  // Get activity by ID
  getActivityById(id: number): Observable<Activity | undefined> {
    const activity = this.mockActivities.find((a) => a.id === id);
    return of(activity).pipe(delay(300)); // Simulate API delay
  }

  // Get activity by ID synchronously (for internal service use)
  getActivityByIdSync(id: number): Activity | undefined {
    return this.mockActivities.find((a) => a.id === id);
  }

  // Toggle favorite status
  toggleFavorite(activityId: number): void {
    const index = this.favoriteActivities.indexOf(activityId);

    if (index === -1) {
      // Add to favorites
      this.favoriteActivities.push(activityId);
    } else {
      // Remove from favorites
      this.favoriteActivities.splice(index, 1);
    }

    // Update subject and localStorage
    this.favoritesSubject.next([...this.favoriteActivities]);
    this.saveFavorites();
  }

  // Check if activity is favorited
  isFavorite(activityId: number): boolean {
    return this.favoriteActivities.includes(activityId);
  }

  // Get favorites as observable
  getFavorites(): Observable<number[]> {
    return this.favoritesSubject.asObservable();
  }

  // Get favorites synchronously
  getFavoritesSync(): number[] {
    return [...this.favoriteActivities];
  }

  /**
   * Safely get item from localStorage (only in browser)
   */
  private getLocalStorage(key: string): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  }

  /**
   * Safely set item in localStorage (only in browser)
   */
  private setLocalStorage(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Safely remove item from localStorage (only in browser)
   */
  private removeLocalStorage(key: string): void {
    if (this.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Save favorites to localStorage
   */
  private saveFavorites(): void {
    if (this.authService.isGuest()) {
      this.saveGuestFavorites(this.favoriteActivities);
    } else {
      // For authenticated users, save to localStorage
      this.setLocalStorage(
        'favoriteActivities',
        JSON.stringify(this.favoriteActivities)
      );
    }
  }

  /**
   * Load favorites from localStorage
   */
  private loadFavorites(): void {
    if (this.authService.isGuest()) {
      this.favoriteActivities = this.loadGuestFavorites();
    } else {
      const storedFavorites = this.getLocalStorage('favoriteActivities');
      if (storedFavorites) {
        try {
          this.favoriteActivities = JSON.parse(storedFavorites);
        } catch (e) {
          console.error('Error parsing favorites:', e);
          this.favoriteActivities = [];
        }
      }
    }
    this.favoritesSubject.next([...this.favoriteActivities]);
  }

  /**
   * Load guest favorites from localStorage
   */
  private loadGuestFavorites(): number[] {
    const favoritesStr = this.getLocalStorage(this.GUEST_FAVORITES_KEY);
    if (favoritesStr) {
      try {
        return JSON.parse(favoritesStr);
      } catch (e) {
        console.error('Error parsing guest favorites:', e);
        return [];
      }
    }
    return [];
  }

  /**
   * Save favorites to localStorage for guest users
   */
  private saveGuestFavorites(favorites: number[]): void {
    this.setLocalStorage(this.GUEST_FAVORITES_KEY, JSON.stringify(favorites));
  }

  /**
   * Clear guest favorites
   */
  clearGuestFavorites(): void {
    this.removeLocalStorage(this.GUEST_FAVORITES_KEY);
  }

  // Get featured activities (random selection)
  getRandomActivities(count: number): Activity[] {
    const shuffled = [...this.mockActivities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Apply filters to activities
  applyFilters(filter: ActivityFilter): void {
    this.currentFilter.set(filter);

    let filtered = [...this.activities()];

    // Apply location filter
    if (filter.location && filter.location.length > 0) {
      filtered = filtered.filter((activity) =>
        filter.location!.some(
          (loc) =>
            loc === activity.location ||
            (loc === 'Both' &&
              (activity.location === 'Indoor' ||
                activity.location === 'Outdoor'))
        )
      );
    }

    // Apply age group filter
    if (filter.ageGroups && filter.ageGroups.length > 0) {
      filtered = filtered.filter(
        (activity) =>
          activity.ageGroups.some((age) => filter.ageGroups!.includes(age)) ||
          activity.ageGroups.includes('All ages')
      );
    }

    // Apply time of day filter
    if (filter.timeOfDay && filter.timeOfDay.length > 0) {
      filtered = filtered.filter((activity) =>
        activity.timeOfDay.some((time) => filter.timeOfDay!.includes(time))
      );
    }

    // Apply budget range filter
    if (filter.budgetRange) {
      filtered = filtered.filter(
        (activity) =>
          activity.budget >= filter.budgetRange!.min &&
          activity.budget <= filter.budgetRange!.max
      );
    }

    // Apply category filter
    if (filter.category && filter.category.length > 0) {
      filtered = filtered.filter((activity) =>
        activity.category.some((cat) => filter.category!.includes(cat))
      );
    }

    // Apply search term filter
    if (filter.searchTerm && filter.searchTerm.trim() !== '') {
      const term = filter.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (activity) =>
          activity.title.toLowerCase().includes(term) ||
          activity.description.toLowerCase().includes(term) ||
          activity.details.toLowerCase().includes(term)
      );
    }

    this.filteredActivities.set(filtered);
  }

  // Reset all filters
  resetFilters(): void {
    this.currentFilter.set({});
    this.filteredActivities.set([...this.activities()]);
  }
}
