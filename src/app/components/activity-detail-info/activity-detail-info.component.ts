import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Activity } from '../../services/activity.service';

interface TagGroup {
  name: string;
  tags: TagInfo[];
  icon: string;
  colorClass: string;
}

interface TagInfo {
  key: string;
  value: string;
  category: string;
  displayValue: string;
  tooltip?: string;
  url?: string;
  originalTag: string;
}

@Component({
  selector: 'app-activity-detail-info',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './activity-detail-info.component.html',
  styleUrls: ['./activity-detail-info.component.css'],
})
export class ActivityDetailInfoComponent implements OnInit {
  @Input() activity?: Activity;

  // Extracted and formatted data
  description = '';
  openingHours = '';
  phone = '';
  website = '';
  accessibilityInfo = '';
  priceInfo = '';
  openingStatus = '';
  
  // Processed tag data
  tagGroups: TagGroup[] = [];
  processedTags: TagInfo[] = [];

  // Track which sections are expanded (for mobile view)
  expandedSections: Record<string, boolean> = {
    description: true,
    details: true,
    tags: true,
    tagsBasic: true,
    tagsAdvanced: false
  };

  ngOnInit(): void {
    if (this.activity) {
      this.extractActivityInfo();
      this.processTags();
      this.groupTagsByCategory();
    }
  }

  extractActivityInfo(): void {
    if (!this.activity) return;

    // Extract description (using main category + subcategory)
    const categories = this.activity.categories.join(', ');
    const subcategories = this.activity.subcategories?.join(', ') || '';
    this.description = `${this.activity.name} is a ${subcategories} establishment in the ${categories} category located in ${this.activity.city}.`;

    // // Extract useful information from tags
    // if (this.activity.tags) {
    //   for (const tag of this.activity.tags) {
    //     if (tag.startsWith('opening_hours=')) {
    //       this.openingHours = tag.replace('opening_hours=', '');
    //     } else if (tag.startsWith('phone=')) {
    //       this.phone = tag.replace('phone=', '');
    //     } else if (tag.startsWith('website=')) {
    //       this.website = tag.replace('website=', '');
    //     }
    //   }
    // }

    // Extract filter information
    if (this.activity.filters) {
      if (this.activity.filters.accessibility) {
        switch (this.activity.filters.accessibility) {
          case 'full':
            this.accessibilityInfo = 'Full wheelchair accessibility';
            break;
          case 'limited':
            this.accessibilityInfo = 'Limited wheelchair accessibility';
            break;
          case 'none':
            this.accessibilityInfo = 'Not wheelchair accessible';
            break;
          default:
            this.accessibilityInfo = 'Accessibility information not available';
        }
      }

      if (this.activity.filters.price) {
        switch (this.activity.filters.price) {
          case 'free':
            this.priceInfo = 'Free';
            break;
          case 'paid':
            this.priceInfo = 'Paid';
            break;
          default:
            this.priceInfo = 'Price information not available';
        }
      }

      this.openingStatus = this.activity.filters.opening_status 
        ? this.formatOpeningStatus(this.activity.filters.opening_status)
        : 'Status unknown';
    }
  }

