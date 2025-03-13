import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
})
export class SearchBarComponent {
  searchTerm: string = '';

  @Output() search = new EventEmitter<string>();
  @Output() openFilter = new EventEmitter<void>();

  onSearch(): void {
    this.search.emit(this.searchTerm);
  }

  onOpenFilter(): void {
    this.openFilter.emit();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.search.emit('');
  }
}
