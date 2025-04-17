import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
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
      animation: fade-in 0.3s ease-out;
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isProfileMenuOpen = false;
  isMobileMenuOpen = false;
  
  // User data
  private currentUser: User | null = null;
  private userSubscription?: Subscription;
  
  constructor(public authService: AuthService, private router: Router) {}
  
  ngOnInit(): void {
    // Subscribe to user data changes from the auth service
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }
  
  ngOnDestroy(): void {
    // Cleanup subscription
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    // Add background when scrolled
    this.isScrolled = window.scrollY > 10;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    // Close mobile menu if open
    if (this.isProfileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Close profile menu if open
    if (this.isMobileMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.isProfileMenuOpen = false;
    this.isMobileMenuOpen = false;
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isGuest(): boolean {
    return this.authService.isGuest();
  }

  getUserRoles(): string | null {
    const roles = this.authService.getUserRoles();
    if (Array.isArray(roles) && roles.length > 0) {
      return typeof roles[0] === 'string' ? roles[0].replace('ROLE_', '') : '';
    }
    return null;
  }
  
  // New methods for the updated UI
  getUserName(): string | undefined {
    // Get user data from stored user object
    // if (this.currentUser) {
    //   if (this.currentUser.firstName && this.currentUser.lastName) {
    //     return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    //   } else if (this.currentUser.email) {
        return this.currentUser?.email.split('@')[0];
    //   }
    // }
    // return 'User';
  }
  
  getUserInitials(): string | undefined {
    // Get user data from stored user object
    // if (this.currentUser) {
    //   if (this.currentUser.firstName && this.currentUser.lastName) {
    //     return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`.toUpperCase();
    //   } else if (this.currentUser.email) {
        return this.currentUser?.email.charAt(0).toUpperCase();
    //   }
    // }
    // return 'U';
  }
}
