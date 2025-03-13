import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, delay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

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
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

/**
 * Interface for login data
 */
export interface LoginData {
  email: string;
  motDePasse: string;
}

/**
 * Interface for registration data
 */
export interface RegistrationData {
  email: string;
  motDePasse: string;
  role: string;
}

/**
 * Interface for user data
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
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
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly GUEST_KEY = 'is_guest';

  // Mock users for fake authentication
  private mockUsers: User[] = [
    {
      id: '1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'USER',
    },
    {
      id: '2',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  ];

  // BehaviorSubject to track and share the authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(
    this.hasValidToken()
  );

  // Observable to allow components to subscribe to authentication state changes
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<any>(
    this.getUserFromStorage()
  );
  currentUser$ = this.currentUserSubject.asObservable();

  // BehaviorSubject to track guest mode
  private isGuestSubject = new BehaviorSubject<boolean>(
    localStorage.getItem(this.GUEST_KEY) === 'true'
  );
  isGuest$ = this.isGuestSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Login user with email and password
   * @param credentials User login credentials
   * @returns Observable with auth response
   */
  login(credentials: LoginData): Observable<AuthResponse> {
    // For real API implementation:
    // return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)...

    // Simulate API call with fake data
    return this.simulateLogin(credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(
          () =>
            new Error(
              error.message ||
                'Login failed. Please check your credentials and try again.'
            )
        );
      })
    );
  }

  /**
   * Register a new user
   * @param data Registration data
   * @returns Observable with auth response
   */
  register(data: RegistrationData): Observable<AuthResponse> {
    // For real API implementation:
    // return this.http.post<AuthResponse>(`${this.API_URL}/register`, data)...

    // Simulate API call with fake data
    return this.simulateRegister(data).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Set guest mode
   */
  setGuestMode(): void {
    localStorage.setItem(this.GUEST_KEY, 'true');
    this.isGuestSubject.next(true);
    this.router.navigate(['/home']);
  }

  /**
   * Check if user is in guest mode
   */
  isGuest(): boolean {
    return localStorage.getItem(this.GUEST_KEY) === 'true';
  }

  /**
   * Logout the current user
   */
  logout(): void {
    // Remove token and user data from localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.GUEST_KEY);

    // Update authentication state
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.isGuestSubject.next(false);

    // Navigate to login page
    this.router.navigate(['/login']);
  }

  /**
   * Get the stored JWT token
   * @returns The JWT token or null if not found
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user is currently authenticated
   * @returns Boolean indicating authentication status
   */
  isAuthenticated(): boolean {
    return this.hasValidToken() || this.isGuest();
  }

  /**
   * Check if user is authenticated with a token (not just guest mode)
   * @returns Boolean indicating if user has a valid token
   */
  isFullyAuthenticated(): boolean {
    return this.hasValidToken() && !this.isGuest();
  }

  /**
   * Get current user role
   * @returns User role or null if not authenticated
   */
  getUserRole(): string | null {
    const userData = this.getUserFromStorage();
    return userData?.role || null;
  }

  /**
   * Handle successful authentication
   * @param response The authentication response from the API
   */
  private handleAuthSuccess(response: AuthResponse): void {
    if (response && response.accessToken) {
      // Store token in localStorage
      localStorage.setItem(this.TOKEN_KEY, response.accessToken);

      // Store user data in localStorage
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

      // Remove guest flag if it exists
      localStorage.removeItem(this.GUEST_KEY);

      // Update authentication state
      this.isAuthenticatedSubject.next(true);
      this.currentUserSubject.next(response.user);
      this.isGuestSubject.next(false);
    }
  }

  /**
   * Check if there is a valid token in localStorage
   * @returns Boolean indicating if a valid token exists
   */
  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return !!token;
  }

  /**
   * Get user data from localStorage
   * @returns User data or null if not found
   */
  private getUserFromStorage(): any {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Simulate login with fake data
   * @param credentials User login credentials
   * @returns Observable with auth response
   */
  private simulateLogin(credentials: LoginData): Observable<AuthResponse> {
    // Find user with matching email and password
    const user = this.mockUsers.find(
      (u) =>
        u.email === credentials.email &&
        'password123' === credentials.motDePasse
    );

    if (user) {
      // Return successful response
      return of({
        accessToken: 'fake-jwt-token',
        user: user,
      }).pipe(delay(500)); // Simulate network delay
    } else {
      // Return error
      return throwError(() => new Error('Invalid email or password')).pipe(
        delay(500)
      );
    }
  }

  /**
   * Simulate register with fake data
   * @param data Registration data
   * @returns Observable with auth response
   */
  private simulateRegister(data: RegistrationData): Observable<AuthResponse> {
    // Check if user already exists
    const existingUser = this.mockUsers.find((u) => u.email === data.email);

    if (existingUser) {
      return throwError(() => new Error('User already exists')).pipe(
        delay(500)
      );
    }

    // Create new user
    const newUser: User = {
      id: (this.mockUsers.length + 1).toString(),
      email: data.email,
      role: data.role || 'USER',
    };

    // Add to mock users
    this.mockUsers.push(newUser);

    // Return successful response
    return of({
      accessToken: 'fake-jwt-token',
      user: newUser,
    }).pipe(delay(500)); // Simulate network delay
  }

  // Add this method to the AuthService class
  getCurrentUserEmail(): string | null {
    const user = this.currentUserSubject.getValue();
    return user ? user.email : null;
  }
}
