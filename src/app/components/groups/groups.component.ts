import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  Group,
  GroupActivity,
  GroupService,
} from '../../services/group.service';
import { User, UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { DialogComponent } from '../dialog/dialog.component';
import {
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  take,
} from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { Activity, ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DialogComponent,
    HeaderComponent,
    FooterComponent,
  ],
  templateUrl: './groups.component.html',
})
export class GroupsComponent implements OnInit, OnDestroy {
  // Group data
  ownedGroups: Group[] = [];
  memberGroups: Group[] = [];
  addedGroups: Group[] = []; // used in HTML for joined-groups
  currentGroup: Group | null = null;
  groupActivities: GroupActivity[] = [];

  // UI state
  isLoading = true;
  isSubmitting = false;
  activeTab = 'my-groups'; // 'my-groups', 'joined-groups', 'group-details'
  groupDetailsTab = 'activities'; // 'activities', 'members'

  // Forms
  createGroupForm!: FormGroup;
  editGroupForm!: FormGroup;
  activityForm!: FormGroup;
  editActivityForm!: FormGroup;

  // Modals
  showCreateGroupModal = false;
  showEditGroupModal = false;
  showAddMemberModal = false;
  showAddActivityModal = false;
  showDeleteGroupDialog = false;
  showEditActivityDialog = false;
  showDeleteActivityDialog = false;
  currentActivityId: number | null = null;

  // Error and success states
  errorMessage = '';
  successMessage = '';

  // Member search
  searchTerm = new Subject<string>();
  searchResults: User[] = [];
  isSearching = false;

  // Current user
  currentUser: User | null = null;
  private subscriptions: Subscription = new Subscription();

  // Activity management
  activities: Activity[] = [];
  currentActivity: GroupActivity | null = null;
  isLoadingActivities = false;
  
  // Cities
  availableCities: string[] = ['Paris', 'London', 'New York', 'Berlin', 'Rome'];
  selectedCity = 'Paris';

  // Fix the getValue error by using a string variable
  private searchTermLower = '';

  // Add a property to track the member to remove and the dialog state
  showDeleteMemberDialog = false;
  memberToRemove: { id: number; email: string } | null = null;

  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private authService: AuthService,
    private activityService: ActivityService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Get current user
    const userSub = this.authService.currentUser$
      .pipe(take(1))
      .subscribe((user) => {
        if (user) {
          this.currentUser = {
            id: user.id,
            email: user.email,
            roles: user.roles,
            enabled: true,
            accountNonLocked: true
          };
        }
      });
    this.subscriptions.add(userSub);

    // Initialize forms
    this.initForms();

    // Check route parameters for group ID
    const routeSub = this.route.params.subscribe((params) => {
      if (params['id']) {
        this.loadGroupDetails(Number(params['id']));
      } else {
        this.loadGroups();
      }
    });
    this.subscriptions.add(routeSub);

