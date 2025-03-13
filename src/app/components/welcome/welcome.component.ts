import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';

/**
 * Interface for carousel slide data
 */
interface CarouselSlide {
  imageUrl: string;
  headline: string;
  subtitle: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './welcome.component.html',
})
export class WelcomeComponent {
  /**
   * Carousel slides data containing images, headlines, and subtitles
   * for the onboarding experience
   */
  slides: CarouselSlide[] = [
    {
      imageUrl: 'assets/images/slide1.jpg',
      headline: 'Plan Family Activities Together',
      subtitle: 'Create and share fun plans for the whole family to enjoy',
    },
    {
      imageUrl: 'assets/images/slide2.jpg',
      headline: 'Stay Organized',
      subtitle: 'Keep track of upcoming events and activities in one place',
    },
    {
      imageUrl: 'assets/images/slide3.jpg',
      headline: 'Discover New Ideas',
      subtitle: 'Find inspiration for your next family adventure',
    },
  ];

  // Current active slide index using Angular signals for reactivity
  currentSlideIndex = signal<number>(0);

  /**
   * Navigate to a specific slide by index
   * @param index The index of the slide to navigate to
   */
  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlideIndex.set(index);
    }
  }

  /**
   * Navigate to the next slide, with circular navigation
   */
  nextSlide(): void {
    const nextIndex = (this.currentSlideIndex() + 1) % this.slides.length;
    this.currentSlideIndex.set(nextIndex);
  }

  /**
   * Navigate to the previous slide, with circular navigation
   */
  prevSlide(): void {
    const prevIndex =
      (this.currentSlideIndex() - 1 + this.slides.length) % this.slides.length;
    this.currentSlideIndex.set(prevIndex);
  }

  /**
   * Check if a slide is active based on its index
   * @param index The index to check
   * @returns True if the slide is active, false otherwise
   */
  isActiveSlide(index: number): boolean {
    return this.currentSlideIndex() === index;
  }
}
