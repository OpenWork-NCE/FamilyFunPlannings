import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css'],
})
export class DialogComponent {
  @Input() title: string = '';
  @Input() showDialog: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Output() closeDialog = new EventEmitter<void>();

  // Size mapping with responsive classes
  get dialogSizeClass(): string {
    const baseClasses = 'mx-auto min-w-[320px]';
    switch (this.size) {
      case 'sm':
        return `${baseClasses} sm:max-w-sm`;
      case 'md':
        return `${baseClasses} sm:max-w-md`;
      case 'lg':
        return `${baseClasses} sm:max-w-lg`;
      case 'xl':
        return `${baseClasses} sm:max-w-xl`;
      default:
        return `${baseClasses} sm:max-w-md`;
    }
  }

  onClose(): void {
    this.closeDialog.emit();
  }

  // Prevent clicks inside the dialog from closing it
  onDialogClick(event: Event): void {
    event.stopPropagation();
  }
}
