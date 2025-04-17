import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  email: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  createdDate: string;
  updatedDate: string;
  creator: User;
  members: User[];
}

export interface GroupActivity {
  id: number;
  activityId: string;
  plannedDateStart: string;
  plannedDateEnd: string;
  allDayEvent: boolean;
  additionalInfo?: string;
  meetingPoint?: string;
  addedBy: User;
  group: {
    id: number;
    name: string;
  };
  activity?: {
    id: string;
    name: string;
    city?: string;
    categories?: string[];
    subcategories?: string[];
    images?: string[];
    [key: string]: unknown;  // Use 'unknown' instead of 'any' for better type safety
  };
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = `${environment.apiUrl}/groups`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private groupsSubject = new BehaviorSubject<Group[]>([]);
  groups$ = this.groupsSubject.asObservable();
  
  constructor() {
    // Load groups if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.loadGroups();
      } else {
        // Clear groups when user logs out
        this.groupsSubject.next([]);
      }
    });
  }

  /**
   * Load all user groups
   */
  private loadGroups(): void {
    this.getAllUserGroups().subscribe({
      next: (groups) => {
        this.groupsSubject.next(groups);
      },
      error: (error) => {
        console.error('Error loading groups:', error);
      }
    });
  }

  /**
   * Create a new group
   */
  createGroup(groupData: { name: string; description: string }): Observable<Group> {
    return this.http.post<Group>(this.apiUrl, groupData).pipe(
      tap(group => {
        const currentGroups = this.groupsSubject.value;
        this.groupsSubject.next([...currentGroups, group]);
      }),
      catchError(error => {
        console.error('Error creating group:', error);
        return throwError(() => new Error('Failed to create group'));
      })
    );
  }

  /**
   * Update an existing group
   */
  updateGroup(groupId: number, groupData: { name: string; description: string }): Observable<Group> {
    return this.http.put<Group>(`${this.apiUrl}/${groupId}`, groupData).pipe(
      tap(updatedGroup => {
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.map(group => 
          group.id === groupId ? updatedGroup : group
        );
        this.groupsSubject.next(updatedGroups);
      }),
      catchError(error => {
        console.error('Error updating group:', error);
        return throwError(() => new Error('Failed to update group'));
      })
    );
  }

  /**
   * Delete a group
   */
  deleteGroup(groupId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${groupId}`).pipe(
      tap(() => {
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.filter(group => group.id !== groupId);
        this.groupsSubject.next(updatedGroups);
      }),
      catchError(error => {
        console.error('Error deleting group:', error);
        return throwError(() => new Error('Failed to delete group'));
      })
    );
  }

  /**
   * Get a specific group by ID
   */
  getGroupById(groupId: number): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${groupId}`).pipe(
      catchError(error => {
        console.error('Error fetching group:', error);
        return throwError(() => new Error('Failed to fetch group'));
      })
    );
  }

  /**
   * Get all groups the user belongs to (as creator or member)
   */
  getAllUserGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching user groups:', error);
        return throwError(() => new Error('Failed to fetch user groups'));
      })
    );
  }

  /**
   * Get groups created by the current user
   */
  getUserCreatedGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/created`).pipe(
      catchError(error => {
        console.error('Error fetching created groups:', error);
        return throwError(() => new Error('Failed to fetch created groups'));
      })
    );
  }

  /**
   * Get groups where the user is a member but not creator
   */
  getUserMemberGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/member`).pipe(
      catchError(error => {
        console.error('Error fetching member groups:', error);
        return throwError(() => new Error('Failed to fetch member groups'));
      })
    );
  }

  /**
   * Search for groups by name
   */
  searchGroups(query: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/search`, {
      params: { query }
    }).pipe(
      catchError(error => {
        console.error('Error searching groups:', error);
        return throwError(() => new Error('Failed to search groups'));
      })
    );
  }

  /**
   * Get all members of a group
   */
  getGroupMembers(groupId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${groupId}/users`).pipe(
      catchError(error => {
        console.error('Error fetching group members:', error);
        return throwError(() => new Error('Failed to fetch group members'));
      })
    );
  }

  /**
   * Add a user to a group
   */
  addUserToGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/${groupId}/users`, null, {
      params: { userId: userId.toString() }
    }).pipe(
      tap(updatedGroup => {
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.map(group => 
          group.id === groupId ? updatedGroup : group
        );
        this.groupsSubject.next(updatedGroups);
      }),
      catchError(error => {
        console.error('Error adding user to group:', error);
        return throwError(() => new Error('Failed to add user to group'));
      })
    );
  }

  /**
   * Remove a user from a group
   */
  removeUserFromGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.delete<Group>(`${this.apiUrl}/${groupId}/users/${userId}`).pipe(
      tap(updatedGroup => {
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.map(group => 
          group.id === groupId ? updatedGroup : group
        );
        this.groupsSubject.next(updatedGroups);
      }),
      catchError(error => {
        console.error('Error removing user from group:', error);
        return throwError(() => new Error('Failed to remove user from group'));
      })
    );
  }

  /**
   * Add an activity to a group
   */
  addActivityToGroup(
    groupId: number, 
    activityData: { 
      activityId: string;
      plannedDateStart: string;
      plannedDateEnd: string;
      allDayEvent: boolean;
      additionalInfo?: string;
      meetingPoint?: string;
    }
  ): Observable<GroupActivity> {
    return this.http.post<GroupActivity>(
      `${this.apiUrl}/${groupId}/activities`, 
      activityData
    ).pipe(
      catchError(error => {
        console.error('Error adding activity to group:', error);
        return throwError(() => new Error('Failed to add activity to group'));
      })
    );
  }

  /**
   * Update a group activity
   */
  updateGroupActivity(
    groupId: number,
    activityId: number,
    activityData: { 
      activityId?: string;  // Make this optional since it might be included from component
      plannedDateStart: string;
      plannedDateEnd: string;
      allDayEvent: boolean;
      additionalInfo?: string;
      meetingPoint?: string;
    }
  ): Observable<GroupActivity> {
    return this.http.put<GroupActivity>(
      `${this.apiUrl}/${groupId}/activities/${activityId}`, 
      activityData
    ).pipe(
      catchError(error => {
        console.error('Error updating group activity:', error);
        return throwError(() => new Error('Failed to update group activity'));
      })
    );
  }

  /**
   * Remove an activity from a group
   */
  removeActivityFromGroup(groupId: number, activityId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(
      `${this.apiUrl}/${groupId}/activities/${activityId}`
    ).pipe(
      catchError(error => {
        console.error('Error removing activity from group:', error);
        return throwError(() => new Error('Failed to remove activity from group'));
      })
    );
  }

  /**
   * Get all activities for a group
   */
  getGroupActivities(groupId: number): Observable<GroupActivity[]> {
    return this.http.get<GroupActivity[]>(
      `${this.apiUrl}/${groupId}/activities`
    ).pipe(
      catchError(error => {
        console.error('Error fetching group activities:', error);
        return throwError(() => new Error('Failed to fetch group activities'));
      })
    );
  }

  /**
   * Get a specific group activity
   */
  getGroupActivityById(groupId: number, activityId: number): Observable<GroupActivity> {
    return this.http.get<GroupActivity>(
      `${this.apiUrl}/${groupId}/activities/${activityId}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching group activity:', error);
        return throwError(() => new Error('Failed to fetch group activity'));
      })
    );
  }

  /**
   * Check if the current user is the creator of a group
   */
  isGroupCreator(group: Group): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(currentUser => {
        if (!currentUser) return false;
        return currentUser.id === group.creator.id;
      })
    );
  }

  /**
   * Check if the current user is a member of a group
   */
  isGroupMember(group: Group): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(currentUser => {
        if (!currentUser) return false;
        return group.members.some(member => member.id === currentUser.id);
      })
    );
  }
}
