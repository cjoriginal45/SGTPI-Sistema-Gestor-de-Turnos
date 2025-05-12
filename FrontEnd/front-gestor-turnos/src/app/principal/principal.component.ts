import { Component, ViewChild } from '@angular/core';
import { CalendarComponent } from '../calendar/calendar.component';
import { HeaderComponent } from "../header/header.component";

@Component({
  selector: 'app-principal',
  imports: [CalendarComponent, HeaderComponent],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css'
})
export class PrincipalComponent {
  selectedDay: number | null = null;

  @ViewChild('calendarComponent') calendar!: CalendarComponent;

  toggleCalendar() {
    this.calendar.toggle();
  }

  onDaySelected(event: any) {
    console.log('Día seleccionado:', event);
    // Tu lógica aquí
  }


}
