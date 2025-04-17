import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  // Flag to track verification process
  isVerifying = true;

  // Error message to display
  errorMessage: string | null = null;

  // Success message to display
  successMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    // Get token from query parameters
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      
      if (token) {
        this.verifyEmail(token);
      } else {
        this.errorMessage = 'Verification token is missing. Please check your email link.';
        this.isVerifying = false;
      }
    });
  }

  /**
   * Verify email with token
   * @param token Verification token
   */
  private verifyEmail(token: string): void {
    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Email verified successfully! You can now log in.';
        this.isVerifying = false;
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Email verification failed. The link may be expired or invalid.';
        this.isVerifying = false;
      },
    });
  }

  /**
   * Navigate to the login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
} 