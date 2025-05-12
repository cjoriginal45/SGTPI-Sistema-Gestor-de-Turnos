import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
  @Output() daySelected = new EventEmitter<any>();

  // Estado del calendario
  isOpen = signal(false);
  currentDate = signal(new Date());
  
  // Datos del calendario
  days = signal<any[]>([]);
  monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  constructor() {
    this.renderCalendar();
    this.selectToday();
  }


  public toggle() {
    this.isOpen.update(state => !state);
    console.log('Calendar state:', this.isOpen()); // Para depuración
  }

  renderCalendar() {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();
    
    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const lastDayIndex = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;
    const nextDays = 7 - lastDayIndex - 1;

    const daysArray = [];

    // Días del mes anterior
    for (let i = firstDayIndex; i > 0; i--) {
      daysArray.push({
        dayNumber: prevLastDay - i + 1,
        class: 'dia otro-mes',
        disabled: true
      });
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      daysArray.push({
        dayNumber: i,
        class: isToday ? 'dia hoy' : 'dia',
        disabled: false
      });
    }

    // Días del próximo mes
    for (let i = 1; i <= nextDays; i++) {
      daysArray.push({
        dayNumber: i,
        class: 'dia otro-mes',
        disabled: true
      });
    }

    this.days.set(daysArray);
  }

  changeMonth(direction: number) {
    const newDate = new Date(this.currentDate());
    newDate.setMonth(newDate.getMonth() + direction);
    this.currentDate.set(newDate);
    this.renderCalendar();
  }

  selectDay(day: any) {
    if (day.disabled) return;

    this.days.update(days => 
      days.map(d => ({
        ...d,
        class: d.dayNumber === day.dayNumber && !d.class.includes('otro-mes') 
               ? d.class + ' seleccionado' 
               : d.class.replace(' seleccionado', '')
      }))
    );

    const date = this.currentDate();
    this.daySelected.emit({
      day: day.dayNumber,
      month: date.getMonth() + 1,
      year: date.getFullYear()
    });

    this.isOpen.set(false);
  }

  selectToday() {
    const today = new Date();
    const current = this.currentDate();
    
    if (today.getFullYear() === current.getFullYear() && 
        today.getMonth() === current.getMonth()) {
      
      const todayDay = this.days().find(d => 
        d.dayNumber === today.getDate() && 
        !d.class.includes('otro-mes')
      );
      
      if (todayDay) {
        this.selectDay(todayDay);
      }
    }
  }
}