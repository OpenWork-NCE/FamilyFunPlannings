import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

/**
 * Interface for login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for authentication response from the API
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  type: string;
  id: number;
  email: string;
  roles: string[];
}

/**
 * Interface for login data
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * Interface for registration data
 */
export interface RegistrationData {
  email: string;
  password: string;
  role?: string[];
}

/**
 * Interface for user data
 */
export interface User {
  id: number;
  email: string;
  roles: string[];
}

/**
 * Interface for registration response from the API
 */
export interface MessageResponse {
  message: string;
}

/**
 * Interface for password reset request
 */
export interface PasswordResetRequest {
  email: string;
  token: string;
  newPassword: string;
}

/**
 * Interface for password update
 */
export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Service for handling authentication operations
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // API endpoint for authentication
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';
  private readonly GUEST_KEY = 'is_guest';
  private isBrowser: boolean;

  // BehaviorSubject to track and share the authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  // Observable to allow components to subscribe to authentication state changes
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  // BehaviorSubject to track guest mode
  private isGuestSubject = new BehaviorSubject<boolean>(false);
  isGuest$ = this.isGuestSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    console.log('[AuthService] Initializing, browser environment:', this.isBrowser);

    // Initialize state if in browser
    if (this.isBrowser) {
      const hasToken = this.hasValidToken();
      this.isAuthenticatedSubject.next(hasToken);
      console.log('[AuthService] Initial auth state:', hasToken);
      
      const user = this.getUserFromStorage();
      this.currentUserSubject.next(user);
      if (user) console.log('[AuthService] User loaded from storage:', user.email);
      
      const isGuest = this.getLocalStorage(this.GUEST_KEY) === 'true';
      this.isGuestSubject.next(isGuest);
      console.log('[AuthService] Guest mode:', isGuest);
    }
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
   * Login user with email and password
   * @param credentials User login credentials
   * @returns Observable with auth response
   */
  login(credentials: LoginData): Observable<AuthResponse> {
    console.log('[AuthService] Attempting login for:', credentials.email);
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        console.log('[AuthService] Login successful');
        this.handleAuthSuccess(response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[AuthService] Login error:', error);
        return throwError(() => this.getErrorMessage(error, 'login'));
      })
    );
  }

  /**
   * Register a new user
   * @param data Registration data
   * @returns Observable with message response
   */
  register(data: RegistrationData): Observable<MessageResponse> {
    // Default role to "user" if not provided
    const userData = {
      ...data,
      role: data.role || ['user']
    };
    
    return this.http.post<MessageResponse>(`${this.API_URL}/register`, userData).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Registration error:', error);
        return throwError(() => this.getErrorMessage(error, 'register'));
      })
    );
  }

  /**
   * Request email verification
   * @param token Verification token from email
   * @returns Observable with message response
   */
  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${this.API_URL}/verify?token=${token}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.getErrorMessage(error, 'verify'));
      })
    );
  }

  /**
   * Request password reset
   * @param email User email
   * @returns Observable with message response
   */
  requestPasswordReset(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.API_URL}/reset-password?email=${email}`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.getErrorMessage(error, 'resetRequest'));
      })
    );
  }

  /**
   * Confirm password reset with token
   * @param resetData Password reset data
   * @returns Observable with message response
   */
  confirmPasswordReset(resetData: PasswordResetRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.API_URL}/reset-password/confirm`, resetData).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.getErrorMessage(error, 'resetConfirm'));
      })
    );
  }

  /**
   * Update password for authenticated user
   * @param passwordData Current and new password
   * @returns Observable with message response
   */
  updatePassword(passwordData: PasswordUpdateRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.API_URL}/password`, passwordData).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.getErrorMessage(error, 'updatePassword'));
      })
    );
  }

  /**
   * Get user profile
   * @returns Observable with user data
   */
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/profile`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.getErrorMessage(error, 'profile'));
      })
    );
  }

  /**
   * Set guest mode
   */
  setGuestMode(): void {
    this.setLocalStorage(this.GUEST_KEY, 'true');
    this.isGuestSubject.next(true);
    this.router.navigate(['/home']);
  }

  /**
   * Check if user is in guest mode
   */
  isGuest(): boolean {
    return this.isGuestSubject.getValue();
  }

  /**
   * Logout the current user
   */
  logout(): void {
    console.log('[AuthService] Logging out user');
    // Remove tokens and user data from localStorage
    this.removeLocalStorage(this.ACCESS_TOKEN_KEY);
    this.removeLocalStorage(this.REFRESH_TOKEN_KEY);
    this.removeLocalStorage(this.USER_KEY);
    this.removeLocalStorage(this.GUEST_KEY);

    // Update authentication state
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.isGuestSubject.next(false);
    console.log('[AuthService] Auth state reset, navigating to login');

    // Navigate to login page
    this.router.navigate(['/login']);
  }

  /**
   * Get the stored access token
   * @returns The JWT token or null if not found
   */
  getAccessToken(): string | null {
    return this.getLocalStorage(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get the stored refresh token
   * @returns The refresh token or null if not found
   */
  getRefreshToken(): string | null {
    return this.getLocalStorage(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Check if the user is authenticated
   * @returns Boolean indicating if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.getValue();
  }

  /**
   * Check if the user is fully authenticated (not in guest mode)
   * @returns Boolean indicating if user is fully authenticated
   */
  isFullyAuthenticated(): boolean {
    return this.isAuthenticated() && !this.isGuest();
  }

  /**
   * Get the current user role
   * @returns User role string or null if not available
   */
  getUserRoles(): string[] | null {
    const user = this.currentUserSubject.getValue();
    return user ? user.roles : null;
  }

  /**
   * Handle successful authentication response
   * @param response The authentication response from the server
   */
  private handleAuthSuccess(response: AuthResponse): void {
    if (response && response.accessToken) {
      // Store tokens
      this.setLocalStorage(this.ACCESS_TOKEN_KEY, response.accessToken);
      if (response.refreshToken) {
        this.setLocalStorage(this.REFRESH_TOKEN_KEY, response.refreshToken);
      }

      // Create user object
      const user: User = {
        id: response.id,
        email: response.email,
        roles: response.roles
      };

      // Store user data
      this.setLocalStorage(this.USER_KEY, JSON.stringify(user));
      
      // Update authentication state
      this.isAuthenticatedSubject.next(true);
      this.currentUserSubject.next(user);
      this.isGuestSubject.next(false);
      this.removeLocalStorage(this.GUEST_KEY);
    }
  }

  /**
   * Check if there is a valid token
   * @returns Boolean indicating if there is a valid token
   */
  private hasValidToken(): boolean {
    const token = this.getLocalStorage(this.ACCESS_TOKEN_KEY);
    return !!token; // Simple check for token existence
  }

  /**
   * Get user data from storage
   * @returns User object or null if not available
   */
  private getUserFromStorage(): User | null {
    const userData = this.getLocalStorage(this.USER_KEY);
    if (!userData) {
      return null;
    }
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Get the current user's email
   * @returns User email or null if not available
   */
  getCurrentUserEmail(): string | null {
    const user = this.currentUserSubject.getValue();
    return user ? user.email : null;
  }

  /**
   * Generate user-friendly error message from HTTP error
   * @param error The HTTP error response
   * @param operation The operation that failed
   * @returns A user-friendly error message
   */
  private getErrorMessage(error: HttpErrorResponse, operation: string): Error {
    // Default error messages
    const defaultMessages: Record<string, string> = {
      login: 'Unable to log in. Please check your credentials and try again.',
      register: 'Registration failed. Please check your information and try again.',
      verify: 'Email verification failed. The link may be expired or invalid.',
      resetRequest: 'Unable to request password reset. Please check your email and try again.',
      resetConfirm: 'Password reset failed. The link may be expired or invalid.',
      updatePassword: 'Unable to update password. Please ensure your current password is correct.',
      profile: 'Unable to load user profile. Please try again later.'
    };

    // Specific error message based on status code
    switch (error.status) {
      case 400:
        if (error.error?.message) {
          return new Error(error.error.message);
        }
        return new Error('Invalid request. Please check your information and try again.');
      
      case 401:
        if (operation === 'login') {
          return new Error('Email ou mot de passe invalide');
        }
        return new Error('Authentication required. Please log in again.');
      
      case 403:
        // Special case for login (non-verified account)
        if (operation === 'login' && error.error?.message?.includes('non vérifié')) {
          return new Error('Compte non vérifié. Veuillez consulter votre email.');
        }
        // Special case for login (locked account)
        if (operation === 'login' && error.error?.message?.includes('verrouillé')) {
          return new Error('Compte verrouillé. Veuillez contacter le support.');
        }
        return new Error('You do not have permission to perform this action.');
      
      case 404:
        if (operation === 'login' || operation === 'resetRequest') {
          return new Error('Email non trouvé. Vérifiez votre saisie ou inscrivez-vous.');
        }
        return new Error('The requested resource was not found.');
      
      case 409:
        return new Error('Cet email est déjà associé à un compte existant.');
      
      case 429:
        return new Error('Trop de tentatives. Veuillez réessayer plus tard.');
      
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error('Problème de serveur. Veuillez réessayer ultérieurement.');
      
      default:
        // If the server returned an error message, use it (if it's not too technical)
        if (error.error?.message && typeof error.error.message === 'string' && error.error.message.length < 100) {
          return new Error(error.error.message);
        }
        
        // Otherwise use default message
        return new Error(defaultMessages[operation] || 'An unexpected error occurred. Please try again.');
    }
  }
}
