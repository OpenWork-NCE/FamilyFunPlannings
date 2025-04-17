import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string;
  dt: number;
  visibility: number;
}

export interface ForecastData {
  list: {
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: {
      id: number;
      main: string;
      description: string;
      icon: string;
    }[];
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
    };
    dt_txt: string;
  }[];
  city: {
    name: string;
    country: string;
  };
}

/**
 * Daily forecast item
 */
export interface DailyForecastItem {
  dt_txt: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  wind?: {
    speed: number;
    deg: number;
  };
  clouds?: {
    all: number;
  };
}

/**
 * GeoPoint for activity location
 */
export interface GeoPoint {
  longitude: number;
  latitude: number;
}

/**
 * Activity metadata including social interactions
 */
export interface ActivityMetadata {
  social?: {
    ratings?: {
      averageRating: number;
      ratingCount: number;
    };
    likeCount?: number;
    commentCount?: number;
    userHasLiked?: boolean;
    userRating?: number | null;
  };
}

/**
 * Activity filters
 */
export interface ActivityFilters {
  price?: 'free' | 'paid' | 'unknown';
  accessibility?: 'full' | 'limited' | 'none' | 'unknown';
  opening_status?: string;
}

/**
 * Activity suggestion based on weather
 */
export interface Activity {
  id: string;
  name: string;
  geo?: GeoPoint;
  categories: string[];
  subcategories?: string[];
  city: string;
  tags?: string[];
  filters?: ActivityFilters;
  images: string[];
  metadata?: ActivityMetadata;
  lastUpdated?: string;
  dataSource?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private apiUrl = `${environment.apiUrl}/weather`;
  private defaultCity = 'Paris'; // Default city
  private http = inject(HttpClient);

  /**
   * Get current weather for a city
   */
  getCurrentWeather(city: string = this.defaultCity): Observable<WeatherData> {
    return this.http.get<WeatherData>(`${this.apiUrl}/current`, {
      params: { city }
    }).pipe(
      catchError((error) => {
        console.error('[WeatherService] Error fetching current weather:', error);
        return throwError(
          () => new Error(`Failed to fetch weather data: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get 5-day forecast for a city
   */
  getForecast(city: string = this.defaultCity): Observable<ForecastData> {
    return this.http.get<ForecastData>(`${this.apiUrl}/forecast`, {
      params: { city }
    }).pipe(
      catchError((error) => {
        console.error('[WeatherService] Error fetching forecast:', error);
        return throwError(
          () => new Error(`Failed to fetch forecast data: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get daily forecasts for a city
   */
  getDailyForecast(city: string = this.defaultCity): Observable<DailyForecastItem[]> {
    return this.http.get<DailyForecastItem[]>(`${this.apiUrl}/daily-forecast`, {
      params: { city }
    }).pipe(
      catchError((error) => {
        console.error('[WeatherService] Error fetching daily forecast:', error);
        return throwError(
          () => new Error(`Failed to fetch daily forecast data: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get weather icon URL
   */
  getWeatherIconUrl(iconCode: string): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/icon/${iconCode}`).pipe(
      catchError((error) => {
        console.error('[WeatherService] Error fetching weather icon URL:', error);
        return throwError(
          () => new Error(`Failed to fetch weather icon URL: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get activity suggestions based on weather conditions for a city
   */
  getActivitySuggestions(city: string = this.defaultCity): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/activity-suggestions`, {
      params: { city }
    }).pipe(
      catchError((error) => {
        console.error('[WeatherService] Error fetching weather-based activity suggestions:', error);
        return throwError(
          () => new Error(`Failed to fetch activity suggestions: ${error.message}`)
        );
      })
    );
  }
}
