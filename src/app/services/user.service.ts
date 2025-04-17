import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Interface for User data from the API
 */
export interface User {
  id: number;
  email: string;
  roles: string[];
  enabled: boolean;
  accountNonLocked: boolean;
  failedLoginAttempts?: number;
  createdAt?: string;
  lastLoginAt?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  bio?: string;
  notificationsEnabled?: boolean;
}

/**
 * Interface for updating user profile
 */
export interface UserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  bio?: string;
  notificationsEnabled?: boolean;
  accountNonLocked?: boolean;
  enabled?: boolean;
}

/**
 * Interface for API responses with a message
 */
export interface MessageResponse {
  message: string;
}

/**
 * Interface for password update request
 */
export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private currentUserProfileSubject = new BehaviorSubject<User | null>(null);
  currentUserProfile$ = this.currentUserProfileSubject.asObservable();
  
  constructor() {
    // Load user profile if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.loadUserProfile();
      } else {
        // Clear profile when user logs out
        this.currentUserProfileSubject.next(null);
      }
    });
  }

  /**
   * Load current user profile
   */
  private loadUserProfile(): void {
    this.getUserProfile().subscribe({
      next: (profile) => {
        this.currentUserProfileSubject.next(profile);
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
      }
    });
  }

  /**
   * Get current user profile
   */
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return throwError(() => new Error('Failed to fetch user profile'));
      })
    );
  }

  /**
   * Update current user profile
   */
  updateUserProfile(profileData: UserUpdateRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.apiUrl}/me`, profileData).pipe(
      tap(() => {
        // Reload the user profile after update
        this.loadUserProfile();
      }),
      catchError(error => {
        console.error('Error updating user profile:', error);
        return throwError(() => new Error('Failed to update user profile'));
      })
    );
  }

  /**
   * Delete current user account
   */
  deleteAccount(): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/me`).pipe(
      tap(() => {
        // Log out the user after account deletion
        this.authService.logout();
      }),
      catchError(error => {
        console.error('Error deleting account:', error);
        return throwError(() => new Error('Failed to delete account'));
      })
    );
  }

  /**
   * Update user password
   */
  updatePassword(passwordData: PasswordUpdateRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.apiUrl}/me/password`, passwordData).pipe(
      catchError(error => {
        console.error('Error updating password:', error);
        return throwError(() => new Error('Failed to update password'));
      })
    );
  }

  /**
   * Get user by ID (admin only)
   */
  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      catchError(error => {
        console.error(`Error fetching user with ID ${userId}:`, error);
        return throwError(() => new Error(`Failed to fetch user with ID ${userId}`));
      })
    );
  }

  /**
   * Get all users
   */
  getAllUsers(): Observable<User[]> {
    console.log('Fetching all users');
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching all users:', error);
        return throwError(() => new Error('Failed to fetch all users'));
      })
    );
  }

  /**
   * Update user (admin only)
   */
  updateUser(userId: number, userData: UserUpdateRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.apiUrl}/${userId}`, userData).pipe(
      catchError(error => {
        console.error(`Error updating user with ID ${userId}:`, error);
        return throwError(() => new Error(`Failed to update user with ID ${userId}`));
      })
    );
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(userId: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${userId}`).pipe(
      catchError(error => {
        console.error(`Error deleting user with ID ${userId}:`, error);
        return throwError(() => new Error(`Failed to delete user with ID ${userId}`));
      })
    );
  }

  /**
   * Lock or unlock a user account (admin only)
   */
  updateAccountLockStatus(userId: number, shouldBeUnlocked: boolean): Observable<MessageResponse> {
    return this.updateUser(userId, { accountNonLocked: shouldBeUnlocked });
  }

  /**
   * Enable or disable a user account (admin only)
   */
  updateAccountEnabledStatus(userId: number, shouldBeEnabled: boolean): Observable<MessageResponse> {
    return this.updateUser(userId, { enabled: shouldBeEnabled });
  }

  /**
   * Check if the current user has admin role
   */
  isAdmin(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        return user.roles.includes('ROLE_ADMIN');
      })
    );
  }

  /**
   * Search for users by name or email (for admin or user discovery features)
   */
  searchUsers(query: string): Observable<User[]> {
    // Since there's no specific search endpoint in the API requirements,
    // we'll get all users and filter them on the client side
    return this.getAllUsers().pipe(
      map(users => {
        if (!query) return users;
        
        const lowerQuery = query.toLowerCase();
        return users.filter(user => 
          user.email.toLowerCase().includes(lowerQuery) ||
          (user.firstName && user.firstName.toLowerCase().includes(lowerQuery)) ||
          (user.lastName && user.lastName.toLowerCase().includes(lowerQuery))
        );
      }),
      catchError(error => {
        console.error('Error searching users:', error);
        return throwError(() => new Error('Failed to search users'));
      })
    );
  }
}
