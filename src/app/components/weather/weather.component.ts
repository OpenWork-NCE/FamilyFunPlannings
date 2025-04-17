import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize } from 'rxjs/operators';

import { WeatherService, WeatherData, ForecastData, Activity, DailyForecastItem } from '../../services/weather.service';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

interface ForecastDay {
  date: Date;
  temp: number;
  weather: {
    description: string;
    icon: string;
  };
}

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent
  ],
  templateUrl: './weather.component.html',
})
export class WeatherComponent implements OnInit, OnDestroy {
  currentWeather: WeatherData | null = null;
  forecast: ForecastDay[] = [];
  activitySuggestions: Activity[] = [];
  dailyForecast: DailyForecastItem[] = [];

  // Separate loading states for different sections
  loadingStates = {
    weather: true,
    forecast: true,
    suggestions: true
  };
  weatherError: string | null = null;
  forecastError: string | null = null;
  suggestionsError: string | null = null;

  selectedCity = 'Paris';
  citySearchControl = new FormControl('');
  showCitySearch = false;
  filteredCities: string[] = [];
  cityChangeInProgress = false;

  availableCities = [
    'Paris',
    'Lyon',
    'Marseille',
    'Bordeaux',
    'Lille',
    'Strasbourg',
    'Nice',
    'Toulouse',
    'Nantes',
    'Montpellier',
    'Rennes',
    'Grenoble'
  ];

  private subscriptions: Subscription[] = [];

  constructor(private weatherService: WeatherService) {}

  ngOnInit(): void {
    this.loadWeatherData();
    this.setupCitySearch();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Setup city search with debounce
   */
  setupCitySearch(): void {
    const searchSub = this.citySearchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(value => value !== null && value.length > 2)
    ).subscribe(value => {
      if (value) {
        this.filterCities(value);
      } else {
        this.filteredCities = [];
      }
    });

    this.subscriptions.push(searchSub);
  }

  /**
   * Filter cities based on search input
   */
  filterCities(search: string): void {
    const searchLower = search.toLowerCase();
    
    // Filter from available cities
    const filtered = this.availableCities.filter(
      city => city.toLowerCase().includes(searchLower)
    );
    
    // If exact match not found, add as a new option
    const exactMatch = filtered.some(
      city => city.toLowerCase() === searchLower
    );
    
    if (!exactMatch && search.length > 2) {
      filtered.push(search);
    }
    
    this.filteredCities = filtered;
  }

  /**
   * Toggle city search visibility
   */
  toggleCitySearch(): void {
    this.showCitySearch = !this.showCitySearch;
    if (this.showCitySearch) {
      setTimeout(() => {
        const input = document.getElementById('citySearch');
        if (input) {
          input.focus();
        }
      }, 100);
    } else {
      this.filteredCities = [];
    }
  }

  /**
   * Format current date for display
   */
  formatCurrentDate(): string {
    return this.formatDate(new Date());
  }

  /**
   * Load weather data for the selected city
   */
  loadWeatherData(): void {
    // Set all loading states to true
    this.loadingStates = {
      weather: true,
      forecast: true,
      suggestions: true
    };
    
    this.cityChangeInProgress = true;
    this.weatherError = null;
    this.forecastError = null;
    this.suggestionsError = null;

    // Get current weather
    const weatherSub = this.weatherService.getCurrentWeather(this.selectedCity)
      .pipe(
        catchError(error => {
          this.weatherError = `Failed to load current weather: ${error.message}`;
          console.error('[WeatherComponent] Error loading current weather:', error);
          return of(null);
        }),
        finalize(() => {
          this.loadingStates.weather = false;
          this.updateCityChangeStatus();
        })
      )
      .subscribe(weather => {
        if (weather) {
          this.currentWeather = weather;
          
          // Load forecast and activity suggestions after getting current weather
          this.loadForecast();
          this.loadActivitySuggestions();
        }
      });

    this.subscriptions.push(weatherSub);
  }

  /**
   * Load 5-day forecast data
   */
  loadForecast(): void {
    this.loadingStates.forecast = true;
    
    const forecastSub = this.weatherService.getForecast(this.selectedCity)
      .pipe(
        catchError(error => {
          this.forecastError = `Failed to load forecast: ${error.message}`;
          console.error('[WeatherComponent] Error loading forecast:', error);
          return of(null);
        }),
        finalize(() => {
          this.loadingStates.forecast = false;
          this.updateCityChangeStatus();
        })
      )
      .subscribe(forecastData => {
        if (forecastData) {
          // Process forecast data to show one entry per day
          this.processForecastData(forecastData);
        }
      });

    this.subscriptions.push(forecastSub);
  }

