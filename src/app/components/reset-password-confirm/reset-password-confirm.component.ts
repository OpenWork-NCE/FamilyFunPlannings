import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-reset-password-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password-confirm.component.html',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ],
  styles: [`
    @keyframes blob {
      0% {
        transform: translate(0px, 0px) scale(1);
      }
      33% {
        transform: translate(30px, -50px) scale(1.1);
      }
      66% {
        transform: translate(-20px, 20px) scale(0.9);
      }
      100% {
        transform: translate(0px, 0px) scale(1);
      }
    }
    
    .animate-blob {
      animation: blob 7s infinite;
    }
    
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    
    @keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
    
    .animate-fade-in {
      animation: fade-in 0.5s ease-out;
    }
  `]
})
export class ResetPasswordConfirmComponent implements OnInit {
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

  // Flag to toggle password visibility
  showPassword = false;
  showConfirmPassword = false;

  // Token from URL
  token: string | null = null;

  // Email from URL
  email: string | null = null;

  // Password strength indicators
  passwordStrength = 0;
  passwordFeedback = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    // Get token and email from query parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || null;
      this.email = params['email'] || null;
      this.initializeForm();
    });
  }

  /**
   * Initialize the reset password form with validators
   */
  private initializeForm(): void {
    this.resetForm = this.formBuilder.group(
      {
        email: [this.email || '', [Validators.required, Validators.email]],
        token: [this.token || '', [Validators.required]],
        newPassword: ['', [
          Validators.required, 
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        ]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    // Subscribe to form value changes to clear error message when user makes changes
    this.resetForm.valueChanges.subscribe(() => {
      if (this.formSubmitted && this.errorMessage) {
        this.errorMessage = null;
      }

      // Check password strength when password changes
      const password = this.resetForm.get('newPassword')?.value;
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
    const password = control.get('newPassword');
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
    if (this.resetForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.resetForm);
      return;
    }

    // Set submitting flag
    this.isSubmitting = true;

    // Get form values
    const resetData = {
      email: this.resetForm.value.email,
      token: this.resetForm.value.token,
      newPassword: this.resetForm.value.newPassword
    };

    // Call auth service to confirm password reset
    this.authService.confirmPasswordReset(resetData).subscribe({
      next: (response) => {
        // Show success message
        this.successMessage = response.message || 'Password reset successfully. You can now log in with your new password.';
        
        // Reset form
        this.resetForm.reset();
        this.formSubmitted = false;
        
        // Reset submitting flag
        this.isSubmitting = false;
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        // Set error message and reset submitting flag
        this.errorMessage = error.message || 'Unable to reset password. The link may be expired or invalid.';
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
   * Navigate to the login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to the password reset request page
   */
  navigateToPasswordReset(): void {
    this.router.navigate(['/reset-password']);
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

    if (controlName === 'newPassword' && control.errors?.['minlength']) {
      return 'Password must be at least 8 characters long';
    }
    
    if (controlName === 'newPassword' && control.errors?.['pattern']) {
      return 'Password must include uppercase, lowercase, numbers, and special characters';
    }

    if (
      controlName === 'confirmPassword' &&
      (control.errors?.['passwordMismatch'] || this.resetForm.hasError('passwordMismatch'))
    ) {
      return 'Passwords do not match';
    }

    return 'Invalid input';
  }

  /**
   * Get CSS class for password strength indicator
   * @returns CSS class string
   */
  getPasswordStrengthClass(): string {
    if (this.passwordStrength <= 1) {
      return 'text-red-500 bg-red-500';
    } else if (this.passwordStrength <= 3) {
      return 'text-yellow-500 bg-yellow-500';
    } else {
      return 'text-green-500 bg-green-500';
    }
  }
  
  /**
   * Check if password meets minimum length requirement
   */
  hasMinLength(password?: string): boolean {
    const pwd = password ?? this.resetForm.get('newPassword')?.value;
    return pwd?.length >= 8;
  }

  /**
   * Check if password contains uppercase letter
   */
  hasUppercase(password?: string): boolean {
    const pwd = password ?? this.resetForm.get('newPassword')?.value;
    return /[A-Z]/.test(pwd || '');
  }

  /**
   * Check if password contains lowercase letter
   */
  hasLowercase(password?: string): boolean {
    const pwd = password ?? this.resetForm.get('newPassword')?.value;
    return /[a-z]/.test(pwd || '');
  }

  /**
   * Check if password contains a number
   */
  hasNumber(password?: string): boolean {
    const pwd = password ?? this.resetForm.get('newPassword')?.value;
    return /[0-9]/.test(pwd || '');
  }

  /**
   * Check if password contains a special character
   */
  hasSpecialChar(password?: string): boolean {
    const pwd = password ?? this.resetForm.get('newPassword')?.value;
    return /[^A-Za-z0-9]/.test(pwd || '');
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