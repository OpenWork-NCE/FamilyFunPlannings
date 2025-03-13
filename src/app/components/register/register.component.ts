import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegistrationData } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  // Registration form group
  registerForm!: FormGroup;

  // Flag to track form submission
  isSubmitting = false;

  // Error message to display
  errorMessage: string | null = null;

  // Success message to display
  successMessage: string | null = null;

  // Flag to toggle password visibility
  showPassword = false;
  showConfirmPassword = false;

  // Flag to track if form has been submitted at least once
  formSubmitted = false;

  // Password strength indicators
  passwordStrength = 0;
  passwordFeedback = '';

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
   * Initialize the registration form with validators
   */
  private initializeForm(): void {
    this.registerForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        motDePasse: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        // Role is set to USER by default and not shown in the form
        role: ['USER'],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    // Subscribe to form value changes to clear error message when user makes changes
    this.registerForm.valueChanges.subscribe(() => {
      if (this.formSubmitted && this.errorMessage) {
        this.errorMessage = null;
      }

      // Check password strength when password changes
      const password = this.registerForm.get('motDePasse')?.value;
      if (password) {
        this.checkPasswordStrength(password);
      }
    });
  }

  /**
   * Validator to check if passwords match
   */
  private passwordMatchValidator: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const password = control.get('motDePasse');
    const confirmPassword = control.get('confirmPassword');

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  };

  /**
   * Check password strength and provide feedback
   * @param password The password to check
   */
  private checkPasswordStrength(password: string): void {
    // Simple password strength algorithm
    let strength = 0;

    // Length check
    if (password.length >= 8) {
      strength += 1;
    }

    // Contains uppercase
    if (/[A-Z]/.test(password)) {
      strength += 1;
    }

    // Contains lowercase
    if (/[a-z]/.test(password)) {
      strength += 1;
    }

    // Contains numbers
    if (/[0-9]/.test(password)) {
      strength += 1;
    }

    // Contains special characters
    if (/[^A-Za-z0-9]/.test(password)) {
      strength += 1;
    }

    this.passwordStrength = strength;

    // Provide feedback based on strength
    if (strength <= 1) {
      this.passwordFeedback = 'Weak password';
    } else if (strength <= 3) {
      this.passwordFeedback = 'Moderate password';
    } else {
      this.passwordFeedback = 'Strong password';
    }
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
    if (this.registerForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    // Set submitting flag
    this.isSubmitting = true;

    // Get form values and remove confirmPassword
    const formData = { ...this.registerForm.value };
    delete formData.confirmPassword;

    const registrationData: RegistrationData = formData;

    // Call auth service to register
    this.authService.register(registrationData).subscribe({
      next: () => {
        // Show success message
        this.successMessage =
          'Registration successful! Redirecting to login...';

        // Reset form
        this.registerForm.reset();
        this.formSubmitted = false;

        // Reset submitting flag
        this.isSubmitting = false;

        // Redirect to login page after a short delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error: any) => {
        // Set error message and reset submitting flag
        this.errorMessage =
          error.message || 'Registration failed. Please try again.';
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
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Navigate to login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Continue as guest
   */
  continueAsGuest(): void {
    this.authService.setGuestMode();
  }

  /**
   * Check if a form control has errors and has been touched
   * @param controlName Name of the form control
   * @returns Boolean indicating if the control has errors
   */
  hasError(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
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
    const control = this.registerForm.get(controlName);

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

    if (
      controlName === 'confirmPassword' &&
      control.errors?.['passwordMismatch']
    ) {
      return 'Passwords do not match';
    }

    return 'Invalid input';
  }

  /**
   * Get the CSS class for the password strength indicator
   * @returns CSS class string
   */
  getPasswordStrengthClass(): string {
    if (this.passwordStrength <= 1) {
      return 'bg-red-500';
    } else if (this.passwordStrength <= 3) {
      return 'bg-yellow-500';
    } else {
      return 'bg-green-500';
    }
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
