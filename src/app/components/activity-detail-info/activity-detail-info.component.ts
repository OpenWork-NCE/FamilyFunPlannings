import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../services/activity.service';

@Component({
  selector: 'app-activity-detail-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-detail-info.component.html',
  styleUrls: ['./activity-detail-info.component.css'],
})
export class ActivityDetailInfoComponent {
  @Input() activity?: Activity;

  // Track which sections are expanded (for mobile view)
  expandedSections: { [key: string]: boolean } = {
    description: true,
    details: true,
    additionalInfo: true,
  };

  toggleSection(section: string): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }
}
