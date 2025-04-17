import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommentService, Comment } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  selector: 'app-comment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DialogComponent],
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.css'],
})
export class CommentComponent implements OnInit, OnDestroy {
  @Input() activityId!: string;

  comments: Comment[] = [];
  commentForm!: FormGroup;
  editForm!: FormGroup;
  isSubmitting = false;
  isEditing = false;
  errorMessage = '';
  isLoggedIn = false;
  private destroy$ = new Subject<void>();
  
  // Dialog related properties
  showDeleteDialog = false;
  commentToDelete: number | null = null;

  constructor(
    private commentService: CommentService,
    public authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadComments();
    this.initForms();
    this.checkAuthStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadComments(): void {
    this.commentService.getCommentsByActivityId(this.activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comments) => {
          // Add isEditing flag to each comment
          this.comments = comments.map(comment => ({
            ...comment,
            isEditing: false
          }));
          console.log('[CommentComponent] Loaded comments:', comments.length);
        },
        error: (error) => {
          console.error('[CommentComponent] Error loading comments:', error);
          this.errorMessage = 'Failed to load comments. Please try again.';
        }
      });
  }

  private initForms(): void {
    // Form for adding new comments
    this.commentForm = this.fb.group({
      comment: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(500),
        ],
      ],
    });

    // Form for editing existing comments
    this.editForm = this.fb.group({
      content: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(500),
        ],
      ],
      commentId: [null]
    });
  }

  private checkAuthStatus(): void {
    this.isLoggedIn = this.authService.isAuthenticated() && !this.authService.isGuest();
  }

  onSubmit(): void {
    if (this.commentForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const commentText = this.commentForm.get('comment')?.value;

    this.commentService.addComment(this.activityId, commentText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newComment) => {
          console.log('[CommentComponent] Comment added successfully:', newComment);
          // Add UI editing state
          this.comments.unshift({
            ...newComment,
            isEditing: false
          });
          this.commentForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('[CommentComponent] Error adding comment:', error);
          this.errorMessage = 'Failed to add comment. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  startEditComment(comment: Comment): void {
    // Reset editing state for all comments
    this.comments.forEach(c => c.isEditing = false);
    
    // Set editing state for this comment
    const commentIndex = this.comments.findIndex(c => c.id === comment.id);
    if (commentIndex !== -1) {
      this.comments[commentIndex].isEditing = true;
      
      // Initialize edit form with current content
      this.editForm.patchValue({
        content: comment.content,
        commentId: comment.id
      });
    }
  }

  cancelEditComment(): void {
    // Reset editing state for all comments
    this.comments.forEach(c => c.isEditing = false);
  }

  submitEditComment(): void {
    if (this.editForm.invalid) {
      return;
    }

    const commentId = this.editForm.get('commentId')?.value;
    const content = this.editForm.get('content')?.value;
    
    if (!commentId) {
      console.error('[CommentComponent] Comment ID is missing for edit');
      return;
    }
    
    this.isSubmitting = true;
    
    this.commentService.updateComment(commentId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedComment) => {
          console.log('[CommentComponent] Comment updated successfully:', updatedComment);
          
          // Find and update the comment in the array
          const index = this.comments.findIndex(c => c.id === commentId);
          if (index !== -1) {
            this.comments[index] = {
              ...this.comments[index],
              ...updatedComment,
              isEditing: false
            };
          }
          
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('[CommentComponent] Error updating comment:', error);
          this.errorMessage = 'Failed to update comment. Please try again.';
          this.isSubmitting = false;
        }
      });
  }

  deleteComment(commentId: number): void {
    this.commentToDelete = commentId;
    this.showDeleteDialog = true;
  }
  
  // New method to confirm deletion through dialog
  confirmDeleteComment(): void {
    if (!this.commentToDelete) return;
    
    const commentId = this.commentToDelete;
    this.isSubmitting = true;
    
    this.commentService.deleteComment(commentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[CommentComponent] Comment deleted successfully');
          this.comments = this.comments.filter(comment => comment.id !== commentId);
          this.isSubmitting = false;
          this.closeDeleteDialog();
        },
        error: (error) => {
          console.error('[CommentComponent] Error deleting comment:', error);
          this.errorMessage = 'Failed to delete comment. Please try again.';
          this.isSubmitting = false;
          this.closeDeleteDialog();
        }
      });
  }
  
  // Method to close the delete dialog
  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.commentToDelete = null;
  }

  formatTimestamp(timestamp: string): string {
    return this.commentService.formatTimestamp(timestamp);
  }
  
  getRelativeTime(timestamp: string): string {
    return this.commentService.getRelativeTime(timestamp);
  }

  getUserInitial(email: string): string {
    return email ? email.charAt(0).toUpperCase() : 'A';
  }
  
  getUserEmail(comment: Comment): string {
    // Handle both direct userEmail and nested user.email
    return comment.user?.email || comment.userEmail || 'Anonymous';
  }
  
  isCurrentUserComment(comment: Comment): boolean {
    const currentEmail = this.authService.getCurrentUserEmail();
    const commentEmail = comment.user?.email || comment.userEmail;
    return currentEmail === commentEmail;
  }

  hasError(controlName: string, form: FormGroup = this.commentForm): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: string, form: FormGroup = this.commentForm): string {
    const control = form.get(controlName);

    if (!control) {
      return '';
    }

    if (control.hasError('required')) {
      return 'This field is required';
    }

    if (control.hasError('minlength')) {
      return `Comment must be at least ${
        control.getError('minlength').requiredLength
      } characters`;
    }

    if (control.hasError('maxlength')) {
      return `Comment cannot exceed ${
        control.getError('maxlength').requiredLength
      } characters`;
    }

    return '';
  }
  
  navigateToLogin(): void {
    this.router.navigate(['/login'], { 
      queryParams: { 
        returnUrl: this.router.url 
      } 
    });
  }
}
