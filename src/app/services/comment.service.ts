import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Comment {
  id: number;
  activityId: string;
  content: string;
  userId: number;
  userEmail: string;
  user?: {
    id: number;
    email: string;
    profilePictureUrl: string | null;
  };
  createdDate: string;
  updatedDate: string;
  isEditing?: boolean; // UI state for edit mode
}

export type TimestampType = string | number | Date | unknown;

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private apiUrl = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  // Get comments for a specific activity
  getCommentsByActivityId(activityId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/${activityId}/comments`).pipe(
      catchError(error => {
        console.error('[CommentService] Error fetching comments:', error);
        return throwError(() => new Error('Failed to fetch comments'));
      })
    );
  }

  // Add a new comment
  addComment(activityId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/${activityId}/comments`, { content }).pipe(
      // Ensure createdDate and updatedDate are in string format
      map(comment => ({
        ...comment,
        createdDate: comment.createdDate ? String(comment.createdDate) : new Date().toISOString(),
        updatedDate: comment.updatedDate ? String(comment.updatedDate) : new Date().toISOString()
      })),
      catchError(error => {
        console.error('[CommentService] Error adding comment:', error);
        return throwError(() => new Error('Failed to add comment'));
      })
    );
  }

  // Update a comment
  updateComment(commentId: number, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.apiUrl}/comments/${commentId}`, { content }).pipe(
      // Ensure createdDate and updatedDate are in string format
      map(comment => ({
        ...comment,
        createdDate: comment.createdDate ? String(comment.createdDate) : new Date().toISOString(),
        updatedDate: comment.updatedDate ? String(comment.updatedDate) : new Date().toISOString()
      })),
      catchError(error => {
        console.error('[CommentService] Error updating comment:', error);
        return throwError(() => new Error('Failed to update comment'));
      })
    );
  }

  // Delete a comment
  deleteComment(commentId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/comments/${commentId}`).pipe(
      catchError(error => {
        console.error('[CommentService] Error deleting comment:', error);
        return throwError(() => new Error('Failed to delete comment'));
      })
    );
  }

  // Parse timestamp to Date object - handles multiple formats
  private parseTimestamp(timestamp: TimestampType): Date | null {
    try {
      // If timestamp is already a Date object
      if (timestamp instanceof Date) {
        return timestamp;
      }

      // If timestamp is a number (milliseconds)
      if (typeof timestamp === 'number') {
        return new Date(timestamp);
      }

      // Convert to string if not already
      const timestampStr = String(timestamp);
      
      // If timestamp is in ISO format
      if (timestampStr.includes('T') || timestampStr.includes('Z')) {
        return new Date(timestampStr);
      }
      
      // If timestamp is in "YYYY-MM-DD HH:MM:SS" format
      if (timestampStr.includes('-') && timestampStr.includes(':')) {
        const [datePart, timePart] = timestampStr.split(' ');
        if (!datePart || !timePart) {
          console.warn('[CommentService] Invalid date format:', timestampStr);
          return new Date(); // Fallback to current date
        }
        
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        // Month is 0-indexed in JavaScript Date
        return new Date(year, month - 1, day, hours, minutes, seconds);
      }
      
      // Try direct parsing as a last resort
      const date = new Date(timestampStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      console.warn('[CommentService] Could not parse timestamp:', timestamp);
      return new Date(); // Fallback to current date
    } catch (error) {
      console.error('[CommentService] Error parsing timestamp:', error, 'Original value:', timestamp);
      return new Date(); // Fallback to current date
    }
  }

  // Format timestamp for display - handle multiple formats
  formatTimestamp(timestamp: TimestampType): string {
    try {
      if (!timestamp) return 'Unknown date';
      
      const date = this.parseTimestamp(timestamp);
      if (!date) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('[CommentService] Error formatting timestamp:', error);
      return 'Error formatting date';
    }
  }
  
  // Get relative time (e.g. "2 hours ago")
  getRelativeTime(timestamp: TimestampType): string {
    try {
      if (!timestamp) return 'Unknown';
      
      const date = this.parseTimestamp(timestamp);
      if (!date) return 'Invalid date';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) return `${diffSecs} seconds ago`;
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      
      // Fall back to formatted date for older dates
      return this.formatTimestamp(timestamp);
    } catch (error) {
      console.error('[CommentService] Error calculating relative time:', error, 'Original value:', timestamp);
      return 'Just now'; // Fallback
    }
  }
}
