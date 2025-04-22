import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * JWT interceptor function to add the authentication token to outgoing requests
 * @param req The HTTP request
 * @param next The next handler in the chain
 * @returns An observable of the HTTP event
 */
export const JwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  // Only add the Authorization header if a token exists
  if (token) {
    // Clone the request and add the Authorization header
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Pass the modified request to the next handler and catch unauthorized errors
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if it's a 401 Unauthorized error (which indicates expired token)
      if (error.status === 401) {
        console.log('[JwtInterceptor] Token expired or invalid, logging out');
        // Log the user out and redirect to login
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
