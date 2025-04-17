import { Component, Output, EventEmitter, OnInit, OnDestroy, inject, signal, PLATFORM_ID, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity, ActivityService } from '../../services/activity.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of, catchError } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
})
export class SearchBarComponent implements OnInit, OnDestroy, OnChanges {
  private activityService = inject(ActivityService);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();
  private searchTerms$ = new Subject<string>();
  private isBrowser: boolean;
  
  @Input() selectedCity = 'Paris';
  searchTerm = '';
  
  // Using signals for reactive state
  suggestions = signal<Activity[]>([]);
  isLoading = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);
  recentSearches = signal<string[]>([]);
  cities = signal<string[]>([
    'Paris',
    'Marseille',
    'Lyon',
    'Toulouse',
    'Nice',
    'Nantes',
    'Strasbourg',
    'Montpellier',
    'Bordeaux',
  ]);

  @Output() searchPerformed = new EventEmitter<string>();
  @Output() cityChange = new EventEmitter<string>();
  @Output() openFilter = new EventEmitter<void>();
  @Output() activitySelected = new EventEmitter<Activity>();

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Initialize recent searches from localStorage (only in browser)
    if (this.isBrowser) {
      this.loadRecentSearches();
    }
    
    // Setup search with debounce
    this.searchTerms$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(term => {
        if (!term || term.length < 2) {
          this.suggestions.set([]);
          this.showSuggestions.set(false);
          return of([]);
        }
        
        this.isLoading.set(true);
        return this.activityService.searchActivities(term, this.selectedCity).pipe(
          catchError(() => {
            // Handle error gracefully
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.suggestions.set(results);
      this.showSuggestions.set(results.length > 0);
      this.isLoading.set(false);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If selectedCity changes from outside the component (like from filter panel),
    // we need to check if we need to update search results or other state
    if (changes['selectedCity'] && !changes['selectedCity'].firstChange) {
      if (this.searchTerm) {
        // If there's an active search, refresh results with new city
        this.searchTerms$.next(this.searchTerm);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) return;
    
    // Add to recent searches (only in browser)
    if (this.isBrowser) {
      this.addToRecentSearches(this.searchTerm);
    }
    
    // Emit search event to parent
    this.searchPerformed.emit(this.searchTerm);
    
    // Hide suggestions
    this.showSuggestions.set(false);
  }

  onInput(): void {
    this.searchTerms$.next(this.searchTerm);
  }

  onOpenFilter(): void {
    this.openFilter.emit();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.suggestions.set([]);
    this.showSuggestions.set(false);
    this.searchPerformed.emit('');
  }

  onSelectSuggestion(activity: Activity): void {
    this.searchTerm = activity.name;
    this.showSuggestions.set(false);
    this.activitySelected.emit(activity);
  }

  onSelectRecentSearch(term: string): void {
    this.searchTerm = term;
    this.onSearch();
  }

  onCityChange(city: string): void {
    this.selectedCity = city;
    this.cityChange.emit(city);
    if (this.searchTerm) {
      this.searchTerms$.next(this.searchTerm);
    }
  }

  onFocus(): void {
    // Show recent searches if no current suggestions
    if (!this.suggestions().length && this.recentSearches().length > 0) {
      this.showSuggestions.set(true);
    }
  }

  onBlur(): void {
    // Delay hiding suggestions to allow for clicks on them
    setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }

  private addToRecentSearches(term: string): void {
    if (!this.isBrowser) return;
    
    const searches = this.recentSearches();
    
    // Remove if already exists to move to top
    const filtered = searches.filter(s => s !== term);
    
    // Add to beginning and limit to 5 items
    const updated = [term, ...filtered].slice(0, 5);
    
    // Update signal and save to storage
    this.recentSearches.set(updated);
    this.saveRecentSearches(updated);
  }

  private loadRecentSearches(): void {
    if (!this.isBrowser) return;
    
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        this.recentSearches.set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  }

  private saveRecentSearches(searches: string[]): void {
    if (!this.isBrowser) return;
    
    try {
      localStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (e) {
      console.error('Error saving recent searches:', e);
    }
  }
}
