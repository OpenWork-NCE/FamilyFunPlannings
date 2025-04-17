import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { CalendarService, CalendarEvent } from '../../services/calendar.service';

// Type for API date format
type ApiDateFormat = string | number[];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  hasEvents: boolean;
}

interface CalendarWeek {
  days: CalendarDay[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    BottomNavComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  weeks: CalendarWeek[] = [];
  monthNames: string[] = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  dayNames: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  isLoading = true;
  events: CalendarEvent[] = [];
  selectedDateEvents: CalendarEvent[] = [];

  viewMode: 'month' | 'day' = 'month';

  isDarkMode = false;

  private subscriptions: Subscription[] = [];
  loadingError: string | null = null;

  totalEventsCount = 0;
  plannedDaysCount = 0;

  constructor(
    private calendarService: CalendarService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMonthData();
    this.detectDarkMode();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach((sub) => sub.unsubscribe());
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
   * Load events for the current month and build the calendar
   */
  loadMonthData(): void {
    this.isLoading = true;
    this.loadingError = null;
    this.totalEventsCount = 0;
    this.plannedDaysCount = 0;

    const subscription = this.calendarService
      .getEventsForMonth(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() + 1 // Month is 1-indexed in the API
      )
      .pipe(
        retry(2), // Retry up to 2 times if there's an error
        catchError((error) => {
          this.loadingError =
            'Failed to load calendar data. Please try again later.';
          console.error('Error loading calendar events', error);
          return of([]);
        })
      )
      .subscribe({
        next: (events) => {
          this.events = events;
          this.totalEventsCount = events.length;

          // Count unique days with events using the fixed date handling
          const uniqueDays = new Set<string>();
          events.forEach((event) => {
            const eventDate = this.createDateFromApiFormat(event.start);
            const dateStr = eventDate.toDateString();
            uniqueDays.add(dateStr);
          });
          this.plannedDaysCount = uniqueDays.size;

          this.buildCalendar();
          this.isLoading = false;

          // Only load selected date events if we're in day view
          // This prevents recursive calls between loadMonthData and onDateSelected
          if (this.viewMode === 'day') {
            this.loadSelectedDateEvents();
          }
        },
        error: (error) => {
          console.error('Error loading calendar events', error);
          this.isLoading = false;
          this.loadingError =
            'Failed to load calendar data. Please try again later.';
          // Handle the error gracefully
          this.events = [];
          this.buildCalendar();
        },
      });

    this.subscriptions.push(subscription);
  }

  /**
   * Load events for the selected date without changing view mode
   */
  loadSelectedDateEvents(): void {
    const subscription = this.calendarService
      .getEventsForDay(this.selectedDate)
      .pipe(
        retry(2), // Retry up to 2 times if there's an error
        catchError((error) => {
          console.error('Error loading day events', error);
          return of([]);
        }),
        map((events) => this.sortEventsByTime(events))
      )
      .subscribe({
        next: (events) => {
          this.selectedDateEvents = events;
        },
        error: (error) => {
          console.error('Error loading day events', error);
          this.selectedDateEvents = [];
        },
      });

    this.subscriptions.push(subscription);
  }

  /**
   * Sort events by start time
   */
  sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
      const aTime = this.createDateFromApiFormat(a.start).getTime();
      const bTime = this.createDateFromApiFormat(b.start).getTime();
      return aTime - bTime;
    });
  }

  /**
   * Create a Date object from the API date format
   * Handles both ISO strings and array formats
   */
  createDateFromApiFormat(dateValue: ApiDateFormat): Date {
    if (Array.isArray(dateValue)) {
      const [year, month, day, hour, minute] = dateValue;
      // Month in the API is 1-indexed, but JavaScript Date expects 0-indexed
      return new Date(year, month - 1, day, hour || 0, minute || 0);
    } else {
      return new Date(dateValue);
    }
  }

  /**
   * Build the calendar grid for the current month
   */
  buildCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Get the first day of the month
    const firstDay = new Date(year, month, 1);

    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of the week for the first day (0-6, where 0 is Sunday)
    const firstDayOfWeek = firstDay.getDay();

    // Calculate the number of days to show from the previous month
    const daysFromPrevMonth = firstDayOfWeek;

    // Calculate the total number of days to display (including days from prev/next month)
    const totalDays = 42; // 6 weeks * 7 days

    // Create an array of dates to display
    const dates: Date[] = [];

    // Add days from the previous month
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();

    for (
      let i = prevMonthDays - daysFromPrevMonth + 1;
      i <= prevMonthDays;
      i++
    ) {
      dates.push(new Date(year, month - 1, i));
    }

    // Add days from the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }

    // Add days from the next month
    const remainingDays = totalDays - dates.length;
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(new Date(year, month + 1, i));
    }

    // Create calendar days with events
    const calendarDays: CalendarDay[] = dates.map((date) => {
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const isCurrentMonth = date.getMonth() === month;

      // Find events for this day
      const dayEvents = this.events.filter((event) => {
        const eventDate = this.createDateFromApiFormat(event.start);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      });

      return {
        date,
        isCurrentMonth,
        isToday,
        events: dayEvents,
        hasEvents: dayEvents.length > 0,
      };
    });

    // Group days into weeks
    this.weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      this.weeks.push({
        days: calendarDays.slice(i, i + 7),
      });
    }
  }

  /**
   * Navigate to the previous month
   */
  prevMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.loadMonthData();
  }

  /**
   * Navigate to the next month
   */
  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.loadMonthData();
  }

  /**
   * Navigate to today
   */
  goToToday(): void {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.loadMonthData();
  }

  /**
   * Handle date selection
   */
  onDateSelected(date: Date): void {
    this.selectedDate = new Date(date);
    this.viewMode = 'day';
    this.loadSelectedDateEvents();
  }

  /**
   * Navigate to the previous day
   */
  prevDay(): void {
    const prevDay = new Date(this.selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    this.selectedDate = prevDay;
    this.loadSelectedDateEvents();
  }

  /**
   * Navigate to the next day
   */
  nextDay(): void {
    const nextDay = new Date(this.selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    this.selectedDate = nextDay;
    this.loadSelectedDateEvents();
  }

  /**
   * Switch back to month view
   */
  backToMonth(): void {
    this.viewMode = 'month';
  }

  /**
   * Navigate to activity details
   */
  viewActivityDetails(event: CalendarEvent): void {
    this.router.navigate(['/activities', event.activityId]);
  }

  /**
   * Navigate to group details
   */
  viewGroupDetails(event: CalendarEvent): void {
    if (event.groupId) {
      this.router.navigate(['/groups', event.groupId]);
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get the event time as a formatted string
   */
  getEventTime(event: CalendarEvent): string {
    const date = this.createDateFromApiFormat(event.start);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format time for display from API date format
   */
  formatTime(dateValue: ApiDateFormat): string {
    const date = this.createDateFromApiFormat(dateValue);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get event color based on event type or custom color
   */
  getEventColor(event: CalendarEvent): string {
    // Use custom color if provided
    if (event.color) {
      return event.color;
    }

    // Default color scheme based on event type
    if (event.groupId) {
      return '#3B82F6'; // Blue for group events
    } else {
      return '#8B5CF6'; // Purple for personal events
    }
  }

  /**
   * Get the count of events for a specific day
   */
  getEventCountForDay(date: Date): number {
    return this.events.filter((event) => {
      const eventDate = this.createDateFromApiFormat(event.start);
      return this.isSameDay(eventDate, date);
    }).length;
  }

  /**
   * Get grouped events by time for better day view presentation
   */
  getGroupedEventsForSelectedDate(): { time: string; events: CalendarEvent[] }[] {
    const groups: Record<string, CalendarEvent[]> = {};
    
    // Group events by hour
    this.selectedDateEvents.forEach(event => {
      const eventDate = this.createDateFromApiFormat(event.start);
      const hour = eventDate.getHours();
      const timeKey = hour.toString().padStart(2, '0') + ':00';
      
      if (!groups[timeKey]) {
        groups[timeKey] = [];
      }
      
      groups[timeKey].push(event);
    });
    
    // Convert to array and sort by time
    return Object.keys(groups)
      .sort()
      .map(time => ({
        time,
        events: groups[time]
      }));
  }

  /**
   * Check if two dates are on the same day
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }
}
