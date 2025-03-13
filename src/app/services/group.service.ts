import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { Observable, of, throwError, catchError, BehaviorSubject } from 'rxjs';
import { delay, map, take } from 'rxjs/operators';
import { Activity, ActivityService } from './activity.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { isPlatformBrowser } from '@angular/common';

export interface GroupMember {
  email: string;
  role: 'owner' | 'member';
}

export interface GroupActivity {
  id: string;
  activityId: number;
  title: string;
  description: string;
  plannedDate: string | null;
  location?: string;
  addedBy: string;
  addedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  owner: string;
  members: string[];
  activities: GroupActivity[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private readonly GROUPS_KEY = 'user_groups';
  private isBrowser: boolean;

  // Mock groups for initial data
  private mockGroups: Group[] = [
    {
      id: '1',
      name: 'Family Adventures',
      description: 'Our family adventure planning group',
      owner: 'user@example.com',
      members: ['user@example.com', 'spouse@example.com', 'child@example.com'],
      activities: [
        {
          id: '1',
          activityId: 2,
          title: 'Museum Exploration',
          description: 'Discover history and science at the local museum.',
          plannedDate: '2025-04-15',
          location: 'City Museum',
          addedBy: 'user@example.com',
          addedAt: '2025-03-01T10:30:00',
        },
      ],
      createdAt: '2025-01-10T08:00:00',
      updatedAt: '2025-01-10T08:00:00',
    },
    {
      id: '2',
      name: 'Weekend Fun',
      description: 'Planning weekend activities with friends',
      owner: 'friend@example.com',
      members: ['friend@example.com', 'user@example.com', 'buddy@example.com'],
      activities: [
        {
          id: '1',
          activityId: 3,
          title: 'Board Game Night',
          description: 'Gather around for a fun evening of board games.',
          plannedDate: '2025-05-20',
          location: "Friend's House",
          addedBy: 'friend@example.com',
          addedAt: '2025-04-15T18:30:00',
        },
      ],
      createdAt: '2025-02-05T14:20:00',
      updatedAt: '2025-02-05T14:20:00',
    },
  ];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private activityService: ActivityService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Initialize groups in localStorage if not exists
    this.initGroups();
  }

