import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isProfileMenuOpen = false;
  isMobileMenuOpen = false;
  isMenuOpen = false;

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // No initialization needed
  }

  ngOnDestroy(): void {
    // No cleanup needed
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    // Add shadow when scrolled
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

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isGuest(): boolean {
    return this.authService.isGuest();
  }

  getUserRole(): string | null {
    return this.authService.getUserRole();
  }
}
