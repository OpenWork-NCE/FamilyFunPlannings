import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  // Reset password form group
  resetForm!: FormGroup;

  // Flag to track form submission
  isSubmitting = false;

  // Error message to display
  errorMessage: string | null = null;

  // Success message to display
  successMessage: string | null = null;

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
  }

  /**
   * Initialize the reset password form with validators
   */
  private initializeForm(): void {
    this.resetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });

    // Subscribe to form value changes to clear error message when user makes changes
    this.resetForm.valueChanges.subscribe(() => {
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

    // Reset messages
    this.errorMessage = null;
    this.successMessage = null;

    // Check if form is valid
    if (this.resetForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.resetForm);
      return;
    }

    // Set submitting flag
    this.isSubmitting = true;

    // Get form values
    const email = this.resetForm.value.email;

    // Call auth service to request password reset
    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        // Show success message
        this.successMessage = response.message || 'Password reset email sent. Please check your inbox.';
        
        // Reset form
        this.resetForm.reset();
        this.formSubmitted = false;
        
        // Reset submitting flag
        this.isSubmitting = false;
      },
      error: (error) => {
        // Set error message and reset submitting flag
        this.errorMessage = error.message || 'Unable to request password reset. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  /**
   * Navigate to the login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Check if a form control has errors and has been touched
   * @param controlName Name of the form control
   * @returns Boolean indicating if the control has errors
   */
  hasError(controlName: string): boolean {
    const control = this.resetForm.get(controlName);
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
    const control = this.resetForm.get(controlName);

    if (!control) {
      return '';
    }

    if (control.errors?.['required']) {
      return 'This field is required';
    }

    if (controlName === 'email' && control.errors?.['email']) {
      return 'Please enter a valid email address';
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