import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import {
  WeatherService,
  WeatherData,
  ForecastData,
  WeatherBasedActivity,
} from '../../services/weather.service';
import { Subscription, catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent,
  ],
  templateUrl: './weather.component.html',
  styleUrl: './weather.component.css',
})
export class WeatherComponent implements OnInit, OnDestroy {
  currentWeather: WeatherData | null = null;
  forecast: any[] = [];
  activitySuggestions: WeatherBasedActivity[] = [];

  isLoading = true;
  weatherError: string | null = null;
  forecastError: string | null = null;
  suggestionsError: string | null = null;

  selectedCity = 'Paris';
  availableCities = [
    'Paris',
    'Lyon',
    'Marseille',
    'Bordeaux',
    'Lille',
    'Strasbourg',
    'Nice',
    'Toulouse',
  ];

  isDarkMode = false;

  private subscriptions: Subscription[] = [];

  constructor(private weatherService: WeatherService) {}

  ngOnInit(): void {
    this.detectDarkMode();
    this.loadWeatherData();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Format current date for display
   */
  formatCurrentDate(): string {
    return this.formatDate(new Date());
  }

  /**
   * Detect if dark mode is enabled
   */
  detectDarkMode(): void {
    // Check if the user prefers dark mode
    this.isDarkMode =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Listen for changes in color scheme preference
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        this.isDarkMode = event.matches;
      });

    // Also check if the document has a dark class (for manual toggles)
    if (document.documentElement.classList.contains('dark')) {
      this.isDarkMode = true;
    }
  }

  /**
   * Load weather data for the selected city
   */
  loadWeatherData(): void {
    this.isLoading = true;
    this.weatherError = null;
    this.forecastError = null;
    this.suggestionsError = null;

    const weatherSub = forkJoin({
      currentWeather: this.weatherService
        .getCurrentWeather(this.selectedCity)
        .pipe(
          catchError((error) => {
            this.weatherError = `Failed to load current weather: ${error.message}`;
            console.error('Error loading current weather:', error);
            return of(null);
          })
        ),
      forecast: this.weatherService.getForecast(this.selectedCity).pipe(
        catchError((error) => {
          this.forecastError = `Failed to load forecast: ${error.message}`;
          console.error('Error loading forecast:', error);
          return of(null);
        })
      ),
    }).subscribe({
      next: ({ currentWeather, forecast }) => {
        this.isLoading = false;

        if (currentWeather) {
          this.currentWeather = currentWeather;

          // Get activity suggestions based on current weather
          this.loadActivitySuggestions(currentWeather);
        }

        if (forecast) {
          // Process forecast data to get daily forecasts
          this.forecast = this.weatherService.getDailyForecasts(forecast);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading weather data:', error);
      },
    });

    this.subscriptions.push(weatherSub);
  }

  /**
   * Load activity suggestions based on current weather
   */
  loadActivitySuggestions(weatherData: WeatherData): void {
    const suggestionsSub = this.weatherService
      .getActivitySuggestions(weatherData)
      .pipe(
        catchError((error) => {
          this.suggestionsError = `Failed to load activity suggestions: ${error.message}`;
          console.error('Error loading activity suggestions:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (suggestions) => {
          this.activitySuggestions = suggestions.slice(0, 10); // Get top 10 suggestions
        },
        error: (error) => {
          console.error('Error loading activity suggestions:', error);
        },
      });

    this.subscriptions.push(suggestionsSub);
  }

  /**
   * Change the selected city and reload weather data
   */
  changeCity(city: string): void {
    this.selectedCity = city;
    this.loadWeatherData();
  }

  /**
   * Get weather icon URL
   */
  getWeatherIconUrl(iconCode: string): string {
    return this.weatherService.getWeatherIconUrl(iconCode);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  /**
   * Format time for display
   */
  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get suitability class based on score
   */
  getSuitabilityClass(score: number): string {
    if (score >= 80)
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (score >= 60)
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (score >= 40)
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }

  /**
   * Get suitability text based on score
   */
  getSuitabilityText(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Moyen';
    return 'Peu recommandé';
  }
}
