import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  isMenuActive = false;
  isConfigActive = false;

  toggleMenu() {
    this.isMenuActive = !this.isMenuActive;
    if (this.isMenuActive) {
      this.isConfigActive = false;
    }
  }

  toggleConfig(event: Event) {
    event.stopPropagation();
    this.isConfigActive = !this.isConfigActive;
    if (this.isConfigActive) {
      this.isMenuActive = false;
    }
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.main-header')) {
      this.isMenuActive = false;
      this.isConfigActive = false;
    }
  }
}