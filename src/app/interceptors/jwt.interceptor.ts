import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
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

  // Pass the modified request to the next handler
  return next(req);
};
