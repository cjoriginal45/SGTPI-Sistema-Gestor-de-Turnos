import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  // Señales para el estado del menú
  isMenuActive = signal(false);
  isConfigActive = signal(false);


  // Alternar menú de configuración
  toggleConfig(event: Event) {
    event.stopPropagation(); // Evita que el evento se propague
    this.isConfigActive.update(state => !state);
    // Si abrimos la configuración, cerramos el menú
    if (this.isConfigActive()) {
      this.isMenuActive.set(false);
    }
  }

  // Cerrar todos los menús al hacer clic fuera
  closeAllMenus() {
    this.isMenuActive.set(false);
    this.isConfigActive.set(false);
  }

  @Output() menuToggled = new EventEmitter<boolean>();

   // Alternar menú hamburguesa
   toggleMenu() {
    this.isMenuActive.update(state => !state);
    this.menuToggled.emit(this.isMenuActive());
  }

}