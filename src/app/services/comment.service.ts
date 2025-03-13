import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Comment {
  id: number;
  activityId: number;
  user: string;
  text: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  // Fake data for comments
  private mockComments: Comment[] = [
    {
      id: 1,
      activityId: 1,
      user: 'user@example.com',
      text: 'Great activity for the whole family! We had a wonderful time exploring the trails.',
      timestamp: '2025-02-15T14:30:00',
    },
    {
      id: 2,
      activityId: 1,
      user: 'jane@example.com',
      text: 'The views were amazing. Make sure to bring plenty of water though!',
      timestamp: '2025-02-20T09:15:00',
    },
    {
      id: 3,
      activityId: 2,
      user: 'parent@example.com',
      text: 'My kids loved the interactive exhibits. We spent the whole day there!',
      timestamp: '2025-02-18T16:45:00',
    },
    {
      id: 4,
      activityId: 3,
      user: 'beachlover@example.com',
      text: 'Perfect beach day activity. The sandcastle competition was so much fun!',
      timestamp: '2025-03-10T11:20:00',
    },
  ];

  private nextId = 5;

  constructor() {}

  // Get comments for a specific activity
  getCommentsByActivityId(activityId: number): Observable<Comment[]> {
    const comments = this.mockComments.filter(
      (comment) => comment.activityId === activityId
    );
    return of(comments).pipe(delay(300)); // Simulate API delay
  }

  // Add a new comment
  addComment(
    activityId: number,
    user: string,
    text: string
  ): Observable<Comment> {
    const newComment: Comment = {
      id: this.nextId++,
      activityId,
      user,
      text,
      timestamp: new Date().toISOString(),
    };

    this.mockComments.push(newComment);
    return of(newComment).pipe(delay(300)); // Simulate API delay
  }

  // Format timestamp for display
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
