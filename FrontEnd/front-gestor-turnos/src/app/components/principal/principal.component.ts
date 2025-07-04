import { Component, ViewChild, signal, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs'; // Necesario para `destroy$`
import { CalendarComponent } from '../calendar/calendar.component';
import { HeaderComponent } from "../header/header.component";
import { TurnosService, Turno } from '../../services/turnos.service';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent, HeaderComponent],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css'
})
export class PrincipalComponent implements OnInit, OnDestroy {

  @ViewChild('calendarComponent') calendar!: CalendarComponent;

  private turnosService = inject(TurnosService);
  private destroy$ = new Subject<void>();

  // --- Signals for Modal State and Form Fields ---
  protected showModal = signal(false); // Controls modal visibility
  protected modalTurno = signal<Turno | null>(null); // Stores the 'Turno' object currently being edited/assigned

  // Signals for the form inputs within the modal
  protected pacienteNombre = signal<string>('');
  protected telefonoPaciente = signal<string>('');
  protected emailPaciente = signal<string>(''); // Added email field signal
  protected duracionTurno = signal<number>(50); // Default duration
  protected observaciones = signal<string>('');

  // --- Signals for Notifications (now `protected` for template access) ---
  protected notificacion = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  // Computed properties that observe service signals and update automatically
  protected turnos = computed(() => this.turnosService.turnosSignal());
  protected turnosPorPeriodo = computed(() => this.turnosService.turnosPorPeriodo());
  protected fechaSeleccionada = computed(() => this.turnosService.fechaSeleccionadaSignal());

  // Computed signal for the agenda title based on selected date
  protected tituloAgenda = computed(() => {
    const fecha = this.turnosService.fechaSeleccionadaSignal();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaSel = new Date(fecha);
    fechaSel.setHours(0, 0, 0, 0);

    if (fechaSel.getTime() === hoy.getTime()) {
      return 'Turnos para hoy';
    }

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    return `Turnos para el ${fechaSel.toLocaleDateString('es-ES', opciones)}`;
  });

