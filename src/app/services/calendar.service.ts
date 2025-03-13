import { Injectable } from '@angular/core';
import {
  Observable,
  forkJoin,
  map,
  of,
  switchMap,
  throwError,
  catchError,
  timeout,
  tap,
} from 'rxjs';
import { GroupService, GroupActivity, Group } from './group.service';
import { ActivityService, Activity } from './activity.service';
import { AuthService } from './auth.service';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  groupId?: string;
  groupName?: string;
  activityId: number;
  color?: string;
  type: 'personal' | 'group';
  addedBy?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly EVENT_COLORS = {
    personal: '#4f46e5', // indigo-600
    group: '#0891b2', // cyan-600
    owner: '#0d9488', // teal-600
    member: '#7c3aed', // violet-600
  };

  constructor(
    private groupService: GroupService,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  /**
   * Get all calendar events for the current user
   * Combines personal favorite activities and group activities
   */
  getAllEvents(startDate?: Date, endDate?: Date): Observable<CalendarEvent[]> {
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    return this.getGroupEvents().pipe(
      tap((events) => {
        console.log('Group events fetched:', events);
      }),
      map((events) => {
        console.log('Group events:', events);
        // Filter by date range if provided
        if (startDate && endDate) {
          return events.filter((event) => {
            return event.start >= startDate && event.start <= endDate;
          });
        }
        return events;
      }),
      catchError((error) => {
        console.error('Error fetching group events:', error);
        return of([]);
      })
    );
  }

  /**
   * Get events from user's favorite activities
   */
  private getFavoriteEvents(): Observable<CalendarEvent[]> {
    return this.activityService.getFavorites().pipe(
      map((favoriteIds) => {
        if (favoriteIds.length === 0) {
          return [];
        }

        // Convert favorite activities to calendar events
        const events: CalendarEvent[] = [];

        favoriteIds.forEach((id) => {
          const activity = this.activityService.getActivityByIdSync(id);
          if (activity) {
            // For favorite activities, we don't have a specific date
            // So we create a placeholder event for today
            const today = new Date();
            today.setHours(12, 0, 0, 0); // Noon

            events.push({
              id: `personal-${activity.id}`,
              title: activity.title,
              description: activity.description,
              start: today,
              end: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
              allDay: false,
              location: activity.location,
              activityId: activity.id,
              color: this.EVENT_COLORS.personal,
              type: 'personal',
            });
          }
        });

        return events;
      })
    );
  }

  /**
   * Get events from user's groups
   */
  private getGroupEvents(): Observable<CalendarEvent[]> {
    return this.groupService.getUserGroups().pipe(
      map((groups) => {
        const events: CalendarEvent[] = [];
        const currentUserEmail = this.authService.getCurrentUserEmail();

        console.log(`Processing ${groups.length} groups for calendar events`);

        if (groups.length === 0) {
          console.warn('No groups found for the current user');
        }

        // Process each group
        groups.forEach((group) => {
          const isOwner = group.owner === currentUserEmail;
          console.log(
            `Group: ${group.name}, Activities: ${group.activities.length}`
          );

          // Process each activity in the group
          group.activities.forEach((activity) => {
            console.log(
              `Activity: ${activity.title}, PlannedDate: ${activity.plannedDate}`
            );

            // Only include activities with planned dates
            if (activity.plannedDate) {
              try {
                const startDate = new Date(activity.plannedDate);

                // Skip invalid dates
                if (isNaN(startDate.getTime())) {
                  console.warn(
                    `Invalid date for activity: ${activity.title} - Date: ${activity.plannedDate}`
                  );
                  return;
                }

                console.log(
                  `Adding activity to calendar: ${
                    activity.title
                  } on ${startDate.toISOString()}`
                );

                // Create an end date 2 hours after start
                const endDate = new Date(
                  startDate.getTime() + 2 * 60 * 60 * 1000
                );

                // Get full activity details if available
                const fullActivity = this.activityService.getActivityByIdSync(
                  activity.activityId
                );

                // Create the calendar event
                events.push({
                  id: `group-${group.id}-${activity.id}`,
                  title: activity.title,
                  description:
                    activity.description ||
                    (fullActivity ? fullActivity.description : ''),
                  start: startDate,
                  end: endDate,
                  allDay: false,
                  location:
                    activity.location ||
                    (fullActivity ? fullActivity.location : undefined),
                  groupId: group.id,
                  groupName: group.name,
                  activityId: activity.activityId,
                  color: isOwner
                    ? this.EVENT_COLORS.owner
                    : this.EVENT_COLORS.member,
                  type: 'group',
                  addedBy: activity.addedBy,
                });
              } catch (error) {
                console.error(
                  `Error processing activity ${activity.title}:`,
                  error
                );
              }
            } else {
              console.warn(
                `Activity ${activity.title} has no planned date and will not appear in calendar`
              );
            }
          });
        });

        console.log(`Loaded ${events.length} group events`);
        return events;
      }),
      catchError((error) => {
        console.error('Error in getGroupEvents:', error);
        // Instead of returning an empty array, propagate the error
        return throwError(
          () =>
            new Error(
              `Failed to load group events: ${error.message || 'Unknown error'}`
            )
        );
      })
    );
  }

  /**
   * Get events for a specific day
   */
  getEventsForDay(date: Date): Observable<CalendarEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getAllEvents(startOfDay, endOfDay).pipe(
      timeout(5000), // Add a 5-second timeout
      catchError((error) => {
        console.error('Error in getEventsForDay:', error);
        return of([]);
      })
    );
  }

  /**
   * Get events for a specific month
   */
  getEventsForMonth(year: number, month: number): Observable<CalendarEvent[]> {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return this.getAllEvents(startOfMonth, endOfMonth).pipe(
      timeout(5000), // Add a 5-second timeout
      catchError((error) => {
        console.error('Error in getEventsForMonth:', error);
        return of([]);
      })
    );
  }

  /**
   * Get events for a specific week
   */
  getEventsForWeek(date: Date): Observable<CalendarEvent[]> {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

    const startOfWeek = new Date(date);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getAllEvents(startOfWeek, endOfWeek).pipe(
      timeout(5000), // Add a 5-second timeout
      catchError((error) => {
        console.error('Error in getEventsForWeek:', error);
        return of([]);
      })
    );
  }

  /**
   * Get the color for an event based on its type
   */
  getEventColor(event: CalendarEvent): string {
    return event.color || this.EVENT_COLORS[event.type];
  }
}
