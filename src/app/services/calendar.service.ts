import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface CalendarEvent {
  id: number;
  title: string;
  activityId: string;
  groupId: number;
  groupName: string;
  start: number[] | string; // Can be either array [year, month, day, hour, minute] or ISO string
  end: number[] | string; // Can be either array [year, month, day, hour, minute] or ISO string
  allDay: boolean;
  description?: string;
  location?: string;
  color?: string;
  addedById: number;
  addedByName: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private apiUrl = `${environment.apiUrl}/calendar`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private eventsSubject = new BehaviorSubject<CalendarEvent[]>([]);
  events$ = this.eventsSubject.asObservable();
  
  constructor() {
    // Load calendar events if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.loadEvents();
      } else {
        // Clear events when user logs out
        this.eventsSubject.next([]);
      }
    });
  }

  /**
   * Load all calendar events
   */
  private loadEvents(): void {
    this.getAllEvents().subscribe({
      next: (events) => {
        this.eventsSubject.next(events);
      },
      error: (error) => {
        console.error('Error loading calendar events:', error);
      }
    });
  }

  /**
   * Get all calendar events for the authenticated user
   */
  getAllEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/events`).pipe(
      map(events => this.convertDatesToLocal(events)),
      catchError(error => {
        console.error('Error fetching calendar events:', error);
        return throwError(() => new Error('Failed to fetch calendar events'));
      })
    );
  }

  /**
   * Get events for a specific day
   */
  getEventsForDay(date: Date): Observable<CalendarEvent[]> {
    const formattedDate = this.formatDate(date);
    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/events/day`, {
      params: { date: formattedDate }
    }).pipe(
      map(events => this.convertDatesToLocal(events)),
      catchError(error => {
        console.error('Error fetching daily events:', error);
        return throwError(() => new Error('Failed to fetch daily events'));
      })
    );
  }

  /**
   * Get events for a specific week
   */
  getEventsForWeek(startDate: Date): Observable<CalendarEvent[]> {
    const formattedDate = this.formatDate(startDate);
    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/events/week`, {
      params: { startDate: formattedDate }
    }).pipe(
      map(events => this.convertDatesToLocal(events)),
      catchError(error => {
        console.error('Error fetching weekly events:', error);
        return throwError(() => new Error('Failed to fetch weekly events'));
      })
    );
  }

  /**
   * Get events for a specific month
   */
  getEventsForMonth(year: number, month: number): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/events/month`, {
      params: { 
        year: year.toString(), 
        month: month.toString() 
      }
    }).pipe(
      map(events => this.convertDatesToLocal(events)),
      catchError(error => {
        console.error('Error fetching monthly events:', error);
        return throwError(() => new Error('Failed to fetch monthly events'));
      })
    );
  }

  /**
   * Get formatted event details for a specific event
   */
  getEventDetails(eventId: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/events/${eventId}/details`, {
      responseType: 'text'
    }).pipe(
      catchError(error => {
        console.error('Error fetching event details:', error);
        return throwError(() => new Error('Failed to fetch event details'));
      })
    );
  }

  /**
   * Helper method to format date to ISO format (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Helper method to convert date arrays to JavaScript Date objects
   * and handle timezone conversions
   */
  private convertDatesToLocal(events: CalendarEvent[]): CalendarEvent[] {
    return events.map(event => {
      // Create a copy of the event to avoid mutating the original
      const modifiedEvent = { ...event };
      
      // Handle start date
      if (Array.isArray(modifiedEvent.start)) {
        // Convert array format [year, month, day, hour, minute] to Date object
        const [year, month, day, hour, minute] = modifiedEvent.start;
        // Note: JavaScript months are 0-indexed, but our API uses 1-indexed months
        modifiedEvent.start = new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();
      }
      
      // Handle end date
      if (Array.isArray(modifiedEvent.end)) {
        // Convert array format [year, month, day, hour, minute] to Date object
        const [year, month, day, hour, minute] = modifiedEvent.end;
        // Note: JavaScript months are 0-indexed, but our API uses 1-indexed months
        modifiedEvent.end = new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();
      }
      
      return modifiedEvent;
    });
  }
}
