import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  // Login form group
  loginForm!: FormGroup;

  // Flag to track form submission
  isSubmitting = false;

  // Error message to display
  errorMessage: string | null = null;

  // Flag to toggle password visibility
  showPassword = false;

  // Flag to track if form has been submitted at least once
  formSubmitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    this.initializeForm();

    // Only redirect if user has a valid token AND is not in guest mode
    if (
      this.authService.isFullyAuthenticated() &&
      !this.authService.isGuest()
    ) {
      this.router.navigate(['/home']);
    }
  }

  /**
   * Initialize the login form with validators
   */
  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
    });

    // Subscribe to form value changes to clear error message when user makes changes
    this.loginForm.valueChanges.subscribe(() => {
      if (this.formSubmitted && this.errorMessage) {
        this.errorMessage = null;
      }
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Set form as submitted
    this.formSubmitted = true;

    // Reset error message
    this.errorMessage = null;

    // Check if form is valid
    if (this.loginForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    // Set submitting flag
    this.isSubmitting = true;

    // Get form values
    const credentials = this.loginForm.value;

    // Call auth service to login
    this.authService.login(credentials).subscribe({
      next: () => {
        // Navigate to home on successful login
        this.router.navigate(['/home']);
      },
      error: (error) => {
        // Set error message and reset submitting flag
        this.errorMessage = error.message;
        this.isSubmitting = false;
      },
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Continue as guest
   */
  continueAsGuest(): void {
    this.authService.setGuestMode();
  }

  /**
   * Navigate to the signup page
   */
  navigateToSignup(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Check if a form control has errors and has been touched
   * @param controlName Name of the form control
   * @returns Boolean indicating if the control has errors
   */
  hasError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return (
      !!control &&
      control.invalid &&
      (control.dirty || control.touched || this.formSubmitted)
    );
  }

  /**
   * Get error message for a form control
   * @param controlName Name of the form control
   * @returns Error message string
   */
  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);

    if (!control) {
      return '';
    }

    if (control.errors?.['required']) {
      return 'This field is required';
    }

    if (controlName === 'email' && control.errors?.['email']) {
      return 'Please enter a valid email address';
    }

    if (controlName === 'motDePasse' && control.errors?.['minlength']) {
      return 'Password must be at least 6 characters long';
    }

    return 'Invalid input';
  }

  /**
   * Mark all controls in a form group as touched
   * @param formGroup The form group to mark
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      // If control is a nested form group, mark its controls as touched too
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