  /**
   * Process forecast data to get one entry per day
   */
  processForecastData(data: ForecastData): void {
    // Group forecast by day and get mid-day forecast for each day
    const dailyMap = new Map<string, ForecastDay>();
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // If we already have an entry for this date, skip
      // Unless this is a mid-day entry (12-15h) which we prefer
      const hour = date.getHours();
      const isMidDay = hour >= 12 && hour <= 15;
      
      if (!dailyMap.has(dateStr) || isMidDay) {
        dailyMap.set(dateStr, {
          date,
          temp: item.main.temp,
          weather: {
            description: item.weather[0].description,
            icon: item.weather[0].icon
          }
        });
      }
    });
    
    // Convert map to array and sort by date
    this.forecast = Array.from(dailyMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5); // Limit to 5 days
  }

  /**
   * Load activity suggestions based on weather
   */
  loadActivitySuggestions(): void {
    this.loadingStates.suggestions = true;
    
    const suggestionsSub = this.weatherService.getActivitySuggestions(this.selectedCity)
      .pipe(
        catchError(error => {
          this.suggestionsError = `Failed to load activity suggestions: ${error.message}`;
          console.error('[WeatherComponent] Error loading activity suggestions:', error);
          return of([]);
        }),
        finalize(() => {
          this.loadingStates.suggestions = false;
          this.updateCityChangeStatus();
        })
      )
      .subscribe({
        next: (response) => {
          this.activitySuggestions = response;
        },
        error: (error) => {
          console.error('[WeatherComponent] Error processing activity suggestions:', error);
        }
      });

    this.subscriptions.push(suggestionsSub);
  }

  /**
   * Updates the city change status based on all loading states
   */
  private updateCityChangeStatus(): void {
    const { weather, forecast, suggestions } = this.loadingStates;
    if (!weather && !forecast && !suggestions) {
      this.cityChangeInProgress = false;
    }
  }

  /**
   * Check if any section is loading
   */
  isAnyLoading(): boolean {
    return this.loadingStates.weather || 
           this.loadingStates.forecast || 
           this.loadingStates.suggestions;
  }

  /**
   * Change the selected city and reload weather data
   */
  changeCity(city: string): void {
    if (this.selectedCity === city) return;
    
    this.selectedCity = city;
    this.citySearchControl.setValue('');
    this.showCitySearch = false;
    this.filteredCities = [];
    this.loadWeatherData();
  }

  /**
   * Search for a new city
   */
  searchCity(): void {
    const city = this.citySearchControl.value;
    if (city && city.length > 2) {
      this.changeCity(city);
      
      // Add to available cities if not already there
      if (!this.availableCities.includes(city)) {
        this.availableCities.push(city);
      }
    }
  }

  /**
   * Get weather icon URL
   */
  getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  /**
   * Format time for display
   */
  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get formatted temperature with unit
   */
  formatTemperature(temp: number): string {
    return `${Math.round(temp)}°C`;
  }

  /**
   * Capitalize first letter of each word
   */
  capitalize(text: string): string {
    return text.replace(/\b\w/g, match => match.toUpperCase());
  }
  
  /**
   * Get formatted price display for an activity
   */
  getActivityPrice(activity: Activity): string {
    if (!activity.filters?.price) return 'Price varies';
    
    const priceMap: Record<string, string> = {
      'free': 'Free',
      'paid': 'Paid',
      'unknown': 'Varies'
    };
    
    return priceMap[activity.filters.price] || 'Price varies';
  }

  /**
   * Get formatted accessibility display for an activity
   */
  getActivityAccessibility(activity: Activity): string {
    if (!activity.filters?.accessibility) return 'Accessibility unknown';
    
    const accessibilityMap: Record<string, string> = {
      'full': 'Fully Accessible',
      'limited': 'Limited Access',
      'none': 'Not Accessible',
      'unknown': 'Accessibility Unknown'
    };
    
    return accessibilityMap[activity.filters.accessibility] || 'Accessibility unknown';
  }
}
