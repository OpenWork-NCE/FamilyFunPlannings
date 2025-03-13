import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Comment, CommentService } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-comment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.css'],
})
export class CommentComponent implements OnInit {
  @Input() activityId!: number;

  comments: Comment[] = [];
  commentForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  isLoggedIn = false;

  constructor(
    private commentService: CommentService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadComments();
    this.initForm();
    this.checkAuthStatus();
  }

  private loadComments(): void {
    this.commentService
      .getCommentsByActivityId(this.activityId)
      .subscribe((comments) => {
        this.comments = comments;
      });
  }

  private initForm(): void {
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
  }

  private checkAuthStatus(): void {
    this.isLoggedIn =
      this.authService.isAuthenticated() && !this.authService.isGuest();
  }

  onSubmit(): void {
    if (this.commentForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const commentText = this.commentForm.get('comment')?.value;
    const userEmail =
      this.authService.getCurrentUserEmail() || 'anonymous@example.com';

    this.commentService
      .addComment(this.activityId, userEmail, commentText)
      .subscribe({
        next: (newComment) => {
          this.comments.unshift(newComment);
          this.commentForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to add comment. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  formatTimestamp(timestamp: string): string {
    return this.commentService.formatTimestamp(timestamp);
  }

  hasError(controlName: string): boolean {
    const control = this.commentForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.commentForm.get(controlName);

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
}
