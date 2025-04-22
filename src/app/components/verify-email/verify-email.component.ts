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

  // Store the token from URL
  token: string | null = null;

  // Flag to track if verification has been initiated
  hasInitiatedVerification = false;

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
        // Store the token for later use
        this.token = token;
        this.isVerifying = false;
        this.hasInitiatedVerification = true;
      } else {
        this.errorMessage = 'Verification token is missing. Please check your email link.';
        this.isVerifying = false;
      }
    });
  }

  /**
   * Verify email with token
   * Called when user clicks the "Confirm Verification" button
   */
  verifyEmail(): void {
    if (!this.token) {
      this.errorMessage = 'Verification token is missing. Please check your email link.';
      return;
    }
    
    this.isVerifying = true;
    
    this.authService.verifyEmail(this.token).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Email verified successfully! You can now log in.';
        this.isVerifying = false;
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