  ngOnInit() {
    this.turnosService.notificaciones
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        this.notificacion.set(notif);
        if (notif) {
          // Clear notification after 3 seconds (or adjust as needed)
          setTimeout(() => this.notificacion.set(null), 3000);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Methods for Calendar Interaction ---

  toggleCalendar() {
    this.calendar.onToggleClick();
  }

  // This is the primary method that receives the date from the calendar
  onDateSelected(date: Date) {
    this.turnosService.seleccionarFecha(date); // Calls the service to update the date and load turns
  }

  irAHoy() {
    const hoy = new Date();
    this.turnosService.seleccionarFecha(hoy);
  }

  // --- Helper Methods for Turno Display (icons and text) ---

  protected getIconoPorEstado(estado: Turno['estado']): string {
    switch (estado) {
      case 'DISPONIBLE': return 'event_available';
      case 'CONFIRMADO': return 'assignment_ind';
      case 'BLOQUEADO': return 'lock';
      case 'CANCELADO': return 'event_busy';
      case 'REALIZADO': return 'check_circle';
      case 'EN_CURSO': return 'play_circle';
      default: return 'help';
    }
  }

  protected getTextoEstado(turno: Turno): string {
    switch (turno.estado) {
      case 'BLOQUEADO': return 'Bloqueado';
      case 'DISPONIBLE': return 'Disponible';
      case 'CONFIRMADO': return turno.paciente || 'Confirmado';
      case 'CANCELADO': return 'Cancelado';
      case 'REALIZADO': return 'Realizado';
      case 'EN_CURSO': return 'En curso';
      default: return 'Estado desconocido';
    }
  }

  protected limpiarNotificacion() {
    this.notificacion.set(null);
  }

  // --- Modal Logic ---

  /**
   * Opens the modal and populates form fields based on the passed 'Turno' object.
   * This method is used for both "Asignar Turno" (new) and "Modificar Turno" (existing).
   * @param turno The 'Turno' object to be assigned or modified.
   */
  protected abrirModal(turno: Turno) {
    this.modalTurno.set(turno); // Store the current turno

    // Initialize form fields based on existing turno data or clear for new assignment
    this.pacienteNombre.set(turno.paciente || '');
    this.telefonoPaciente.set(turno.telefono || '');
    this.emailPaciente.set(turno.email || '');
    this.duracionTurno.set(turno.duracion || 50); // Default to 50 if not set
    this.observaciones.set(turno.observaciones || '');

    this.showModal.set(true); // Show the modal
  }

  /**
   * Closes the modal and resets all form fields and the 'modalTurno' state.
   */
  protected cerrarModal() {
    this.showModal.set(false); // Hide the modal
    this.modalTurno.set(null); // Clear the stored turno

    // Reset all modal form fields
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.emailPaciente.set('');
    this.duracionTurno.set(50);
    this.observaciones.set('');
  }

  /**
   * Handles the confirmation action from the modal.
   * Validates input and calls the service to save or update the appointment.
   */
  protected async confirmarModal() {
    const currentTurno = this.modalTurno();

    // Basic validation: Patient name is required
    if (!currentTurno || !this.pacienteNombre().trim()) {
      this.notificacion.set({ tipo: 'error', mensaje: 'El nombre del paciente es obligatorio para asignar o modificar el turno.' });
      return;
    }

    // Create the 'Turno' object to send to the service
    const turnoToSave: Turno = {
      ...currentTurno, // Copy existing properties like fecha, hora, id (frontend)
      paciente: this.pacienteNombre().trim(),
      telefono: this.telefonoPaciente().trim(),
      email: this.emailPaciente().trim(),
      duracion: this.duracionTurno(),
      observaciones: this.observaciones().trim(),
      estado: 'CONFIRMADO', // Always set to CONFIRMADO when confirmed via modal
    };

    // If it's an existing appointment being modified, ensure its backend API ID is preserved
    if (currentTurno.apiId) {
      turnoToSave.apiId = currentTurno.apiId;
    }

    try {
      // Call the service to save (if new) or update (if existing) the appointment
      await this.turnosService.saveOrUpdateAppointment(turnoToSave);
      this.cerrarModal(); // Close the modal on successful operation
    } catch (error) {
      console.error('Error al guardar/modificar el turno:', error);
      // The service's handleError already sends a notification, so no need to duplicate it here.
    }
  }

  /**
   * Handles the cancellation action from the modal.
   * Simply closes the modal without saving changes.
   */
  protected cancelarModal() {
    this.cerrarModal();
  }

  // --- Turno Actions (from main view buttons) ---

  /**
   * Initiates the assignment process for a DISPONIBLE turno.
   * Opens the modal for user input.
   * @param turno The 'Turno' object representing the available slot.
   */
  protected asignarTurno(turno: Turno) {
    if (turno.estado === 'DISPONIBLE') {
      this.abrirModal(turno);
    } else {
      this.notificacion.set({ tipo: 'info', mensaje: 'Este turno no está disponible para ser asignado.' });
    }
  }

  /**
   * Initiates the modification process for a CONFIRMADO turno.
   * Opens the modal, pre-populating it with existing turno data.
   * @param turno The 'Turno' object to be modified.
   */
  protected modificarTurno(turno: Turno) {
    if (turno.estado === 'CONFIRMADO') {
      this.abrirModal(turno);
    } else {
      this.notificacion.set({ tipo: 'info', mensaje: 'Solo se pueden modificar turnos confirmados.' });
    }
  }

  /**
   * Cancels a confirmed turno by its frontend ID, finding its backend ID.
   * @param turnoId The frontend ID of the turno to cancel.
   */
  protected async cancelarTurno(turnoId: string) {
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno || turno.estado !== 'CONFIRMADO') {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se puede cancelar este turno o no está confirmado.' });
      return;
    }
    if (turno.apiId === undefined || turno.apiId === null) {
      this.notificacion.set({ tipo: 'error', mensaje: 'Este turno no tiene un ID de backend para cancelar.' });
      return;
    }

    if (confirm('¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.')) {
      try {
        await this.turnosService.cancelAppointment(turno.apiId);
      } catch (error) {
        console.error('Error al cancelar el turno:', error);
        // Error notification is handled by the service
      }
    }
  }

  /**
   * Blocks a specific time slot using its frontend ID.
   * @param turnoId The frontend ID of the slot to block.
   */
  protected async bloquearHora(turnoId: string) {
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno) {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se encontró el turno para bloquear.' });
      return;
    }

    const fechaSeleccionada = this.turnosService.fechaSeleccionadaSignal();
    const [hours, minutes] = turno.hora.split(':').map(Number);
    const slotDateTime = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate(), hours, minutes, 0);

    if (confirm('¿Estás seguro de que deseas bloquear este horario? Esto lo hará indisponible.')) {
      try {
        // Await the service call. The service itself updates the signal.
        await this.turnosService.toggleBlock(slotDateTime, true);
        // Success notification is handled by the service now, so no need to duplicate here
      } catch (error) {
        console.error('Error al bloquear el horario:', error);
        // Error notification is handled by the service
      }
    }
  }

  protected async desbloquearHora(turnoId: string) {
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno) {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se encontró el turno para desbloquear.' });
      return;
    }

    const fechaSeleccionada = this.turnosService.fechaSeleccionadaSignal();
    const [hours, minutes] = turno.hora.split(':').map(Number);
    const slotDateTime = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate(), hours, minutes, 0);

    if (confirm('¿Estás seguro de que deseas desbloquear este horario? Esto lo hará disponible.')) {
      try {
        // Await the service call. The service itself updates the signal.
        await this.turnosService.toggleBlock(slotDateTime, false);
        // Success notification is handled by the service now
      } catch (error) {
        console.error('Error al desbloquear el horario:', error);
        // Error notification is handled by the service
      }
    }
  }
}