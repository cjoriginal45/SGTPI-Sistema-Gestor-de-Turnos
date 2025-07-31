import { Component, Input, Output, EventEmitter, signal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.css'],
})
export class PaginatorComponent {
  // Entradas de datos para el componente
  @Input({ required: true }) currentPage!: Signal<number>;
  @Input({ required: true }) totalPages!: Signal<number>;
  @Input() itemsPerPage = signal(10); // Opcional, para mostrar en la UI

  // Salida para notificar al componente padre cuando cambia la página
  @Output() pageChange = new EventEmitter<number>();

  // Propiedad computada para mostrar un rango de páginas
  // Esto evita mostrar cientos de números si hay muchos turnos
  pageNumbers = computed(() => {
    const pages = [];
    const current = this.currentPage();
    const total = this.totalPages();
    const range = 2; // Rango de páginas a mostrar alrededor de la actual

    // Calcula el inicio y el final del rango
    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);

    // Añade los números de página
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Si no se muestran las primeras páginas, añade puntos suspensivos
    if (start > 1) {
      pages.unshift(1, '...');
    }
    // Si no se muestran las últimas páginas, añade puntos suspensivos
    if (end < total) {
      pages.push('...', total);
    }
    return pages;
  });

  goToPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }
}
