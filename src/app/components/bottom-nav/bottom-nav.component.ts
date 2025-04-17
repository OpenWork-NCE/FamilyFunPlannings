import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  showInGuestMode: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
})
export class BottomNavComponent {
  // Navigation items
  navItems: NavItem[] = [
    { label: 'Home', icon: 'explore', route: '/home', showInGuestMode: true },
    {
      label: 'Activities',
      icon: 'activities',
      route: '/activities',
      showInGuestMode: true,
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      route: '/calendar',
      showInGuestMode: false,
    },
    {
      label: 'Weather',
      icon: 'weather',
      route: '/weather',
      showInGuestMode: false,
    },
    {
      label: 'Groups',
      icon: 'groups',
      route: '/groups',
      showInGuestMode: false,
    },
    {
      label: 'Profile',
      icon: 'profile',
      route: '/profile',
      showInGuestMode: false,
    },
  ];

  private isBrowser: boolean;

  constructor(
    public authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Get current route to highlight active item
  isActive(route: string): boolean {
    // Make sure we're in the browser
    if (!this.isBrowser) {
      return false;
    }
    
    const currentPath = window.location.pathname;

    // Special case for root route
    if (route === '/home' && (currentPath === '/' || currentPath === '/home')) {
      return true;
    }

    // Activities routes
    if (
      route === '/activities' &&
      (currentPath === '/activities' ||
        currentPath.startsWith('/activities/') ||
        currentPath === '/liked-activities')
    ) {
      return true;
    }

    // Groups routes
    if (
      route === '/groups' &&
      (currentPath === '/groups' || currentPath.startsWith('/groups/'))
    ) {
      return true;
    }

    // Profile routes
    if (
      route === '/profile' &&
      (currentPath === '/profile' || currentPath === '/user-profile')
    ) {
      return true;
    }

    // Calendar route
    if (route === '/calendar' && currentPath === '/calendar') {
      return true;
    }

    // Weather route
    if (route === '/weather' && currentPath === '/weather') {
      return true;
    }

    // Login and register routes
    if (route === '/login' && currentPath === '/login') {
      return true;
    }

    if (route === '/register' && currentPath === '/register') {
      return true;
    }

    return false;
  }

  // Get visible navigation items based on guest mode
  getVisibleNavItems(): NavItem[] {
    if (this.authService.isGuest()) {
      return this.navItems.filter((item) => item.showInGuestMode);
    }
    return this.navItems;
  }
}
