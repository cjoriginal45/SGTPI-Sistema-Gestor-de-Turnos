import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  Input, // ¡Importa Input!
  effect, // ¡Importa effect!
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

  @Input() initialDate: Date | undefined;
  @Input() showToggle: boolean = true;
  @Input() allowAnyDate: boolean = false; // Este es el flag que controla la restricción.

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

  // Propiedades computadas
  currentMonthName = computed(
    () => this.monthNames[this.currentDate().getMonth()]
  );
  currentYear = computed(() => this.currentDate().getFullYear());

  // Esta propiedad ahora se usa solo cuando `allowAnyDate` es false
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
    effect(() => {
      if (this.initialDate) {
        const newDate = new Date(this.initialDate);
        newDate.setHours(0, 0, 0, 0);

        if (!this.selectedDate() || this.selectedDate()!.getTime() !== newDate.getTime()) {
          this.selectedDate.set(newDate);
          this.currentDate.set(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
          this.renderCalendar();
          this.dateSelected.emit(newDate);
          console.log('[CalendarComponent] initialDate input changed/set, updated to:', newDate);
        }
      }
    }, { allowSignalWrites: true });

    this.renderCalendar();
    this.initializeSelection();
  }

  // --- API PÚBLICA / MANEJO DE EVENTOS ---

  onToggleClick() {
    if (!this.isOpen()) {
      const dateToShow = this.selectedDate() || new Date();
      this.currentDate.set(new Date(dateToShow.getFullYear(), dateToShow.getMonth(), 1));
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
    this.dateSelected.emit(selectedDate);
    this.isOpen.set(false);

    this.highlightSelectedDay(day.dayNumber);
  }

  private highlightSelectedDay(dayNumber: number) {
    this.days.update((days) =>
      days.map((d) => {
        const isSelected =
          d.dayNumber === dayNumber &&
          d.selectable &&
          this.isCurrentMonth(this.createDateFromDay(d.dayNumber));

        return {
          ...d,
          class: isSelected
            ? `${d.class.replace(' seleccionado', '')} seleccionado`
            : d.class.replace(' seleccionado', ''),
        };
      })
    );
  }

  // --- LÓGICA INTERNA ---

  private initializeSelection() {
    if (this.selectedDate() === null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentCalDate = this.currentDate();

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
          this.selectedDate.set(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
        }
      }
    }
  }

  private renderCalendar() {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();

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
      dayDate.setHours(0, 0, 0, 0);

      // Lógica de restricción de fecha actualizada
      // `isSelectable` es true si `allowAnyDate` es true O si la fecha está dentro del rango permitido
      const isSelectable = this.allowAnyDate || (dayDate >= today && dayDate <= this.maxSelectableDate());
      const isDisabled = !isSelectable;
      const isToday = dayDate.getTime() === today.getTime();
      const isSelected = this.selectedDate() && dayDate.getTime() === this.selectedDate()!.getTime();

      let classes = isToday ? 'hoy' : '';
      if (isSelected) {
        classes += ' seleccionado';
      }

      daysArray.push(
        this.createDay(i, classes, isDisabled, !isDisabled)
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

  private isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate().getMonth() &&
           date.getFullYear() === this.currentDate().getFullYear();
  }

  private createDateFromDay(dayNumber: number): Date {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const date = new Date(year, month, dayNumber);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
