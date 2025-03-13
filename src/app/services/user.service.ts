import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, take } from 'rxjs/operators';
import { AuthService, User } from './auth.service';

export interface UserProfile extends User {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    activityAlerts: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly USER_PROFILE_KEY = 'user-profile';

  // Mock user profiles for testing
  private mockProfiles: UserProfile[] = [
    {
      id: '1',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'USER',
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Family fun enthusiast and outdoor adventurer',
      avatar: 'https://i.pravatar.cc/150?u=user@example.com',
      preferences: {
        notifications: true,
        emailUpdates: false,
        activityAlerts: true,
      },
    },
    {
      id: '2',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      bio: 'System administrator and activity curator',
      avatar: 'https://i.pravatar.cc/150?u=admin@example.com',
      preferences: {
        notifications: true,
        emailUpdates: true,
        activityAlerts: true,
      },
    },
  ];

  constructor(private authService: AuthService) {
    // Initialize user profile in localStorage if not exists
    this.initializeUserProfile();
  }

  /**
   * Initialize user profile in localStorage if not exists
   */
  private initializeUserProfile(): void {
    if (!localStorage.getItem(this.USER_PROFILE_KEY)) {
      this.authService.currentUser$.pipe(take(1)).subscribe((currentUser) => {
        if (currentUser) {
          // Find matching mock profile or create a basic one
          const mockProfile = this.mockProfiles.find(
            (p) => p.email === currentUser.email
          );
          const profile = mockProfile || {
            ...currentUser,
            preferences: {
              notifications: true,
              emailUpdates: false,
              activityAlerts: true,
            },
          };

          localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(profile));
        }
      });
    }
  }

  /**
   * Get the current user's profile
   */
  getUserProfile(): Observable<UserProfile | null> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return of(null);
    }

    // Get profile from localStorage
    const profileJson = localStorage.getItem(this.USER_PROFILE_KEY);
    if (profileJson) {
      return of(JSON.parse(profileJson)).pipe(delay(300)); // Simulate API delay
    }

    // If no profile in localStorage but user is authenticated, create a basic profile
    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (currentUser) {
          const mockProfile = this.mockProfiles.find(
            (p) => p.email === currentUser.email
          );
          const profile = mockProfile || {
            ...currentUser,
            preferences: {
              notifications: true,
              emailUpdates: false,
              activityAlerts: true,
            },
          };

          localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(profile));
          return profile;
        }
        return null;
      }),
      delay(300) // Simulate API delay
    );
  }

  /**
   * Update user profile
   */
  updateUserProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Get current profile
    const profileJson = localStorage.getItem(this.USER_PROFILE_KEY);
    if (!profileJson) {
      return throwError(() => new Error('Profile not found'));
    }

    // Update profile
    const currentProfile: UserProfile = JSON.parse(profileJson);
    const updatedProfile: UserProfile = { ...currentProfile, ...profile };

    // Don't allow changing email or role through this method
    updatedProfile.email = currentProfile.email;
    updatedProfile.role = currentProfile.role;

    // Save updated profile
    localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(updatedProfile));

    // Simulate API delay
    return of(updatedProfile).pipe(delay(500));
  }

  /**
   * Update user password
   */
  updatePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<boolean> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    // In a real app, we would verify the current password with the backend
    // For this mock implementation, we'll just simulate success/failure

    // Simulate password verification (in a real app, this would be done on the server)
    if (currentPassword !== 'password123') {
      // Using the mock password from requirements
      return throwError(() => new Error('Current password is incorrect'));
    }

    // Simulate successful password update
    return of(true).pipe(delay(500));
  }

  /**
   * Get user by ID or email (for searching users to add to groups)
   */
  searchUsers(query: string): Observable<UserProfile[]> {
    // Simulate API search
    return of(this.mockProfiles).pipe(
      map((profiles) =>
        profiles.filter(
          (profile) =>
            profile.email.toLowerCase().includes(query.toLowerCase()) ||
            profile.name?.toLowerCase().includes(query.toLowerCase()) ||
            profile.firstName?.toLowerCase().includes(query.toLowerCase()) ||
            profile.lastName?.toLowerCase().includes(query.toLowerCase())
        )
      ),
      delay(300) // Simulate API delay
    );
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Observable<UserProfile | null> {
    // Simulate API search
    return of(
      this.mockProfiles.find((profile) => profile.email === email) || null
    ).pipe(delay(300)); // Simulate API delay
  }
}
