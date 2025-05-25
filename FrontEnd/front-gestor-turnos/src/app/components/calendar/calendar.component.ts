import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent {
  @Output() dateSelected = new EventEmitter<Date>();

  // Signals para estado reactivo
  currentDate = signal(new Date());
  selectedDate = signal<Date | null>(null);
  isOpen = signal(false);

  // Datos del calendario
  days = signal<any[]>([]);
  monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // --- PROPIEDADES COMPUTADAS ---
  currentMonthName = computed(
    () => this.monthNames[this.currentDate().getMonth()]
  );
  currentYear = computed(() => this.currentDate().getFullYear());

  maxSelectableDate = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() + 31);
    return date;
  });

  buttonText = computed(() => {
    const sel = this.selectedDate();
    if (!sel) {
      return 'Hoy';
    }
    const day = sel.getDate().toString().padStart(2, '0');
    const month = (sel.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  });

  constructor() {
    // 1. Renderiza el calendario con los días del mes actual
    this.renderCalendar();

    // 2. Establece "Hoy" como valor inicial de forma segura (reemplaza el 'effect')
    this.initializeSelection();
  }

  // --- API PÚBLICA / MANEJO DE EVENTOS ---

  onToggleClick() {
    if (!this.isOpen()) {
      this.currentDate.set(new Date());
      this.renderCalendar();
    }
    this.isOpen.update((state) => !state);
  }

  changeMonth(direction: number) {
    const newDate = new Date(this.currentDate());
    newDate.setMonth(newDate.getMonth() + direction);
    this.currentDate.set(newDate);
    this.renderCalendar();
  }

  selectDay(day: any) {
    if (!day.selectable) return;

    const date = this.currentDate();
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), day.dayNumber);
    
    this.selectedDate.set(selectedDate);
    this.dateSelected.emit(selectedDate); // Asegúrate que esto se está ejecutando
    this.isOpen.set(false);
    
    this.highlightSelectedDay(day.dayNumber);
}

  private highlightSelectedDay(dayNumber: number) {
    this.days.update((days) =>
      days.map((d) => ({
        ...d,
        class:
          d.dayNumber === dayNumber &&
          d.selectable &&
          !d.class.includes('otro-mes')
            ? `${d.class.replace(' seleccionado', '')} seleccionado`
            : d.class.replace(' seleccionado', ''),
      }))
    );
  }

  // --- LÓGICA INTERNA ---

  private initializeSelection() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentCalDate = this.currentDate();

    // Solo pre-selecciona si el calendario está mostrando el mes y año actual
    if (
      today.getFullYear() === currentCalDate.getFullYear() &&
      today.getMonth() === currentCalDate.getMonth()
    ) {
      const todayObject = this.days().find(
        (d) =>
          d.dayNumber === today.getDate() &&
          !d.class.includes('otro-mes') &&
          !d.disabled
      );

      if (todayObject) {
        // Establece la fecha seleccionada directamente
        this.selectedDate.set(new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ));
      }
    }
  }

  private renderCalendar() {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar 'today' para evitar problemas con la hora

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();

    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const lastDayIndex = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;
    const nextDays = (7 - lastDayIndex - 1 + 7) % 7;

    const daysArray = [];

    // Días del mes anterior
    for (let i = firstDayIndex; i > 0; i--) {
      daysArray.push(this.createDay(prevLastDay - i + 1, 'otro-mes', true));
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayDate = new Date(year, month, i);
      const isToday = dayDate.getTime() === today.getTime();
      const isDisabled = dayDate < today || dayDate > this.maxSelectableDate();

      daysArray.push(
        this.createDay(i, isToday ? 'hoy' : '', isDisabled, !isDisabled)
      );
    }

    // Días del próximo mes
    for (let j = 1; j <= nextDays; j++) {
      daysArray.push(this.createDay(j, 'otro-mes', true));
    }

    this.days.set(daysArray);
  }

  private createDay(
    dayNumber: number,
    extraClass: string,
    disabled: boolean,
    selectable: boolean = false
  ): any {
    return {
      dayNumber,
      class: `dia ${extraClass}`.trim(),
      disabled,
      selectable,
    };
  }

  private getDayName(year: number, month: number, day: number): string {
    const date = new Date(year, month, day);
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
  }
}
