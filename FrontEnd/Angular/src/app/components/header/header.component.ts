// src/app/components/header/header.component.ts

import { Component, EventEmitter, Output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css' // <-- ¡Debe ser styleUrl en singular!
})
export class HeaderComponent {
  // Señales para el estado del menú
  isMenuActive = signal(false);
  isConfigActive = signal(false);

  // Alternar menú de configuración
  toggleConfig(event: Event) {
    event.stopPropagation(); // Evita que el evento se propague al document
    this.isConfigActive.update(state => !state);
    // Si abrimos la configuración, cerramos el menú hamburguesa
    if (this.isConfigActive()) {
      this.isMenuActive.set(false);
    }
  }

  // Alternar menú hamburguesa
  toggleMenu() {
    this.isMenuActive.update(state => !state);
    // Si abrimos el menú hamburguesa, cerramos la configuración
    if (this.isMenuActive()) {
      this.isConfigActive.set(false);
    }
    // Emite el estado del menú (opcional, si algún padre lo necesita)
    // this.menuToggled.emit(this.isMenuActive());
  }

  // Método para cerrar todos los menús
  closeAllMenus() {
    this.isMenuActive.set(false);
    this.isConfigActive.set(false);
  }

  // HostListener para cerrar menús al hacer clic en cualquier parte del documento
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Si el clic no fue dentro del botón de configuración o el menú de configuración
    // y el menú de configuración está abierto, ciérralo.
    if (this.isConfigActive()) {
      const configContainer = (event.target as HTMLElement).closest('.config-container');
      if (!configContainer) {
        this.isConfigActive.set(false);
      }
    }

    // Si el clic no fue dentro del botón hamburguesa o el menú principal
    // y el menú hamburguesa está abierto, ciérralo.
    if (this.isMenuActive()) {
      const headerElement = (event.target as HTMLElement).closest('.app-header'); // Check if click is inside the header itself
      if (!headerElement) { // If click is outside the entire header
         this.isMenuActive.set(false);
      }
    }
  }

  // Si no se usa en el componente padre, puedes eliminar esta línea
  @Output() menuToggled = new EventEmitter<boolean>();
}
