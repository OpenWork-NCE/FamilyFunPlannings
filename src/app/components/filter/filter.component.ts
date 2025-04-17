import { Component, Output, EventEmitter, Input, OnInit, OnChanges, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { ActivityFilter } from '../../services/activity.service';
import { trigger, transition, style, animate } from '@angular/animations';

interface CategoryOption {
  name: string;
  subcategories: string[];
}

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './filter.component.html',
  animations: [
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('filterPanelAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class FilterComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() currentFilter: ActivityFilter = {};
  @Output() closeFilter = new EventEmitter<void>();
  @Output() applyFilter = new EventEmitter<ActivityFilter>();
  @Output() resetFilter = new EventEmitter<void>();

  // Local filter state
  filterForm: FormGroup;
  
  // Selected category to show subcategories
  selectedCategory: string | null = null;
  selectedSubcategory: string | null = null;
  showSubcategories = false;
  
  // For scroll locking
  private bodyOverflowOriginal = '';
  private isBrowser: boolean;

  // Category options
  categoryOptions: CategoryOption[] = [
    {
      name: 'Culture & Histoire',
      subcategories: ['Musées', 'Sites historiques', 'Monuments', 'Sites religieux', 'Art & Culture']
    },
    {
      name: 'Nature & Plein air',
      subcategories: ['Parcs & Jardins', 'Plages & Plans d\'eau', 'Montagne & Forêt', 'Aires de loisirs', 'Points de vue']
    },
    {
      name: 'Sports & Fitness',
      subcategories: ['Centres sportifs', 'Sports nautiques', 'Sports de ballon', 'Golf', 'Sports d\'hiver', 'Fitness & Bien-être']
    },
    {
      name: 'Gastronomie',
      subcategories: ['Restaurants', 'Cafés & Salons de thé', 'Bars & Pubs', 'Restauration rapide', 'Marchés & Épiceries', 'Boulangeries & Pâtisseries']
    },
    {
      name: 'Divertissement',
      subcategories: ['Cinéma & Spectacles', 'Parcs d\'attractions', 'Vie nocturne', 'Zoos & Aquariums', 'Jeux & Loisirs']
    },
    {
      name: 'Shopping',
      subcategories: ['Centres commerciaux', 'Mode & Accessoires', 'Alimentation', 'Culture & Loisirs', 'Technologie', 'Beauté & Bien-être', 'Marchés & Artisanat']
    },
    {
      name: 'Hébergement',
      subcategories: ['Hôtels', 'Locations', 'Hébergements économiques', 'Campings', 'Refuges']
    },
    {
      name: 'Transport',
      subcategories: ['Transports publics', 'Transports partagés']
    },
    {
      name: 'Services',
      subcategories: ['Services financiers', 'Services de santé', 'Services publics', 'Information']
    },
    {
      name: 'Autre',
      subcategories: []
    }
  ];

  // 30 most popular cities in France
  popularCities: string[] = [
    'Paris',
    'Marseille',
    'Lyon',
    'Toulouse',
    'Nice',
    'Nantes',
    'Strasbourg',
    'Montpellier',
    'Bordeaux',
    'Lille',
    'Rennes',
    'Reims',
    'Saint-Étienne',
    'Toulon',
    'Le Havre',
    'Grenoble',
    'Dijon',
    'Angers',
    'Nîmes',
    'Villeurbanne',
    'Clermont-Ferrand',
    'Le Mans',
    'Aix-en-Provence',
    'Brest',
    'Tours',
    'Amiens',
    'Limoges',
    'Annecy',
    'Perpignan',
    'Besançon'
  ];

  // Accessibility options
  accessibilityOptions = [
    { value: 'full', label: 'Entièrement accessible' },
    { value: 'limited', label: 'Partiellement accessible' },
    { value: 'none', label: 'Non accessible' }
  ];

  // Price options
  priceOptions = [
    { value: 'free', label: 'Gratuit' },
    { value: 'paid', label: 'Payant' }
  ];

  // Custom city input
  customCity = '';
  showCustomCityInput = false;

  constructor(
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.filterForm = this.fb.group({
      category: [''],
      subcategory: [''],
      accessibility: [''],
      price: [''],
      city: ['Paris']
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  ngOnChanges(): void {
    if (this.currentFilter) {
      // Update form with current filter values
      this.filterForm.patchValue({
        category: this.currentFilter.category || '',
        subcategory: this.currentFilter.subcategory || '',
        accessibility: this.currentFilter.accessibility || '',
        price: this.currentFilter.price || '',
        city: this.currentFilter.city || 'Paris'
      });

      // Update selected category and subcategory for UI state
      if (this.currentFilter.category) {
        this.selectedCategory = this.currentFilter.category;
        this.showSubcategories = true;
        this.selectedSubcategory = this.currentFilter.subcategory || null;
      }
    }
    
    // Handle scroll locking when filter opens/closes
    if (this.isOpen && this.isBrowser) {
      this.lockBodyScroll();
    } else if (this.isBrowser) {
      this.restoreBodyScroll();
    }
  }
  
  ngOnDestroy(): void {
    // Ensure scroll is restored when component is destroyed
    if (this.isBrowser) {
      this.restoreBodyScroll();
    }
  }
  
  // Method to lock body scroll
  private lockBodyScroll(): void {
    if (!this.isBrowser) return;
    
    this.bodyOverflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  
  // Method to restore body scroll
  private restoreBodyScroll(): void {
    if (!this.isBrowser) return;
    
    document.body.style.overflow = this.bodyOverflowOriginal;
  }

  // Select a category and show its subcategories
  onCategorySelect(category: string): void {
    if (this.selectedCategory === category) {
      // Deselect if already selected
      this.selectedCategory = null;
      this.selectedSubcategory = null;
      this.showSubcategories = false;
      this.filterForm.patchValue({
        category: '',
        subcategory: ''
      });
    } else {
      this.selectedCategory = category;
      this.selectedSubcategory = null;
      this.showSubcategories = true;
      this.filterForm.patchValue({
        category: category,
        subcategory: ''
      });
    }
  }

  // Select a subcategory
  onSubcategorySelect(subcategory: string): void {
    if (this.selectedSubcategory === subcategory) {
      // Deselect if already selected
      this.selectedSubcategory = null;
      this.filterForm.patchValue({
        subcategory: ''
      });
    } else {
      this.selectedSubcategory = subcategory;
      this.filterForm.patchValue({
        subcategory: subcategory
      });
    }
  }

  // Get subcategories for selected category
  getSubcategories(): string[] {
    if (!this.selectedCategory) return [];
    const category = this.categoryOptions.find(c => c.name === this.selectedCategory);
    return category ? category.subcategories : [];
  }

  // Select a city from the popular cities list
  onCitySelect(city: string): void {
    this.customCity = '';
    this.showCustomCityInput = false;
    this.filterForm.patchValue({
      city: city
    });
  }

  // Toggle custom city input
  toggleCustomCityInput(): void {
    this.showCustomCityInput = !this.showCustomCityInput;
    if (!this.showCustomCityInput) {
      this.customCity = '';
    }
  }

  // Update city value when custom city is entered
  onCustomCityChange(): void {
    if (this.customCity.trim()) {
      this.filterForm.patchValue({
        city: this.customCity.trim()
      });
    }
  }

  // Select accessibility option
  onAccessibilitySelect(accessibility: string): void {
    const currentValue = this.filterForm.get('accessibility')?.value;
    
    if (currentValue === accessibility) {
      // Deselect if already selected
      this.filterForm.patchValue({
        accessibility: ''
      });
    } else {
      this.filterForm.patchValue({
        accessibility: accessibility
      });
    }
  }

  // Select price option
  onPriceSelect(price: string): void {
    const currentValue = this.filterForm.get('price')?.value;
    
    if (currentValue === price) {
      // Deselect if already selected
      this.filterForm.patchValue({
        price: ''
      });
    } else {
      this.filterForm.patchValue({
        price: price
      });
    }
  }

  // Reset form to default values
  resetForm(): void {
    this.filterForm.reset({
      category: '',
      subcategory: '',
      accessibility: '',
      price: '',
      city: 'Paris'
    });
    
    this.selectedCategory = null;
    this.selectedSubcategory = null;
    this.showSubcategories = false;
    this.customCity = '';
    this.showCustomCityInput = false;
  }

  // Close the filter panel
  onClose(): void {
    this.closeFilter.emit();
  }

  // Apply the filter
  onApply(): void {
    const formValues = this.filterForm.value;
    
    // Create filter object
    const filter: ActivityFilter = {
      city: formValues.city || 'Paris'
    };
    
    // Only add defined values
    if (formValues.category) {
      filter.category = formValues.category;
    }
    
    if (formValues.subcategory) {
      filter.subcategory = formValues.subcategory;
    }
    
    if (formValues.accessibility) {
      filter.accessibility = formValues.accessibility as 'full' | 'limited' | 'none' | 'unknown';
    }
    
    if (formValues.price) {
      filter.price = formValues.price as 'free' | 'paid' | 'unknown';
    }
    
    this.applyFilter.emit(filter);
    this.closeFilter.emit();
  }

  // Reset filters
  onReset(): void {
    this.resetForm();
    this.resetFilter.emit();
    this.closeFilter.emit();
  }

  // Check if category is selected
  isCategorySelected(category: string): boolean {
    return this.selectedCategory === category;
  }

  // Check if subcategory is selected
  isSubcategorySelected(subcategory: string): boolean {
    return this.selectedSubcategory === subcategory;
  }

  // Check if accessibility option is selected
  isAccessibilitySelected(accessibility: string): boolean {
    return this.filterForm.get('accessibility')?.value === accessibility;
  }

  // Check if price option is selected
  isPriceSelected(price: string): boolean {
    return this.filterForm.get('price')?.value === price;
  }

  // Check if city is selected
  isCitySelected(city: string): boolean {
    return this.filterForm.get('city')?.value === city;
  }
}