  /**
   * Safely get item from localStorage (only in browser)
   */
  private getLocalStorage(key: string): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  }

  /**
   * Safely set item in localStorage (only in browser)
   */
  private setLocalStorage(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Initialize groups in localStorage if not exists
   */
  private initGroups(): void {
    if (!this.isBrowser) return;

    if (!this.getLocalStorage(this.GROUPS_KEY)) {
      this.setLocalStorage(this.GROUPS_KEY, JSON.stringify(this.mockGroups));
    }
  }

  /**
   * Get groups that the current user is a member of
   */
  getUserGroups(): Observable<Group[]> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.warn('getUserGroups: User not authenticated');
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          console.warn('getUserGroups: No current user data available');
          throw new Error('No current user data available');
        }

        console.log(`Getting groups for user: ${currentUser.email}`);
        const groups = this.getGroups();

        if (!groups || !Array.isArray(groups)) {
          console.error(
            'getUserGroups: Invalid groups data in storage',
            groups
          );
          throw new Error('Invalid groups data in storage');
        }

        console.log(`Total groups in storage: ${groups.length}`);

        const userGroups = groups.filter((group) =>
          group.members.includes(currentUser.email)
        );

        console.log(
          `Found ${userGroups.length} groups for user ${currentUser.email}`
        );

        // Log each group and its activities for debugging
        userGroups.forEach((group) => {
          console.log(
            `Group: ${group.name}, Activities: ${group.activities.length}`
          );

          // Check if any activities have plannedDate
          const plannedActivities = group.activities
            .filter((activity: GroupActivity) => activity.plannedDate)
            .sort((a: GroupActivity, b: GroupActivity) => {
              return (
                new Date(a.plannedDate!).getTime() -
                new Date(b.plannedDate!).getTime()
              );
            });
          console.log(
            `- Activities with planned dates: ${plannedActivities.length}`
          );
        });

        return userGroups;
      }),
      catchError((error) => {
        console.error('Error in getUserGroups:', error);
        return throwError(
          () =>
            new Error(
              `Failed to get user groups: ${error.message || 'Unknown error'}`
            )
        );
      }),
      delay(300) // Simulate API delay
    );
  }

  /**
   * Get groups owned by the current user
   */
  getOwnedGroups(): Observable<Group[]> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) return [];

        const groups = this.getGroups();
        return groups.filter((group) => group.owner === currentUser.email);
      }),
      delay(300) // Simulate API delay
    );
  }

  /**
   * Get groups the user is a member of but doesn't own
   */
  getAddedGroups(): Observable<Group[]> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) return [];

        const groups = this.getGroups();
        return groups.filter(
          (group) =>
            group.members.includes(currentUser.email) &&
            group.owner !== currentUser.email
        );
      }),
      delay(300) // Simulate API delay
    );
  }

  /**
   * Get a specific group by ID
   */
  getGroupById(groupId: string): Observable<Group | null> {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);

    if (!group) {
      return throwError(() => new Error('Group not found'));
    }

    return of(group).pipe(delay(300)); // Simulate API delay
  }

  /**
   * Create a new group
   */
  createGroup(groupData: {
    name: string;
    description: string;
  }): Observable<Group> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();

        // Generate a unique ID
        const newId = this.generateUniqueId();
        const now = new Date().toISOString();

        const newGroup: Group = {
          id: newId,
          name: groupData.name,
          description: groupData.description,
          owner: currentUser.email,
          members: [currentUser.email], // Owner is automatically a member
          activities: [],
          createdAt: now,
          updatedAt: now,
        };

        // Add to groups list
        groups.push(newGroup);

        // Save to localStorage
        this.saveGroups(groups);

        return newGroup;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Update a group's details
   */
  updateGroup(groupId: string, groupData: Partial<Group>): Observable<Group> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can update group details
        if (group.owner !== currentUser.email) {
          throw new Error(
            'Permission denied: Only the group owner can update details'
          );
        }

        // Update group details (except for owner and members)
        const updatedGroup: Group = {
          ...group,
          name: groupData.name || group.name,
          description: groupData.description || group.description,
          updatedAt: new Date().toISOString(),
        };

        // Update in the array
        groups[groupIndex] = updatedGroup;

        // Save to localStorage
        this.saveGroups(groups);

        return updatedGroup;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Delete a group
   */
  deleteGroup(groupId: string): Observable<boolean> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can delete the group
        if (group.owner !== currentUser.email) {
          throw new Error('Permission denied: Only the group owner can delete');
        }

        // Remove from array
        groups.splice(groupIndex, 1);

        // Save to localStorage
        this.saveGroups(groups);

        return true;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Add a member to a group
   */
  addGroupMember(groupId: string, memberEmail: string): Observable<Group> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can add members
        if (group.owner !== currentUser.email) {
          throw new Error(
            'Permission denied: Only the group owner can add members'
          );
        }

        // Check if member already exists
        if (group.members.includes(memberEmail)) {
          throw new Error('Member already exists in the group');
        }

        // Add member
        group.members.push(memberEmail);
        group.updatedAt = new Date().toISOString();

        // Update in array
        groups[groupIndex] = group;

        // Save to localStorage
        this.saveGroups(groups);

        return group;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Remove a member from a group
   */
  removeGroupMember(groupId: string, memberEmail: string): Observable<Group> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can remove members
        if (group.owner !== currentUser.email) {
          throw new Error(
            'Permission denied: Only the group owner can remove members'
          );
        }

        // Cannot remove the owner
        if (memberEmail === group.owner) {
          throw new Error('Cannot remove the group owner');
        }

        // Check if member exists
        const memberIndex = group.members.indexOf(memberEmail);
        if (memberIndex === -1) {
          throw new Error('Member not found in the group');
        }

        // Remove member
        group.members.splice(memberIndex, 1);
        group.updatedAt = new Date().toISOString();

        // Update in array
        groups[groupIndex] = group;

        // Save to localStorage
        this.saveGroups(groups);

        return group;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Add an activity to a group
   */
  addActivityToGroup(
    groupId: string,
    activity: Activity | number,
    plannedDate: string | null
  ): Observable<GroupActivity> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Validate scheduled date is not in the past
    if (plannedDate) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

      const scheduledDate = new Date(plannedDate);
      if (scheduledDate < currentDate) {
        return throwError(
          () => new Error('Scheduled date cannot be in the past')
        );
      }
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can add activities
        if (group.owner !== currentUser.email) {
          throw new Error(
            'Permission denied: Only the group owner can add activities'
          );
        }

        // Get activity details
        let activityObj: Activity;
        let activityId: number;

        if (typeof activity === 'number') {
          activityId = activity;
          const fetchedActivity =
            this.activityService.getActivityByIdSync(activityId);
          if (!fetchedActivity) {
            throw new Error('Activity not found');
          }
          activityObj = fetchedActivity;
        } else {
          activityObj = activity;
          activityId = activity.id;
        }

        // Check if activity already exists in the group with the same date
        const existingActivityIndex = group.activities.findIndex(
          (a: GroupActivity) =>
            a.activityId === activityId && a.plannedDate === plannedDate
        );

        if (existingActivityIndex !== -1) {
          throw new Error(
            'Activity already exists in this group with the same date'
          );
        }

        // Create new group activity
        const newGroupActivity: GroupActivity = {
          id: this.generateUniqueId(),
          activityId: activityId,
          title: activityObj.title,
          description: activityObj.description,
          plannedDate: plannedDate,
          location: activityObj.location,
          addedBy: currentUser.email,
          addedAt: new Date().toISOString(),
        };

        // Add to group
        group.activities.push(newGroupActivity);
        group.updatedAt = new Date().toISOString();

        // Update in storage
        groups[groupIndex] = group;
        this.saveGroups(groups);

        return newGroupActivity;
      }),
      delay(300) // Simulate API delay
    );
  }

  /**
   * Update a group activity's scheduled date
   */
  updateGroupActivityDate(
    groupId: string,
    activityId: string,
    newScheduledDate: string
  ): Observable<Group> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Validate scheduled date is not in the past
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    const scheduledDate = new Date(newScheduledDate);
    if (scheduledDate < currentDate) {
      return throwError(
        () => new Error('Scheduled date cannot be in the past')
      );
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can update activities
        if (group.owner !== currentUser.email) {
          throw new Error(
            'Permission denied: Only the group owner can update activities'
          );
        }

        // Find the activity
        const activityIndex = group.activities.findIndex(
          (a: GroupActivity) => a.id === activityId
        );

        if (activityIndex === -1) {
          throw new Error('Activity not found in this group');
        }

        // Update only the date
        group.activities[activityIndex].plannedDate = newScheduledDate;
        group.updatedAt = new Date().toISOString();

        // Update in array
        groups[groupIndex] = group;

        // Save to localStorage
        this.saveGroups(groups);

        return group;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Delete an activity from a group
   */
  deleteGroupActivity(groupId: string, activityId: string): Observable<Group> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.authService.currentUser$.pipe(
      take(1),
      map((currentUser) => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const groups = this.getGroups();
        const groupIndex = groups.findIndex((g) => g.id === groupId);

        if (groupIndex === -1) {
          throw new Error('Group not found');
        }

        const group = groups[groupIndex];

        // Only the owner can delete activities
        if (group.owner !== currentUser.email) {
          throw new Error(
            'Permission denied: Only the group owner can delete activities'
          );
        }

        // Find activity
        const activityIndex = group.activities.findIndex(
          (a: GroupActivity) => a.id === activityId
        );

        if (activityIndex === -1) {
          throw new Error('Activity not found');
        }

        // Remove activity
        group.activities.splice(activityIndex, 1);
        group.updatedAt = new Date().toISOString();

        // Update in array
        groups[groupIndex] = group;

        // Save to localStorage
        this.saveGroups(groups);

        return group;
      }),
      delay(500) // Simulate API delay
    );
  }

  /**
   * Check if activity exists in group
   */
  activityExistsInGroup(
    groupId: string,
    activityId: number,
    plannedDate: string | null
  ): boolean {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);

    if (!group) {
      return false;
    }

    return group.activities.some(
      (a: GroupActivity) =>
        a.activityId === activityId && a.plannedDate === plannedDate
    );
  }

  /**
   * Helper: Save groups to localStorage
   */
  private saveGroups(groups: any[]): void {
    if (!this.isBrowser) return;

    // Save to localStorage
    this.setLocalStorage(this.GROUPS_KEY, JSON.stringify(groups));
  }

  /**
   * Helper: Get groups from localStorage
   */
  private getGroups(): any[] {
    if (!this.isBrowser) return [];

    const groupsJson = this.getLocalStorage(this.GROUPS_KEY);
    if (!groupsJson) return [];

    try {
      return JSON.parse(groupsJson);
    } catch (e) {
      console.error('Error parsing groups from localStorage:', e);
      return [];
    }
  }

  /**
   * Helper: Generate a unique ID
   */
  private generateUniqueId(): string {
    const timestamp = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 10000);
    return `${timestamp}-${randomPart}`;
  }
}
