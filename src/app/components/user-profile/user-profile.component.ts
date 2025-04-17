import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { User, UserService, UserUpdateRequest, PasswordUpdateRequest, MessageResponse } from '../../services/user.service';
import { DialogComponent } from '../dialog/dialog.component';
import { animate, style, transition, trigger } from '@angular/animations';

// Extended user interface to include avatar
interface ExtendedUser extends User {
  avatar?: string | null;
}

interface RoleWithName {
  name: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogComponent
  ],
  templateUrl: './user-profile.component.html',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  styles: [`
    @keyframes pulse-blue {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(79, 70, 229, 0);
      }
    }
    
    .animate-pulse-blue {
      animation: pulse-blue 2s infinite;
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
    
    .profile-form-enter {
      opacity: 0;
      transform: translateY(20px);
    }
    
    .profile-form-enter-active {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 300ms, transform 300ms;
    }
  `]
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Reactive state using signals
  user = signal<ExtendedUser | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');
  
  // Password form state
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordSuccess = signal(false);
  passwordError = signal<string>('');
  passwordStrength = signal(0);
  
  // Delete account dialog state
  showDeleteDialog = signal(false);
  
  // Forms
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  // Computed properties
  hasProfileData = computed(() => !!this.user());
  isPasswordStrong = computed(() => this.passwordStrength() >= 3);
  
  // Active tab
  activeTab = signal('profile'); // 'profile' or 'security'

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
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Tab management
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
    // Reset messages when switching tabs
    this.successMessage.set('');
    this.errorMessage.set('');
    this.passwordSuccess.set(false);
    this.passwordError.set('');
  }

  private initForms(): void {
    // Profile form
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: [{ value: '', disabled: true }],
      phoneNumber: [''],
      bio: ['', [Validators.maxLength(500)]],
      notificationsEnabled: [false]
    });

    // Password form
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
    
    // Listen for password changes to evaluate strength
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(value => {
      this.calculatePasswordStrength(value);
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    return null;
  }
  
  /**
   * Check password strength
   */
  private calculatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength.set(0);
      return;
    }
    
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
    
    this.passwordStrength.set(strength);
  }

  loadUserProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    this.userService.getUserProfile()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (profile) => {
          // Cast to ExtendedUser to include avatar
          this.user.set({
            ...profile,
            avatar: profile.profilePictureUrl // Map profilePictureUrl to avatar
          });
          
          // Update profile form with user data
          this.profileForm.patchValue({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: profile.email || '',
            phoneNumber: profile.phoneNumber || '',
            bio: profile.bio || '',
            notificationsEnabled: profile.notificationsEnabled !== undefined 
              ? profile.notificationsEnabled 
              : false
          });
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.errorMessage.set('Failed to load profile data. Please try again later.');
        }
      });
  }

  onProfileSubmit(): void {
    if (this.profileForm.invalid || this.isSubmitting()) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formData = this.profileForm.value;

    // Create profile update object
    const profileUpdate: UserUpdateRequest = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      bio: formData.bio,
      notificationsEnabled: formData.notificationsEnabled
    };

    this.userService.updateUserProfile(profileUpdate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (response: MessageResponse) => {
          this.successMessage.set(response.message || 'Profile updated successfully!');
          
          // Reload the profile to get the updated data
          this.loadUserProfile();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage.set('');
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.errorMessage.set(error.message || 'Failed to update profile. Please try again.');
        }
      });
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid || this.isSubmitting()) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    if (this.passwordForm.hasError('mismatch')) {
      this.passwordError.set('New password and confirmation do not match');
      return;
    }

    this.isSubmitting.set(true);
    this.passwordSuccess.set(false);
    this.passwordError.set('');

    const formData = this.passwordForm.value;

    const passwordUpdate: PasswordUpdateRequest = {
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    };

    this.userService.updatePassword(passwordUpdate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: () => {
          this.passwordSuccess.set(true);
          this.passwordForm.reset();

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.passwordSuccess.set(false);
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating password:', error);
          this.passwordError.set(error.message || 'Failed to update password. Please try again.');
        }
      });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword.update(value => !value);
        break;
      case 'new':
        this.showNewPassword.update(value => !value);
        break;
      case 'confirm':
        this.showConfirmPassword.update(value => !value);
        break;
    }
  }

  hasError(formName: 'profile' | 'password', controlName: string): boolean {
    const form = formName === 'profile' ? this.profileForm : this.passwordForm;
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(formName: 'profile' | 'password', controlName: string): string {
    const form = formName === 'profile' ? this.profileForm : this.passwordForm;
    const control = form.get(controlName);
    
    if (!control || !(control.dirty || control.touched)) return '';
    
    if (control.hasError('required')) {
      return 'This field is required';
    } else if (control.hasError('minlength')) {
      const minlengthError = control.getError('minlength');
      return `Must be at least ${minlengthError.requiredLength} characters`;
    } else if (control.hasError('maxlength')) {
      const maxlengthError = control.getError('maxlength');
      return `Cannot exceed ${maxlengthError.requiredLength} characters`;
    } else if (control.hasError('pattern')) {
      if (controlName === 'newPassword') {
        return 'Password must include uppercase, lowercase, number and special character';
      }
      return 'Invalid format';
    } else if (control.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    
    return 'Invalid input';
  }
  
  /**
   * Get password strength class for styling
   */
  getPasswordStrengthClass(): string {
    const strength = this.passwordStrength();
    if (strength <= 1) {
      return 'bg-red-500';
    } else if (strength <= 3) {
      return 'bg-yellow-500';
    } else {
      return 'bg-green-500';
    }
  }
  
  /**
   * Get password strength label
   */
  getPasswordStrengthLabel(): string {
    const strength = this.passwordStrength();
    if (strength <= 1) {
      return 'Weak password';
    } else if (strength <= 3) {
      return 'Moderate password';
    } else {
      return 'Strong password';
    }
  }

  // Helper methods for template
  getUserRole(): string {
    const currentUser = this.user();
    if (!currentUser?.roles?.length) return '';
    
    // Convert role object to string if needed
    const role = currentUser.roles[0];
    if (typeof role === 'string') {
      return role.replace('ROLE_', '');
    } else if (typeof role === 'object' && role !== null) {
      const roleWithName = role as RoleWithName;
      return roleWithName.name.replace('ROLE_', '');
    }
    
    return '';
  }

  getUserEmail(): string {
    return this.user()?.email || '';
  }

  getFullName(): string {
    const currentUser = this.user();
    if (!currentUser) return '';

    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }

    return '';
  }
  
  getCreatedAtFormatted(): string {
    const timestamp = this.user()?.createdAt;
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) { 
      console.error('Error formatting date:', e);
      return '';
    }
  }
  
  getLastLoginFormatted(): string {
    const timestamp = this.user()?.lastLoginAt;
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      return '';
    }
  }
  
  /**
   * Mark all controls in a form group as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  /**
   * Open delete account dialog
   */
  openDeleteDialog(): void {
    this.showDeleteDialog.set(true);
  }
  
  /**
   * Close delete account dialog
   */
  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
  }
  
  /**
   * Delete account
   */
  deleteAccount(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    
    this.userService.deleteAccount()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting.set(false);
          this.showDeleteDialog.set(false);
        })
      )
      .subscribe({
        next: () => {
          // Navigate to login after account deletion (auth service will automatically log out)
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Error deleting account:', error);
          this.errorMessage.set(error.message || 'Failed to delete account. Please try again.');
        }
      });
  }
  
  /**
   * Log out the current user
   */
  logout(): void {
    this.authService.logout();
  }
}
