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
import { UserProfile, UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { DialogComponent } from '../dialog/dialog.component';
import {
  BehaviorSubject,
  Observable,
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
  addedGroups: Group[] = [];
  currentGroup: Group | null = null;

  // UI state
  isLoading = true;
  isSubmitting = false;
  activeTab = 'my-groups'; // 'my-groups', 'joined-groups', 'group-details'
  groupDetailsTab = 'activities'; // 'activities', 'members'

  // Forms
  createGroupForm!: FormGroup;
  editGroupForm!: FormGroup;
  activityForm!: FormGroup;

  // Modals
  showCreateGroupModal = false;
  showEditGroupModal = false;
  showAddMemberModal = false;
  showAddActivityModal = false;

  // Error and success states
  errorMessage = '';
  successMessage = '';

  // Member search
  searchTerm = new Subject<string>();
  searchResults: UserProfile[] = [];
  isSearching = false;

  // Current user
  private currentUserEmail: string = '';
  private subscriptions: Subscription = new Subscription();

  // Activity management
  activities: Activity[] = [];
  isLoadingActivities = false;

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

    // Get current user email
    const userSub = this.authService.currentUser$
      .pipe(take(1))
      .subscribe((user) => {
        this.currentUserEmail = user?.email || '';
      });
    this.subscriptions.add(userSub);

    // Initialize forms
    this.initForms();

    // Check route parameters for group ID
    const routeSub = this.route.params.subscribe((params) => {
      if (params['id']) {
        this.loadGroupDetails(params['id']);
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
          return this.userService.searchUsers(term);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearching = false;
        },
        error: (err) => {
          console.error('Error searching users:', err);
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
      scheduledDate: ['', [Validators.required]],
    });
  }

  private loadGroups(): void {
    this.isLoading = true;
    this.activeTab = 'my-groups';

    // Load owned groups
    this.groupService.getOwnedGroups().subscribe({
      next: (groups) => {
        this.ownedGroups = groups;

        // Load added groups
        this.groupService.getAddedGroups().subscribe({
          next: (addedGroups) => {
            this.addedGroups = addedGroups;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading added groups:', error);
            this.errorMessage = 'Failed to load groups you are a member of.';
            this.isLoading = false;
          },
        });
      },
      error: (error) => {
        console.error('Error loading owned groups:', error);
        this.errorMessage = 'Failed to load your groups.';
        this.isLoading = false;
      },
    });
  }

  private loadGroupDetails(groupId: string): void {
    this.isLoading = true;
    this.activeTab = 'group-details';

    this.groupService.getGroupById(groupId).subscribe({
      next: (group) => {
        if (!group) {
          this.errorMessage = 'Group not found.';
          this.isLoading = false;
          this.router.navigate(['/groups']);
          return;
        }

        this.currentGroup = group;

        // Update edit form
        this.editGroupForm.patchValue({
          name: group.name,
          description: group.description,
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading group details:', error);
        this.errorMessage = 'Failed to load group details.';
        this.isLoading = false;
        this.router.navigate(['/groups']);
      },
    });
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

    this.groupService.createGroup(this.createGroupForm.value).subscribe({
      next: (group) => {
        this.ownedGroups.push(group);
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

    this.groupService
      .updateGroup(this.currentGroup.id, this.editGroupForm.value)
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

    if (
      !confirm(
        `Are you sure you want to delete the group "${this.currentGroup.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService.deleteGroup(this.currentGroup.id).subscribe({
      next: () => {
        this.successMessage = 'Group deleted successfully!';
        this.isSubmitting = false;
        this.router.navigate(['/groups']);
      },
      error: (error) => {
        console.error('Error deleting group:', error);
        this.errorMessage = 'Failed to delete group. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  // ------ Member Management ------

  onSearchMembers(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.next(target.value);
  }

  onAddMember(userEmail: string): void {
    if (!this.currentGroup) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService
      .addGroupMember(this.currentGroup.id, userEmail)
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

  onRemoveMember(userEmail: string): void {
    if (!this.currentGroup) {
      return;
    }

    if (
      !confirm('Are you sure you want to remove this member from the group?')
    ) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService
      .removeGroupMember(this.currentGroup.id, userEmail)
      .subscribe({
        next: (group) => {
          this.currentGroup = group;
          this.successMessage = 'Member removed successfully!';
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error removing member:', error);
          this.errorMessage = 'Failed to remove member. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  // ------ Activity Management ------

  openAddActivityModal(): void {
    // Check if the current user is the owner of the group
    if (
      !this.currentGroup ||
      this.currentGroup.owner !== this.currentUserEmail
    ) {
      this.errorMessage = 'Only the group owner can add activities';
      return;
    }

    this.loadActivities();
    this.showAddActivityModal = true;

    // Set minimum date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Reset form with today as minimum date
    this.activityForm.reset({
      activityId: '',
      scheduledDate: todayStr,
    });
  }

  private loadActivities(): void {
    this.isLoadingActivities = true;

    this.activityService.getActivities().subscribe({
      next: (activities) => {
        this.activities = activities;
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

    const activityId = Number(this.activityForm.get('activityId')?.value);
    let scheduledDate = this.activityForm.get('scheduledDate')?.value;

    // Ensure scheduledDate is a valid date string in ISO format
    if (scheduledDate) {
      try {
        // Convert to Date object first to validate
        const scheduledDateObj = new Date(scheduledDate);

        if (isNaN(scheduledDateObj.getTime())) {
          this.errorMessage =
            'Invalid date format. Please select a valid date.';
          this.isSubmitting = false;
          return;
        }

        // Format as ISO string for storage
        scheduledDate = scheduledDateObj.toISOString();
        console.log('Formatted scheduled date:', scheduledDate);
      } catch (error) {
        this.errorMessage = 'Error processing date. Please try again.';
        this.isSubmitting = false;
        console.error('Date parsing error:', error);
        return;
      }
    } else {
      this.errorMessage =
        'A scheduled date is required for activities to appear in the calendar.';
      this.isSubmitting = false;
      return;
    }

    this.groupService
      .addActivityToGroup(this.currentGroup.id, activityId, scheduledDate)
      .subscribe({
        next: (groupActivity) => {
          // Reload the group to get the updated activities
          this.loadGroupDetails(this.currentGroup!.id);
          this.successMessage =
            'Activity added successfully! The activity will appear in your calendar.';
          this.isSubmitting = false;
          this.showAddActivityModal = false;
          this.activityForm.reset();
        },
        error: (error) => {
          console.error('Error adding activity:', error);
          this.errorMessage =
            error.message || 'Failed to add activity. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  onUpdateActivityDate(activityId: string): void {
    if (!this.currentGroup) {
      return;
    }

    const activity = this.currentGroup.activities.find(
      (a) => a.id === activityId
    );
    if (!activity) {
      this.errorMessage = 'Activity not found';
      return;
    }

    // Create a form just for updating the date
    const updateForm = this.fb.group({
      scheduledDate: [activity.plannedDate, [Validators.required]],
    });

    // Show a dialog for updating the date
    // This would be implemented with a dialog component
    // For now, we'll just use a prompt
    const newDateStr = prompt(
      'Enter new date (YYYY-MM-DD):',
      activity.plannedDate
        ? new Date(activity.plannedDate).toISOString().split('T')[0]
        : ''
    );

    if (!newDateStr) {
      return; // User cancelled
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService
      .updateGroupActivityDate(this.currentGroup.id, activityId, newDateStr)
      .subscribe({
        next: (group) => {
          this.currentGroup = group;
          this.successMessage = 'Activity date updated successfully!';
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error updating activity date:', error);
          this.errorMessage =
            error.message ||
            'Failed to update activity date. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  onDeleteActivity(activityId: string): void {
    if (!this.currentGroup) {
      return;
    }

    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    this.groupService
      .deleteGroupActivity(this.currentGroup.id, activityId)
      .subscribe({
        next: (group) => {
          this.currentGroup = group;
          this.successMessage = 'Activity deleted successfully!';
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error deleting activity:', error);
          this.errorMessage = 'Failed to delete activity. Please try again.';
          this.isSubmitting = false;
        },
      });
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
    }
  }

  // ------ Utilities ------

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';

    const dateObj = new Date(date);
    return dateObj.toLocaleString();
  }

  isGroupOwner(group: Group): boolean {
    return this.currentUserEmail === group.owner;
  }

  canManageGroup(group: Group): boolean {
    return this.isGroupOwner(group);
  }

  getUserEmail(): string {
    return this.currentUserEmail;
  }

  getActivityImage(activity: GroupActivity): string | undefined {
    if (!activity || !activity.activityId) return undefined;

    const fullActivity = this.activityService.getActivityByIdSync(
      activity.activityId
    );
    if (fullActivity && fullActivity.images && fullActivity.images.length > 0) {
      return fullActivity.images[0]; // Return the first image
    }

    return undefined; // Return undefined if no images are available
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
      return `Minimum length is ${
        control.getError('minlength').requiredLength
      } characters`;
    }

    return 'Invalid input';
  }
}
