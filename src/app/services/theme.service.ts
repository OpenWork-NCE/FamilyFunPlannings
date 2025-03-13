import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private readonly DARK_THEME = 'dark';
  private readonly LIGHT_THEME = 'light';

  // Use signal for reactive theme state
  currentTheme = signal<string>(this.LIGHT_THEME);

  // Error handling
  private themeErrorSubject = new BehaviorSubject<string | null>(null);
  themeError$ = this.themeErrorSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    try {
      // Check for saved theme preference in localStorage
      const savedTheme = localStorage.getItem(this.THEME_KEY);

      // Check for system preference if no saved theme
      if (!savedTheme) {
        const prefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        this.setTheme(prefersDark ? this.DARK_THEME : this.LIGHT_THEME);
        return;
      }

      this.setTheme(savedTheme);
    } catch (error) {
      console.error('Error initializing theme:', error);
      this.handleThemeError('Failed to initialize theme. Using default theme.');
      this.setThemeWithFallback(this.LIGHT_THEME);
    }
  }

  toggleTheme(): void {
    try {
      const newTheme =
        this.currentTheme() === this.DARK_THEME
          ? this.LIGHT_THEME
          : this.DARK_THEME;

      this.setTheme(newTheme);
      // Clear any previous errors when successful
      this.themeErrorSubject.next(null);
    } catch (error) {
      console.error('Error toggling theme:', error);
      this.handleThemeError('Failed to toggle theme. Please try again.');
    }
  }

  setTheme(theme: string): void {
    try {
      // Validate theme
      if (theme !== this.DARK_THEME && theme !== this.LIGHT_THEME) {
        throw new Error(`Invalid theme: ${theme}`);
      }

      // Update signal
      this.currentTheme.set(theme);

      // Save to localStorage
      localStorage.setItem(this.THEME_KEY, theme);

      // Update document class for CSS
      if (theme === this.DARK_THEME) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error setting theme:', error);
      this.handleThemeError('Failed to set theme. Using fallback theme.');
      this.setThemeWithFallback(this.LIGHT_THEME);
      throw error; // Re-throw for component-level handling if needed
    }
  }

  isDarkTheme(): boolean {
    return this.currentTheme() === this.DARK_THEME;
  }

  // Handle theme errors
  private handleThemeError(message: string): void {
    this.themeErrorSubject.next(message);
  }

  // Fallback theme setter that doesn't throw errors
  private setThemeWithFallback(theme: string): void {
    try {
      // Update signal
      this.currentTheme.set(theme);

      // Try to save to localStorage, but don't fail if it doesn't work
      try {
        localStorage.setItem(this.THEME_KEY, theme);
      } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
      }

      // Update document class for CSS
      if (theme === this.DARK_THEME) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Critical error in fallback theme setter:', e);
      // Last resort - just try to set a basic theme
      if (theme === this.DARK_THEME) {
        try {
          document.documentElement.classList.add('dark');
        } catch (e) {
          console.error('Failed to apply fallback theme:', e);
        }
      }
    }
  }

  // Clear theme error
  clearThemeError(): void {
    this.themeErrorSubject.next(null);
  }
}
