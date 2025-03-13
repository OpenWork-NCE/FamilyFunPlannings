import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { ActivityService, Activity } from './activity.service';

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

export interface WeatherBasedActivity {
  id: number;
  title: string;
  description: string;
  weatherCondition: string;
  temperature: {
    min?: number;
    max?: number;
  };
  suitability: number; // 0-100 score
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private apiKey = '5addd02a8a0b25dfc06556a8cc3c2ed2';
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private defaultCity = 'Paris'; // Default city
  private units = 'metric'; // Celsius
  private lang = 'fr'; // French language

  constructor(
    private http: HttpClient,
    private activityService: ActivityService
  ) {}

  /**
   * Get current weather for a city
   */
  getCurrentWeather(city: string = this.defaultCity): Observable<WeatherData> {
    const url = `${this.baseUrl}/weather?q=${city}&appid=${this.apiKey}&units=${this.units}&lang=${this.lang}`;

    return this.http.get<WeatherData>(url).pipe(
      catchError((error) => {
        console.error('Error fetching current weather:', error);
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
    const url = `${this.baseUrl}/forecast?q=${city}&appid=${this.apiKey}&units=${this.units}&lang=${this.lang}`;

    return this.http.get<ForecastData>(url).pipe(
      catchError((error) => {
        console.error('Error fetching forecast:', error);
        return throwError(
          () => new Error(`Failed to fetch forecast data: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get weather icon URL
   */
  getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * Get daily forecasts from the 5-day/3-hour forecast data
   * This extracts one forecast per day (noon) from the 3-hour interval data
   */
  getDailyForecasts(forecastData: ForecastData): any[] {
    const dailyForecasts: any[] = [];
    const processedDates = new Set<string>();

    forecastData.list.forEach((forecast) => {
      const date = new Date(forecast.dt * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Only take one forecast per day (around noon)
      const hour = date.getHours();
      if (!processedDates.has(dateStr) && hour >= 11 && hour <= 14) {
        processedDates.add(dateStr);
        dailyForecasts.push({
          date: date,
          temp: forecast.main.temp,
          weather: forecast.weather[0],
          wind: forecast.wind,
          humidity: forecast.main.humidity,
        });
      }
    });

    return dailyForecasts;
  }

  /**
   * Get activity suggestions based on weather conditions
   */
  getActivitySuggestions(
    weatherData: WeatherData
  ): Observable<WeatherBasedActivity[]> {
    return this.activityService.getActivities().pipe(
      map((activities: Activity[]) => {
        const suggestions: WeatherBasedActivity[] = [];
        const currentTemp = weatherData.main.temp;
        const weatherCondition = weatherData.weather[0].main.toLowerCase();
        const isRainy =
          weatherCondition.includes('rain') ||
          weatherCondition.includes('drizzle');
        const isSnowy = weatherCondition.includes('snow');
        const isClear = weatherCondition.includes('clear');
        const isCloudy = weatherCondition.includes('cloud');
        const isStormy = weatherCondition.includes('thunderstorm');
        const isHot = currentTemp > 25;
        const isCold = currentTemp < 10;
        const isMild = currentTemp >= 10 && currentTemp <= 25;

        activities.forEach((activity: Activity) => {
          let suitability = 50; // Default suitability
          const title = activity.title.toLowerCase();
          const description = activity.description.toLowerCase();

          // Indoor activities are good for bad weather
          const isIndoorActivity =
            title.includes('museum') ||
            title.includes('indoor') ||
            title.includes('cinema') ||
            title.includes('theatre') ||
            title.includes('restaurant') ||
            title.includes('café') ||
            title.includes('cafe') ||
            title.includes('gallery') ||
            description.includes('indoor');

          // Outdoor activities are good for nice weather
          const isOutdoorActivity =
            title.includes('park') ||
            title.includes('hike') ||
            title.includes('garden') ||
            title.includes('walk') ||
            title.includes('beach') ||
            title.includes('outdoor') ||
            description.includes('outdoor');

          // Water activities
          const isWaterActivity =
            title.includes('swim') ||
            title.includes('beach') ||
            title.includes('pool') ||
            title.includes('water') ||
            title.includes('lake') ||
            title.includes('river');

          // Winter activities
          const isWinterActivity =
            title.includes('ski') ||
            title.includes('snow') ||
            title.includes('ice');

          // Adjust suitability based on weather conditions
          if (isRainy || isStormy) {
            if (isIndoorActivity) suitability += 40;
            if (isOutdoorActivity) suitability -= 30;
            if (isWaterActivity) suitability -= 20;
          }

          if (isSnowy) {
            if (isWinterActivity) suitability += 40;
            if (isIndoorActivity) suitability += 20;
            if (isWaterActivity) suitability -= 40;
          }

          if (isClear) {
            if (isOutdoorActivity) suitability += 40;
            if (isWaterActivity && isHot) suitability += 40;
            if (isWinterActivity && isCold) suitability += 30;
          }

          if (isCloudy && !isRainy) {
            if (isOutdoorActivity) suitability += 20;
            if (isIndoorActivity) suitability += 10;
          }

          // Adjust for temperature
          if (isHot) {
            if (isWaterActivity) suitability += 30;
            if (isWinterActivity) suitability -= 40;
          }

          if (isCold) {
            if (isWinterActivity) suitability += 30;
            if (isWaterActivity) suitability -= 30;
          }

          if (isMild) {
            suitability += 10; // Mild weather is good for most activities
          }

          // Ensure suitability is within 0-100 range
          suitability = Math.max(0, Math.min(100, suitability));

          suggestions.push({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            weatherCondition: weatherData.weather[0].main,
            temperature: {
              min: weatherData.main.temp_min,
              max: weatherData.main.temp_max,
            },
            suitability,
          });
        });

        // Sort by suitability (highest first)
        return suggestions.sort((a, b) => b.suitability - a.suitability);
      })
    );
  }
}