    // Setup search debounce
    const searchSub = this.searchTerm
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term.trim()) {
            return of([]);
          }
          this.isSearching = true;
          this.searchTermLower = term.toLowerCase();
          // Use getAllUsers instead of searchUsers and filter on the client side
          return this.userService.getAllUsers();
        })
      )
      .subscribe({
        next: (results) => {
          // Remove the current user and filter results that match the search term
          this.searchResults = results.filter(user => 
            user.id !== this.currentUser?.id && 
            (user.email.toLowerCase().includes(this.searchTermLower) ||
             (user.firstName && user.firstName.toLowerCase().includes(this.searchTermLower)) ||
             (user.lastName && user.lastName.toLowerCase().includes(this.searchTermLower)))
          );
          this.isSearching = false;
        },
        error: (err) => {
          console.error('Error getting users:', err);
          this.isSearching = false;
        },
      });
    this.subscriptions.add(searchSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }

  private initForms(): void {
    // Create group form
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });

    // Edit group form
    this.editGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });

    // Activity form
    this.activityForm = this.fb.group({
      activityId: ['', [Validators.required]],
      city: ['Paris', [Validators.required]],
      plannedDateStart: ['', [Validators.required]],
      plannedDateEnd: ['', [Validators.required]],
      allDayEvent: [false],
      additionalInfo: [''],
      meetingPoint: ['']
    });

    // Edit Activity form
    this.editActivityForm = this.fb.group({
      plannedDateStart: ['', [Validators.required]],
      plannedDateEnd: ['', [Validators.required]],
      allDayEvent: [false],
      additionalInfo: [''],
      meetingPoint: ['']
    });
  }

  private loadGroups(): void {
    this.isLoading = true;
    this.activeTab = 'my-groups';

    // Load user created groups
    const createdGroupsSub = this.groupService.getUserCreatedGroups().subscribe({
      next: (groups) => {
        this.ownedGroups = groups;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading owned groups:', error);
        this.errorMessage = 'Failed to load your groups.';
        this.isLoading = false;
      },
    });
    this.subscriptions.add(createdGroupsSub);

    // Load user member groups
    const memberGroupsSub = this.groupService.getUserMemberGroups().subscribe({
      next: (groups) => {
        this.memberGroups = groups;
        // Filter out groups where the user is the creator for the joined-groups tab
        if (this.currentUser) {
          this.addedGroups = groups.filter(group => 
            group.creator.id !== this.currentUser?.id
          );
        } else {
          this.addedGroups = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading member groups:', error);
        this.errorMessage = 'Failed to load groups you are a member of.';
        this.isLoading = false;
      },
    });
    this.subscriptions.add(memberGroupsSub);
  }

  private loadGroupDetails(groupId: number): void {
    this.isLoading = true;
    this.activeTab = 'group-details';

    // Load group details
    const groupSub = this.groupService.getGroupById(groupId).subscribe({
      next: (group) => {
        this.currentGroup = group;
        
        // Update edit form
        this.editGroupForm.patchValue({
          name: group.name,
          description: group.description,
        });
        
        // Load group activities
        this.loadGroupActivities(groupId);
      },
      error: (error) => {
        console.error('Error loading group details:', error);
        this.errorMessage = 'Failed to load group details.';
        this.isLoading = false;
        this.router.navigate(['/groups']);
      },
    });
    this.subscriptions.add(groupSub);
  }

  private loadGroupActivities(groupId: number): void {
    const activitiesSub = this.groupService.getGroupActivities(groupId).subscribe({
      next: (activities) => {
        this.groupActivities = activities;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading group activities:', error);
        this.errorMessage = 'Failed to load group activities.';
        this.isLoading = false;
      },
    });
    this.subscriptions.add(activitiesSub);
  }

  // ------ Tab Navigation ------

  switchTab(tab: string): void {
    this.activeTab = tab;

    if (tab === 'my-groups' || tab === 'joined-groups') {
      this.currentGroup = null;
    }
  }

  switchGroupTab(tab: 'activities' | 'members'): void {
    this.groupDetailsTab = tab;
  }

  navigateToGroupDetails(group: Group): void {
    this.router.navigate(['/groups', group.id]);
  }

  goBackToGroups(): void {
    this.router.navigate(['/groups']);
  }

  // ------ Group Management ------

  onCreateGroup(): void {
    if (this.createGroupForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const groupData = {
      name: this.createGroupForm.get('name')?.value,
      description: this.createGroupForm.get('description')?.value
    };

    this.groupService.createGroup(groupData).subscribe({
      next: (group) => {
        this.ownedGroups = [...this.ownedGroups, group];
        this.successMessage = 'Group created successfully!';
        this.isSubmitting = false;
        this.showCreateGroupModal = false;
        this.createGroupForm.reset();
      },
      error: (error) => {
        console.error('Error creating group:', error);
        this.errorMessage = 'Failed to create group. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  onUpdateGroup(): void {
    if (this.editGroupForm.invalid || !this.currentGroup) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const groupData = {
      name: this.editGroupForm.get('name')?.value,
      description: this.editGroupForm.get('description')?.value
    };

    this.groupService
      .updateGroup(this.currentGroup.id, groupData)
      .subscribe({
        next: (group) => {
          this.currentGroup = group;
          this.successMessage = 'Group updated successfully!';
          this.isSubmitting = false;
          this.showEditGroupModal = false;
        },
        error: (error) => {
          console.error('Error updating group:', error);
          this.errorMessage = 'Failed to update group. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  onDeleteGroup(): void {
    if (!this.currentGroup) {
      return;
    }

    this.showDeleteGroupDialog = true;
  }

  confirmDeleteGroup(): void {
    if (!this.currentGroup) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService.deleteGroup(this.currentGroup.id).subscribe({
      next: () => {
        this.successMessage = 'Group deleted successfully!';
        this.isSubmitting = false;
        this.showDeleteGroupDialog = false;
        this.router.navigate(['/groups']);
      },
      error: (error) => {
        console.error('Error deleting group:', error);
        this.errorMessage = 'Failed to delete group. Please try again.';
        this.isSubmitting = false;
        this.showDeleteGroupDialog = false;
      },
    });
  }

  cancelDeleteGroup(): void {
    this.showDeleteGroupDialog = false;
  }

  // ------ Member Management ------

  onSearchMembers(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.next(target.value);
    this.searchTermLower = target.value.toLowerCase();
  }

  onAddMember(email: string): void {
    if (!this.currentGroup) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    // Find user by email from searchResults
    const user = this.searchResults.find(u => u.email === email);
    if (!user) {
      this.errorMessage = 'User not found.';
      this.isSubmitting = false;
      return;
    }

    this.groupService
      .addUserToGroup(this.currentGroup.id, user.id)
      .subscribe({
        next: (group) => {
          this.currentGroup = group;
          this.successMessage = 'Member added successfully!';
          this.isSubmitting = false;
          this.showAddMemberModal = false;
          this.searchResults = [];
        },
        error: (error) => {
          console.error('Error adding member:', error);
          this.errorMessage = 'Failed to add member. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  onRemoveMember(email: string): void {
    if (!this.currentGroup) {
      return;
    }

    // Find user by email from currentGroup.members
    const member = this.currentGroup.members.find(m => m.email === email);
    if (!member) {
      this.errorMessage = 'Member not found.';
      return;
    }

    // Set the member to remove and show the dialog
    this.memberToRemove = { id: member.id, email: member.email };
    this.showDeleteMemberDialog = true;
  }

  onConfirmRemoveMember(): void {
    if (!this.currentGroup || !this.memberToRemove) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService
      .removeUserFromGroup(this.currentGroup.id, this.memberToRemove.id)
      .subscribe({
        next: (group) => {
          this.currentGroup = group;
          this.successMessage = 'Member removed successfully!';
          this.isSubmitting = false;
          this.showDeleteMemberDialog = false;
          this.memberToRemove = null;
        },
        error: (error) => {
          console.error('Error removing member:', error);
          this.errorMessage = 'Failed to remove member. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  cancelRemoveMember(): void {
    this.showDeleteMemberDialog = false;
    this.memberToRemove = null;
  }

  // ------ Activity Management ------

  openAddActivityModal(): void {
    // Check if the current user is the creator of the group
    if (!this.currentGroup || !this.isGroupCreator(this.currentGroup)) {
      this.errorMessage = 'Only the group creator can add activities';
      return;
    }

    this.selectedCity = 'Paris';
    this.loadActivities(this.selectedCity);
    this.showAddActivityModal = true;

    // Set minimum date to today
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm

    // Reset form with today as minimum date
    this.activityForm.reset({
      activityId: '',
      city: this.selectedCity,
      plannedDateStart: todayStr,
      plannedDateEnd: todayStr,
      allDayEvent: false,
      additionalInfo: '',
      meetingPoint: ''
    });
  }

  onCityChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCity = select.value;
    this.loadActivities(this.selectedCity);
    
    // Update the city in the form
    this.activityForm.patchValue({ city: this.selectedCity });
  }

  private loadActivities(city: string): void {
    this.isLoadingActivities = true;

    this.activityService.getActivitiesByCity(city).subscribe({
      next: (response) => {
        this.activities = response.activities;
        this.isLoadingActivities = false;
      },
      error: (error) => {
        console.error('Error loading activities:', error);
        this.errorMessage = 'Failed to load activities. Please try again.';
        this.isLoadingActivities = false;
      },
    });
  }

  onAddActivity(): void {
    if (this.activityForm.invalid || !this.currentGroup) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const activityData = {
      activityId: this.activityForm.get('activityId')?.value,
      plannedDateStart: this.activityForm.get('plannedDateStart')?.value,
      plannedDateEnd: this.activityForm.get('plannedDateEnd')?.value,
      allDayEvent: this.activityForm.get('allDayEvent')?.value || false,
      additionalInfo: this.activityForm.get('additionalInfo')?.value,
      meetingPoint: this.activityForm.get('meetingPoint')?.value
    };

    this.groupService
      .addActivityToGroup(this.currentGroup.id, activityData)
      .subscribe({
        next: () => {
          // Reload the group activities
          this.loadGroupActivities(this.currentGroup!.id);
          this.successMessage = 'Activity added successfully! The activity will appear in your calendar.';
          this.isSubmitting = false;
          this.showAddActivityModal = false;
          this.activityForm.reset();
        },
        error: (error) => {
          console.error('Error adding activity:', error);
          this.errorMessage = error.message || 'Failed to add activity. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  onUpdateActivityDate(activityId: number): void {
    if (!this.currentGroup) {
      return;
    }

    const activity = this.groupActivities.find(a => a.id === activityId);
    if (!activity) {
      this.errorMessage = 'Activity not found';
      return;
    }

    this.currentActivity = activity;
    this.currentActivityId = activityId;

    // Convert dates to local ISO string format for datetime-local input
    const startDate = new Date(activity.plannedDateStart);
    const endDate = new Date(activity.plannedDateEnd);

    this.editActivityForm.patchValue({
      plannedDateStart: startDate.toISOString().slice(0, 16),
      plannedDateEnd: endDate.toISOString().slice(0, 16),
      allDayEvent: activity.allDayEvent || false,
      additionalInfo: activity.additionalInfo || '',
      meetingPoint: activity.meetingPoint || ''
    });

    this.showEditActivityDialog = true;
  }

  onConfirmUpdateActivity(): void {
    if (this.editActivityForm.invalid || !this.currentGroup || !this.currentActivityId) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const activityData = {
      activityId: this.currentActivity?.activityId, // Preserve the original activityId
      plannedDateStart: this.editActivityForm.get('plannedDateStart')?.value,
      plannedDateEnd: this.editActivityForm.get('plannedDateEnd')?.value,
      allDayEvent: this.editActivityForm.get('allDayEvent')?.value || false,
      additionalInfo: this.editActivityForm.get('additionalInfo')?.value || '',
      meetingPoint: this.editActivityForm.get('meetingPoint')?.value || ''
    };

    this.groupService
      .updateGroupActivity(this.currentGroup.id, this.currentActivityId, activityData)
      .subscribe({
        next: () => {
          // Update the activity in the list
          this.loadGroupActivities(this.currentGroup!.id);
          this.successMessage = 'Activity updated successfully!';
          this.isSubmitting = false;
          this.showEditActivityDialog = false;
          this.currentActivityId = null;
          this.currentActivity = null;
        },
        error: (error) => {
          console.error('Error updating activity:', error);
          this.errorMessage = 'Failed to update activity. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  onDeleteActivity(activityId: number): void {
    if (!this.currentGroup) {
      return;
    }

    const activity = this.groupActivities.find(a => a.id === activityId);
    if (!activity) {
      this.errorMessage = 'Activity not found';
      return;
    }

    this.currentActivity = activity;
    this.currentActivityId = activityId;
    this.showDeleteActivityDialog = true;
  }

  onConfirmDeleteActivity(): void {
    if (!this.currentGroup || !this.currentActivityId) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService
      .removeActivityFromGroup(this.currentGroup.id, this.currentActivityId)
      .subscribe({
        next: () => {
          // Remove the activity from the list
          this.groupActivities = this.groupActivities.filter(a => a.id !== this.currentActivityId);
          this.successMessage = 'Activity deleted successfully!';
          this.isSubmitting = false;
          this.showDeleteActivityDialog = false;
          this.currentActivityId = null;
          this.currentActivity = null;
        },
        error: (error) => {
          console.error('Error deleting activity:', error);
          this.errorMessage = 'Failed to delete activity. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  cancelDeleteActivity(): void {
    this.showDeleteActivityDialog = false;
    this.currentActivityId = null;
    this.currentActivity = null;
  }

  // ------ Modal Management ------

  openCreateGroupModal(): void {
    this.createGroupForm.reset();
    this.showCreateGroupModal = true;
  }

  openEditGroupModal(): void {
    if (this.currentGroup) {
      this.editGroupForm.patchValue({
        name: this.currentGroup.name,
        description: this.currentGroup.description,
      });
      this.showEditGroupModal = true;
    }
  }

  openAddMemberModal(): void {
    this.searchResults = [];
    this.showAddMemberModal = true;
  }

  closeModal(modalType: string): void {
    switch (modalType) {
      case 'create':
        this.showCreateGroupModal = false;
        break;
      case 'edit':
        this.showEditGroupModal = false;
        break;
      case 'member':
        this.showAddMemberModal = false;
        break;
      case 'activity':
        this.showAddActivityModal = false;
        break;
      case 'delete':
        this.showDeleteGroupDialog = false;
        break;
      case 'edit-activity':
        this.showEditActivityDialog = false;
        break;
      case 'delete-activity':
        this.showDeleteActivityDialog = false;
        break;
      case 'delete-member':
        this.showDeleteMemberDialog = false;
        this.memberToRemove = null;
        break;
    }
  }

  // ------ Utilities ------

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatDate(date: string | number[] | null | undefined): string {
    if (!date) return 'N/A';

    try {
      // Handle array format [year, month, day, hour, minute, second, nano]
      if (Array.isArray(date) && date.length >= 7) {
        const [year, month, day, hour, minute] = date;
        // Note: Month in JS Date is 0-indexed, but our API returns 1-indexed month
        const dateObj = new Date(year, month - 1, day, hour, minute);
        return dateObj.toLocaleString();
      }
      
      // Handle string format
      if (typeof date === 'string') {
        // If the date is in the format "2025-04-16 20:25:00"
        if (date.includes('-') && date.includes(':')) {
          const [datePart, timePart] = date.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          const dateObj = new Date(year, month - 1, day, hour, minute, second);
          return dateObj.toLocaleString();
        }
        
        // Handle ISO format or other string formats
        const dateObj = new Date(date);
        return dateObj.toLocaleString();
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'Invalid date';
    }
  }

  isGroupCreator(group: Group): boolean {
    return this.currentUser?.id === group.creator.id;
  }

  isGroupOwner(group: Group): boolean {
    return this.isGroupCreator(group);
  }

  canManageGroup(group: Group): boolean {
    return this.isGroupCreator(group);
  }

  getCurrentUserEmail(): string {
    return this.currentUser?.email || '';
  }

  getUserEmail(): string {
    return this.getCurrentUserEmail();
  }

  isUserInGroup(email: string): boolean {
    if (!this.currentGroup || !this.currentGroup.members) {
      return false;
    }
    return this.currentGroup.members.some(member => member.email === email);
  }

  getActivityImage(activity: GroupActivity): string | null {
    // Check if activity has images from the API response structure
    if (activity && 
        activity.activity && 
        typeof activity.activity === 'object' && 
        activity.activity.images && 
        Array.isArray(activity.activity.images) && 
        activity.activity.images.length > 0) {
      return activity.activity.images[0];
    }
    return null;
  }

  navigateToActivityDetails(activity: GroupActivity): void {
    if (!activity || !activity.activityId) return;

    // Navigate to the activity details page
    this.router.navigate(['/activities', activity.activityId]);
  }

  hasError(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(form: FormGroup, controlName: string): string {
    const control = form.get(controlName);

    if (!control) return '';

    if (control.hasError('required')) {
      return 'This field is required';
    }

    if (control.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `Minimum length is ${minLength} characters`;
    }

    return 'Invalid input';
  }
}
