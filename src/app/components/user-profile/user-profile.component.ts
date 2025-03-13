import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserProfile, UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
})
export class UserProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  // For password change
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  passwordSuccess = false;
  passwordError = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Initialize forms
    this.initForms();

    // Load user profile
    this.loadUserProfile();
  }

  private initForms(): void {
    // Profile form
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      bio: [''],
      notifications: [true],
      emailUpdates: [false],
      activityAlerts: [true],
    });

    // Password form
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  private passwordMatchValidator(
    form: FormGroup
  ): { mismatch: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  private loadUserProfile(): void {
    this.isLoading = true;
    this.userService.getUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        if (profile) {
          // Update profile form with user data
          this.profileForm.patchValue({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            bio: profile.bio || '',
            notifications: profile.preferences?.notifications,
            emailUpdates: profile.preferences?.emailUpdates,
            activityAlerts: profile.preferences?.activityAlerts,
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.errorMessage = 'Failed to load profile data. Please try again.';
        this.isLoading = false;
      },
    });
  }

  onProfileSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formData = this.profileForm.value;

    // Create profile update object
    const profileUpdate: Partial<UserProfile> = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      bio: formData.bio,
      preferences: {
        notifications: formData.notifications,
        emailUpdates: formData.emailUpdates,
        activityAlerts: formData.activityAlerts,
      },
    };

    this.userService.updateUserProfile(profileUpdate).subscribe({
      next: (updatedProfile) => {
        this.userProfile = updatedProfile;
        this.successMessage = 'Profile updated successfully!';
        this.isSubmitting = false;

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = 'Failed to update profile. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    if (this.passwordForm.hasError('mismatch')) {
      this.passwordError = 'New password and confirmation do not match';
      return;
    }

    this.isSubmitting = true;
    this.passwordSuccess = false;
    this.passwordError = '';

    const formData = this.passwordForm.value;

    this.userService
      .updatePassword(formData.currentPassword, formData.newPassword)
      .subscribe({
        next: () => {
          this.passwordSuccess = true;
          this.isSubmitting = false;
          this.passwordForm.reset();

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.passwordSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating password:', error);
          this.passwordError =
            error.message || 'Failed to update password. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  hasError(formName: 'profile' | 'password', controlName: string): boolean {
    const form = formName === 'profile' ? this.profileForm : this.passwordForm;
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(
    formName: 'profile' | 'password',
    controlName: string
  ): string {
    const form = formName === 'profile' ? this.profileForm : this.passwordForm;
    const control = form.get(controlName);

    if (!control) return '';

    if (control.hasError('required')) {
      return 'This field is required';
    }

    if (control.hasError('minlength')) {
      return `Minimum length is ${
        control.getError('minlength').requiredLength
      } characters`;
    }

    if (
      formName === 'password' &&
      controlName === 'confirmPassword' &&
      form.hasError('mismatch')
    ) {
      return 'Passwords do not match';
    }

    return 'Invalid input';
  }

  // Helper method for template
  getUserRole(): string {
    return this.userProfile?.role || '';
  }

  // Helper method for template
  getUserEmail(): string {
    return this.userProfile?.email || '';
  }

  // Helper method for template
  getFullName(): string {
    if (!this.userProfile) return '';

    if (this.userProfile.firstName && this.userProfile.lastName) {
      return `${this.userProfile.firstName} ${this.userProfile.lastName}`;
    }

    return this.userProfile.name || '';
  }
}
