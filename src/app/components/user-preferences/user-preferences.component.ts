import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

interface UserPreferences {
  displayName: string;
  email: string;
  notificationsEnabled: boolean;
  preferredCategories: string[];
  ageGroups: string[];
  maxBudget: number;
}

@Component({
  selector: 'app-user-preferences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent,
  ],
  templateUrl: './user-preferences.component.html',
  styleUrls: ['./user-preferences.component.css'],
})
export class UserPreferencesComponent implements OnInit {
  userPreferences: UserPreferences = {
    displayName: '',
    email: '',
    notificationsEnabled: true,
    preferredCategories: [],
    ageGroups: [],
    maxBudget: 100,
  };

  isDarkMode: boolean = false;

  availableCategories: string[] = [
    'Outdoor',
    'Indoor',
    'Educational',
    'Sports',
    'Arts & Crafts',
    'Music',
    'Cooking',
    'Games',
    'Nature',
    'Technology',
    'Science',
    'Reading',
  ];

  availableAgeGroups: string[] = [
    'Toddlers (1-3)',
    'Preschoolers (3-5)',
    'School Age (6-12)',
    'Teenagers (13-17)',
    'Young Adults (18-21)',
    'Adults (22+)',
  ];

  isLoading: boolean = true;
  isSaving: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserPreferences();
    this.detectDarkMode();
  }

  /**
   * Detect if dark mode is enabled
   */
  detectDarkMode(): void {
    // Check if there's a saved theme preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      this.isDarkMode = false;
      document.documentElement.classList.remove('dark');
    } else {
      // If no saved preference, check system preference
      this.isDarkMode =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      // Apply the theme based on system preference
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Listen for changes in color scheme preference
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        // Only update if there's no saved preference
        if (!localStorage.getItem('theme')) {
          this.isDarkMode = event.matches;
          if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      });
  }

  loadUserPreferences(): void {
    this.isLoading = true;

    // In a real app, you would fetch this from a user preferences service
    // For now, we'll just use the current user's email and mock data
    const currentUserEmail =
      this.authService.getCurrentUserEmail() || 'user@example.com';

    // Simulate API call
    setTimeout(() => {
      this.userPreferences = {
        displayName: currentUserEmail.split('@')[0],
        email: currentUserEmail,
        notificationsEnabled: true,
        preferredCategories: ['Outdoor', 'Sports'],
        ageGroups: ['School Age (6-12)'],
        maxBudget: 50,
      };

      this.isLoading = false;
    }, 1000);
  }

  savePreferences(): void {
    this.isSaving = true;
    this.successMessage = null;
    this.errorMessage = null;

    // Simulate API call
    setTimeout(() => {
      // In a real app, you would save this to a user preferences service
      console.log('Saving preferences:', this.userPreferences);

      this.isSaving = false;
      this.successMessage = 'Your preferences have been saved successfully!';

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    }, 1500);
  }

  toggleCategory(category: string): void {
    const index = this.userPreferences.preferredCategories.indexOf(category);
    if (index === -1) {
      this.userPreferences.preferredCategories.push(category);
    } else {
      this.userPreferences.preferredCategories.splice(index, 1);
    }
  }

  toggleAgeGroup(ageGroup: string): void {
    const index = this.userPreferences.ageGroups.indexOf(ageGroup);
    if (index === -1) {
      this.userPreferences.ageGroups.push(ageGroup);
    } else {
      this.userPreferences.ageGroups.splice(index, 1);
    }
  }

  isCategorySelected(category: string): boolean {
    return this.userPreferences.preferredCategories.includes(category);
  }

  isAgeGroupSelected(ageGroup: string): boolean {
    return this.userPreferences.ageGroups.includes(ageGroup);
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;

    // Update the document class to reflect the theme change
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
}
