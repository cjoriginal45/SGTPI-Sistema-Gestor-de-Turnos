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

  // --- NUEVOS INPUTS ---
  @Input() initialDate: Date | undefined; // ¡Aquí está el Input que faltaba!
  @Input() showToggle: boolean = true; // Para controlar la visibilidad del botón en el modal

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
    // 1. Efecto para reaccionar a cambios en `initialDate`
    // Este `effect` se ejecutará cuando el componente se inicialice y cuando `initialDate` cambie.
    effect(() => {
      if (this.initialDate) {
        const newDate = new Date(this.initialDate);
        newDate.setHours(0, 0, 0, 0); // Normalizar a medianoche

        // Solo actualiza si la fecha recibida es diferente a la ya seleccionada
        if (!this.selectedDate() || this.selectedDate()!.getTime() !== newDate.getTime()) {
          this.selectedDate.set(newDate); // Establece la fecha seleccionada
          // Establece el `currentDate` del calendario al primer día del mes de la nueva fecha
          this.currentDate.set(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
          this.renderCalendar(); // Vuelve a renderizar el calendario con la nueva fecha
          this.dateSelected.emit(newDate); // Emite la fecha si fue actualizada por el input
          console.log('[CalendarComponent] initialDate input changed/set, updated to:', newDate);
        }
      } else {
        // Si `initialDate` es undefined o null (ej. al abrir el calendario por primera vez sin una fecha específica)
        // Puedes decidir si quieres resetear a "hoy" o dejar la selección como está.
        // Aquí lo dejaremos sin hacer nada específico si `initialDate` se quita,
        // asumiendo que siempre se le pasará algo cuando sea relevante.
      }
    }, { allowSignalWrites: true }); // `allowSignalWrites: true` es necesario para modificar signals dentro de un effect

    // 2. Renderiza el calendario inicialmente
    this.renderCalendar();

    // 3. Establece "Hoy" como valor inicial de forma segura si no hay `initialDate` proporcionado
    // Este método solo actúa si `selectedDate` aún no ha sido establecido por el `effect`
    this.initializeSelection();
  }

  // --- API PÚBLICA / MANEJO DE EVENTOS ---

  onToggleClick() {
    // Si el calendario se está abriendo, asegúrate de que la fecha actual sea la que se muestre
    if (!this.isOpen()) {
      // Si ya hay una fecha seleccionada, ir a esa fecha. Si no, ir a hoy.
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
    this.dateSelected.emit(selectedDate); // Asegúrate que esto se está ejecutando
    this.isOpen.set(false); // Cierra el calendario al seleccionar un día

    this.highlightSelectedDay(day.dayNumber);
  }

  private highlightSelectedDay(dayNumber: number) {
    this.days.update((days) =>
      days.map((d) => {
        const isSelected =
          d.dayNumber === dayNumber &&
          d.selectable &&
          this.isCurrentMonth(this.createDateFromDay(d.dayNumber)); // Asegúrate de que es del mes visible

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
    // Solo inicializa la selección si `selectedDate` aún no ha sido establecido por el `effect`
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
          // No emitir aquí para evitar doble emisión si el padre ya estableció initialDate
        }
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
    // getDay() devuelve 0 para domingo, 1 para lunes...
    // Queremos que lunes sea el primer día (índice 0 en weekDays), por eso (day === 0 ? 6 : day - 1)
    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Convertir 0 (Domingo) a 6

    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();

    const lastDayIndex = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1; // Convertir 0 (Domingo) a 6
    const nextDays = (7 - lastDayIndex - 1 + 7) % 7; // Días para rellenar la última semana

    const daysArray = [];

    // Días del mes anterior
    for (let i = firstDayIndex; i > 0; i--) {
      daysArray.push(this.createDay(prevLastDay - i + 1, 'otro-mes', true));
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayDate = new Date(year, month, i);
      dayDate.setHours(0, 0, 0, 0); // Normalizar
      const isToday = dayDate.getTime() === today.getTime();
      const isDisabled = dayDate < today || dayDate > this.maxSelectableDate();
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

  // Helper para verificar si un día pertenece al mes que se está mostrando
  private isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate().getMonth() &&
           date.getFullYear() === this.currentDate().getFullYear();
  }

  // Helper para crear un objeto Date a partir de un `dayNumber` y el `currentDate` del calendario
  private createDateFromDay(dayNumber: number): Date {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const date = new Date(year, month, dayNumber);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}