  processTags(): void {
    if (!this.activity || !this.activity.tags) return;
    
    this.processedTags = this.activity.tags.map(tag => {
      const [key, ...valueParts] = tag.split('=');
      const value = valueParts.join('='); // In case value contains '=' characters
      
      const category = this.getTagCategory(tag);
      const displayValue = this.formatTagValue(key, value);
      
      const tagInfo: TagInfo = {
        key,
        value,
        category,
        displayValue,
        originalTag: tag
      };
      
      // Add wiki link for documentation
      tagInfo.url = `https://wiki.openstreetmap.org/wiki/Key:${encodeURIComponent(key)}`;
      
      // Add tooltip for certain tags
      if (key === 'opening_hours') {
        tagInfo.tooltip = 'Opening hours in OSM format';
      } else if (key.includes('wikidata')) {
        tagInfo.tooltip = 'Identifier in Wikidata';
        tagInfo.url = `https://www.wikidata.org/wiki/${value}`;
      } else if (key.includes('wikipedia')) {
        tagInfo.tooltip = 'Reference to Wikipedia article';
        if (value.includes(':')) {
          const [lang, article] = value.split(':');
          tagInfo.url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(article)}`;
        } else {
          tagInfo.url = `https://en.wikipedia.org/wiki/${encodeURIComponent(value)}`;
        }
      }
      
      return tagInfo;
    });
  }
  
  groupTagsByCategory(): void {
    if (!this.processedTags.length) return;
    
    // Define groups with their colors and icons
    this.tagGroups = [
      {
        name: 'Basic Information',
        tags: [],
        icon: 'information-circle',
        colorClass: 'blue'
      },
      {
        name: 'Contact & Access',
        tags: [],
        icon: 'phone',
        colorClass: 'green'
      },
      {
        name: 'Identity & Branding',
        tags: [],
        icon: 'tag',
        colorClass: 'purple'
      },
      {
        name: 'Attributes & Services',
        tags: [],
        icon: 'cog',
        colorClass: 'yellow'
      },
      {
        name: 'References & External Data',
        tags: [],
        icon: 'link',
        colorClass: 'red'
      },
      {
        name: 'Other Tags',
        tags: [],
        icon: 'dots-horizontal',
        colorClass: 'gray'
      }
    ];
    
    // Sort tags into groups
    for (const tag of this.processedTags) {
      if (['name', 'addr', 'description', 'alt_name'].some(k => tag.key.startsWith(k))) {
        this.tagGroups[0].tags.push(tag); // Basic Information
      } else if (['phone', 'website', 'email', 'opening_hours', 'wheelchair'].some(k => tag.key.includes(k))) {
        this.tagGroups[1].tags.push(tag); // Contact & Access  
      } else if (['brand', 'operator', 'network', 'ref'].some(k => tag.key.includes(k))) {
        this.tagGroups[2].tags.push(tag); // Identity & Branding
      } else if (['amenity', 'shop', 'cuisine', 'tourism', 'leisure'].some(k => tag.key.includes(k))) {
        this.tagGroups[3].tags.push(tag); // Attributes & Services
      } else if (['wikidata', 'wikipedia', 'url', 'image'].some(k => tag.key.includes(k))) {
        this.tagGroups[4].tags.push(tag); // References & External Data
      } else {
        this.tagGroups[5].tags.push(tag); // Other Tags
      }
    }
    
    // Remove empty groups
    this.tagGroups = this.tagGroups.filter(group => group.tags.length > 0);
    
    // Sort tags within groups by key
    for (const group of this.tagGroups) {
      group.tags.sort((a, b) => a.key.localeCompare(b.key));
    }
  }

  formatOpeningStatus(status: string): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatLastUpdated(dateString?: string): string {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  toggleSection(section: string): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }

  getTagCategory(tag: string): string {
    if (tag.startsWith('amenity=')) return 'Amenity';
    if (tag.startsWith('brand=')) return 'Brand';
    if (tag.startsWith('cuisine=')) return 'Cuisine';
    if (tag.startsWith('name=')) return 'Name';
    if (tag.startsWith('opening_hours=')) return 'Opening Hours';
    if (tag.startsWith('phone=')) return 'Phone';
    if (tag.startsWith('website=')) return 'Website';
    if (tag.startsWith('wheelchair=')) return 'Wheelchair Access';
    if (tag.startsWith('tourism=')) return 'Tourism';
    if (tag.startsWith('shop=')) return 'Shop';
    if (tag.startsWith('leisure=')) return 'Leisure';
    if (tag.startsWith('addr:')) return 'Address';
    if (tag.startsWith('email=')) return 'Email';
    if (tag.startsWith('internet_access=')) return 'Internet';
    if (tag.startsWith('payment:')) return 'Payment';
    if (tag.startsWith('wikidata=')) return 'Wikidata';
    if (tag.startsWith('wikipedia=')) return 'Wikipedia';
    return 'Other';
  }

  getTagValue(tag: string): string {
    const parts = tag.split('=');
    return parts.length > 1 ? parts.slice(1).join('=') : '';
  }

  getTagKey(tag: string): string {
    const parts = tag.split('=');
    return parts[0] || '';
  }
  
  formatTagValue(key: string, value: string): string {
    // Handle known formats or special cases
    if (key === 'phone' || key === 'contact:phone') {
      return this.formatPhoneNumber(value);
    }
    
    if (key === 'opening_hours') {
      return this.formatOpeningHours(value);
    }
    
    if (key === 'wheelchair') {
      return this.formatWheelchairAccess(value);
    }
    
    if (key.includes('wikidata')) {
      return `Wikidata: ${value}`;
    }
    
    if (key.includes('wikipedia')) {
      return `Wikipedia: ${value.replace('_', ' ')}`;
    }
    
    if (key.startsWith('payment:')) {
      return this.formatPaymentMethod(key, value);
    }
    
    // Handle boolean values
    if (value === 'yes') return 'Yes';
    if (value === 'no') return 'No';
    
    // Convert underscores to spaces for readability
    return value.replace(/_/g, ' ');
  }
  
  formatPhoneNumber(phone: string): string {
    // Simple formatting - implementations could be more sophisticated
    return phone.replace(/^00/, '+');
  }
  
  formatOpeningHours(hours: string): string {
    // This is a simplified version - a full parser would be more complex
    return hours
      .replace(';', '<br>')
      .replace(/,/g, ', ')
      .replace(/_/g, ' ');
  }
  
  formatWheelchairAccess(value: string): string {
    switch (value) {
      case 'yes': return 'Fully accessible';
      case 'limited': return 'Limited access';
      case 'no': return 'Not accessible';
      case 'designated': return 'Designated access';
      default: return value;
    }
  }
  
  formatPaymentMethod(key: string, value: string): string {
    // Extract the payment method from the key
    const method = key.replace('payment:', '');
    
    if (value === 'yes') {
      return `Accepts ${method.replace('_', ' ')}`;
    } else if (value === 'no') {
      return `Does not accept ${method.replace('_', ' ')}`;
    }
    
    return `${method.replace('_', ' ')}: ${value}`;
  }
  
  hasExternalLink(tag: TagInfo): boolean {
    return !!tag.url;
  }
  
  openExternalLink(url?: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
