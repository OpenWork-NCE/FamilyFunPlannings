import { Component, Input, Output, EventEmitter, HostListener, ElementRef, AfterViewInit, OnDestroy, ViewChild, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css'],
  animations: [
    trigger('dialogAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class DialogComponent implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() showDialog = false;
  @Input() size: DialogSize = 'md';
  @Input() dismissOnEscape = true;
  @Input() dismissOnOutsideClick = true;
  @Input() showCloseButton = true;
  @Input() scrollLock = true;
  
  @Output() closeDialog = new EventEmitter<void>();
  
  @ViewChild('dialogContent') dialogContent!: ElementRef;
  @ViewChild('closeButton') closeButton!: ElementRef;
  
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private bodyOverflowOriginal = '';
  private isBrowser: boolean;
  
  isClosing = signal(false);

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
      case 'full':
        return `${baseClasses} sm:max-w-3xl md:max-w-4xl lg:max-w-6xl w-[calc(100%-2rem)]`;
      default:
        return `${baseClasses} sm:max-w-md`;
    }
  }

  constructor(
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  
  ngAfterViewInit(): void {
    if (this.showDialog && this.isBrowser) {
      this.initializeDialog();
    }
  }
  
  ngOnChanges(): void {
    if (!this.isBrowser) return;
    
    if (this.showDialog) {
      this.initializeDialog();
      if (this.scrollLock) {
        this.lockBodyScroll();
      }
    } else {
      this.restoreBodyScroll();
    }
  }
  
  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.restoreBodyScroll();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.showDialog || !this.isBrowser) return;
    
    // Handle escape key
    if (event.key === 'Escape' && this.dismissOnEscape) {
      this.close();
    }
    
    // Handle tab key for focus trapping
    if (event.key === 'Tab') {
      this.handleTabKey(event);
    }
  }

  onClose(): void {
    if (this.dismissOnOutsideClick && !this.isClosing()) {
      this.close();
    }
  }
  
  close(): void {
    this.isClosing.set(true);
    // Slight delay to allow animation to complete
    setTimeout(() => {
      this.closeDialog.emit();
      this.isClosing.set(false);
      if (this.isBrowser) {
        this.restoreFocus();
        this.restoreBodyScroll();
      }
    }, 150);
  }

  // Prevent clicks inside the dialog from closing it
  onDialogClick(event: Event): void {
    event.stopPropagation();
  }
  
  private initializeDialog(): void {
    if (!this.isBrowser) return;
    
    setTimeout(() => {
      this.saveFocus();
      this.findFocusableElements();
      this.setInitialFocus();
    });
  }
  
  private saveFocus(): void {
    if (!this.isBrowser) return;
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
  }
  
  private restoreFocus(): void {
    if (!this.isBrowser) return;
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }
  }
  
  private findFocusableElements(): void {
    if (!this.dialogContent || !this.isBrowser) return;
    
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(
      this.dialogContent.nativeElement.querySelectorAll(selector)
    ) as HTMLElement[];
  }
  
  private setInitialFocus(): void {
    if (!this.isBrowser) return;
    
    if (this.closeButton) {
      this.closeButton.nativeElement.focus();
    } else if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }
  
  private handleTabKey(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0 || !this.isBrowser) return;
    
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    
    if (event.shiftKey) {
      // If shift+tab and first element is active, wrap to last element
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // If tab and last element is active, wrap to first element
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }
  
  private lockBodyScroll(): void {
    if (!this.isBrowser) return;
    
    this.bodyOverflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  
  private restoreBodyScroll(): void {
    if (!this.isBrowser) return;
    
    document.body.style.overflow = this.bodyOverflowOriginal;
  }
}
