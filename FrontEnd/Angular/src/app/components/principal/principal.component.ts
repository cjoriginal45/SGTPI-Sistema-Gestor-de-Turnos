// src/app/components/principal/principal.component.ts

import {
  Component,
  ViewChild,
  signal,
  OnInit,
  OnDestroy,
  inject,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Import isPlatformBrowser
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CalendarComponent } from '../calendar/calendar.component';
import { HeaderComponent } from '../header/header.component';
import { TurnosService } from '../../services/turnos.service'; // Import Turno and AppointmentPatientDto from turnos.service
import { PatientService } from '../../services/patient.service';
import { AppointmentResponseDto } from '../../interfaces/AppointmentResponseDto';
import { Turno } from '../../interfaces/Turno';
import { RouterModule } from '@angular/router'; // Importar RouterModule
import { AppointmentPatientDto } from '../../interfaces/AppointmentPatientDto';
// Asegúrate de importar AppointmentResponseDto

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalendarComponent,
    HeaderComponent,
    RouterModule,
  ],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css',
})
export class PrincipalComponent implements OnInit, OnDestroy {
[x: string]: any;
  @ViewChild('calendarComponent') calendar!: CalendarComponent; // This is for the main calendar

  public turnosService = inject(TurnosService); // Public to be accessible in HTML for initialDate
  private patientService = inject(PatientService);
  private destroy$ = new Subject<void>();

  // --- Signals para el estado de los Modales ---
  protected showAssignModal = signal(false); // Controls the "Assign" modal visibility
  protected showModifyModal = signal(false); // Controls the "Modify" modal visibility
  protected modalTurno = signal<Turno | null>(null); // Data of the appointment being operated on

  // --- Signals para la lista de Pacientes y el Paciente Seleccionado ---
  protected patientsList = signal<AppointmentPatientDto[]>([]);
  protected selectedPatient = signal<AppointmentPatientDto | null>(null);

  // Signals para los inputs del formulario dentro de los modales
  protected pacienteNombre = signal<string>(''); // Kept for compatibility/internal validation
  protected telefonoPaciente = signal<string>('');
  protected emailPaciente = signal<string>('');
  protected duracionTurno = signal<number>(50); // Default duration in minutes
  protected observaciones = signal<string>('');

  // --- NEW SIGNALS FOR DATE/TIME IN THE MODIFY MODAL ---
  protected modalSelectedDate = signal<Date | null>(null);
  protected modalSelectedTime = signal<string>(''); // HH:mm format

  // --- Signals for Notifications ---
  protected notificacion = signal<{
    tipo: 'success' | 'error' | 'info';
    mensaje: string;
  } | null>(null);

  // --- Signals para el modal de confirmación personalizado ---
  protected showCustomConfirmModal = signal(false);
  protected customConfirmMessage = signal('');
  private customConfirmResolve: ((confirmed: boolean) => void) | null = null; // Para resolver la promesa del custom confirm

  // --- Signals para el Modal de Notas de Sesión ---
  protected showNotesModal = signal(false);
  protected selectedAppointmentForNotes = signal<AppointmentResponseDto | null>(
    null
  );
  protected currentNotes = signal<string>(''); // Para el contenido del textarea de notas

  // Computed properties that observe service signals and update automatically
  protected turnos = computed(() => this.turnosService.turnosSignal());
  protected turnosPorPeriodo = computed(() =>
    this.turnosService.turnosPorPeriodo()
  );
  protected fechaSeleccionada = computed(() =>
    this.turnosService.fechaSeleccionadaSignal()
  );

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
      month: 'long',
    };
    return `Turnos para el ${fechaSel.toLocaleDateString('es-ES', opciones)}`;
  });

  ngOnInit() {
    this.turnosService.notificaciones
      .pipe(takeUntil(this.destroy$))
      .subscribe((notif) => {
        this.notificacion.set(notif);
        if (notif) {
          setTimeout(() => this.notificacion.set(null), 3000);
        }
      });

    this.loadPatients();
    // Load initial turnos for the currently selected date in the service
    this.turnosService.seleccionarFecha(this.fechaSeleccionada());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Method to load patients ---
  private async loadPatients() {
    console.log('[loadPatients] Iniciando carga de pacientes...');
    try {
      const patients = await this.patientService.getPatients();
      this.patientsList.set(patients);
      console.log('[loadPatients] Pacientes cargados exitosamente:', patients);
      if (
        this.showModifyModal() &&
        this.modalTurno()?.estado === 'CONFIRMADO'
      ) {
        console.log(
          '[loadPatients] Modify modal open and is CONFIRMADO, re-attempting to preload patient...'
        );
        this.preloadPatientForModal(this.modalTurno()!);
      }
    } catch (error) {
      console.error('[loadPatients] Error al cargar pacientes:', error);
      this.notificacion.set({
        tipo: 'error',
        mensaje: 'Error al cargar la lista de pacientes.',
      });
    }
  }

  // --- Method to handle patient selection in the dropdown ---
  protected onPatientSelected(patientIdValue: string | null) {
    console.log(
      `[onPatientSelected] Valor recibido del dropdown: '${patientIdValue}' (tipo: ${typeof patientIdValue})`
    );

    let selectedId: number | null = null;

    if (
      patientIdValue &&
      patientIdValue !== 'null' &&
      patientIdValue !== 'undefined' &&
      patientIdValue !== ''
    ) {
      const parsedId = Number(patientIdValue);
      if (!isNaN(parsedId)) {
        selectedId = parsedId;
      }
    }

    console.log(`[onPatientSelected] ID parseado para búsqueda: ${selectedId}`);

    if (selectedId === null) {
      this.selectedPatient.set(null);
      this.pacienteNombre.set('');
      this.telefonoPaciente.set('');
      this.emailPaciente.set('');
      console.log(
        '[onPatientSelected] Selección vacía o inválida (ID nulo). Campos reseteados.'
      );
      return;
    }

    const patient = this.patientsList().find((p) => p.id === selectedId);
    this.selectedPatient.set(patient || null);

    this.telefonoPaciente.set(patient?.phoneNumber || '');
    this.emailPaciente.set(patient?.email || '');
    this.pacienteNombre.set(
      `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim()
    );

    console.log(
      '[onPatientSelected] Paciente seleccionado (signal):',
      this.selectedPatient()
    );
    console.log(
      '[onPatientSelected] Teléfono actualizado (signal):',
      this.telefonoPaciente()
    );
    console.log(
      '[onPatientSelected] Email actualizado (signal):',
      this.emailPaciente()
    );
  }

  // --- Methods for Main Calendar Interaction ---
  toggleCalendar() {
    if (this.calendar) {
      this.calendar.onToggleClick();
    }
  }

  onDateSelected(date: Date) {
    this.turnosService.seleccionarFecha(date);
  }

  // --- Handles date selection from the calendar within the modify modal ---
  protected onModalDateSelected(date: Date) {
    this.modalSelectedDate.set(date);
    console.log('[onModalDateSelected] Fecha seleccionada en el modal:', date);
  }

  irAHoy() {
    const hoy = new Date();
    this.turnosService.seleccionarFecha(hoy);
  }

  // --- Helper Methods for Appointment Visualization (icons and text) ---
  protected getIconoPorEstado(estado: Turno['estado']): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'event_available';
      case 'CONFIRMADO':
        return 'assignment_ind';
      case 'BLOQUEADO':
        return 'lock';
      case 'CANCELADO':
        return 'event_busy';
      case 'REALIZADO':
        return 'check_circle';
      case 'EN_CURSO':
        return 'play_circle';
      default:
        return 'help';
    }
  }

  protected getTextoEstado(turno: Turno): string {
    switch (turno.estado) {
      case 'BLOQUEADO':
        return 'Bloqueado';
      case 'DISPONIBLE':
        return 'Disponible';
      case 'CONFIRMADO':
        return 'Confirmado';
      case 'CANCELADO':
        return 'Cancelado';
      case 'REALIZADO':
        return 'Realizado';
      case 'EN_CURSO':
        return 'En curso';
      default:
        return 'Estado desconocido';
    }
  }

  protected limpiarNotificacion() {
    this.notificacion.set(null);
  }

  // --- Logic for Opening Specific Modals ---

  protected abrirAsignarModal(turno: Turno) {
    console.log(
      '[abrirAsignarModal] Abriendo modal para asignar turno:',
      turno
    );
    this.modalTurno.set(turno);

    this.selectedPatient.set(null);
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.emailPaciente.set('');
    this.duracionTurno.set(50); // Default duration for new assignment
    this.observaciones.set('');

    const initialModalDate = new Date(`${turno.fecha}T${turno.hora}`);
    this.modalSelectedDate.set(initialModalDate);
    this.modalSelectedTime.set(turno.hora.substring(0, 5));

    this.showAssignModal.set(true);
    this.showModifyModal.set(false);
    console.log(
      '[abrirAsignarModal] Assign modal opened. showAssignModal state:',
      this.showAssignModal()
    );
  }

  protected abrirModificarModal(turno: Turno) {
    console.log(
      '[abrirModificarModal] Abriendo modal para modificar turno:',
      turno
    );
    this.modalTurno.set(turno);

    this.selectedPatient.set(null);
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.emailPaciente.set('');

    this.duracionTurno.set(turno.duracion ?? 50);
    this.observaciones.set(turno.observaciones || '');

    const initialModalDate =
      turno.fecha && turno.hora
        ? new Date(`${turno.fecha}T${turno.hora}`)
        : this.turnosService.fechaSeleccionadaSignal();
    this.modalSelectedDate.set(initialModalDate);
    this.modalSelectedTime.set(
      turno.hora ? turno.hora.substring(0, 5) : '08:00'
    );

    console.log(
      '[abrirModificarModal] Initial modal date and time signals set to:',
      this.modalSelectedDate(),
      this.modalSelectedTime()
    );

    this.showModifyModal.set(true);
    this.showAssignModal.set(false);
    this.showCustomConfirmModal.set(false);
    this.showNotesModal.set(false);

    // NEW: Use setTimeout to ensure modal is rendered before preloading patient
    setTimeout(() => {
      if (turno.estado === 'CONFIRMADO') {
        console.log(
          '[abrirModificarModal] Appointment is CONFIRMADO. Attempting to preload patient after modal render.'
        );
        this.preloadPatientForModal(turno);
      }
      console.log(
        '[abrirModificarModal] Modify modal opened. showModifyModal state:',
        this.showModifyModal()
      );
    }, 0); // Defer execution to next tick
  }

  private preloadPatientForModal(turno: Turno) {
    console.log(
      '[preloadPatientForModal] Starting preload for appointment:',
      turno
    );
    if (this.patientsList().length === 0) {
      console.warn(
        '[preloadPatientForModal] patientsList is empty. Preloading may fail. Ensure patients are loaded before opening the modal for modification.'
      );
    }

    const patientFullName = turno.paciente
      ? `${turno.paciente.firstName || ''} ${
          turno.paciente.lastName || ''
        }`.trim()
      : '';
    const patientPhoneNumber = turno.paciente?.phoneNumber || '';

    const foundPatient = this.patientsList().find(
      (p) =>
        p.phoneNumber === patientPhoneNumber &&
        `${p.firstName || ''} ${p.lastName || ''}`.trim() === patientFullName
    );

    if (foundPatient) {
      console.log(
        '[preloadPatientForModal] Patient found in list:',
        foundPatient
      );
      this.selectedPatient.set(foundPatient);
      this.pacienteNombre.set(
        `${foundPatient.firstName} ${foundPatient.lastName}`.trim()
      );
      this.telefonoPaciente.set(foundPatient.phoneNumber);
      this.emailPaciente.set(foundPatient.email || '');
    } else {
      console.warn(
        '[preloadPatientForModal] Appointment patient NOT found in the loaded patient list. Displaying data from turno object.'
      );
      console.log('   Appointment data:', {
        paciente: turno.paciente,
        telefono: turno.telefono,
        email: turno.email,
      });
      console.log('   Available patients:', this.patientsList());
      this.pacienteNombre.set(patientFullName);
      this.telefonoPaciente.set(patientPhoneNumber);
      this.emailPaciente.set(turno.paciente?.email || '');
    }
  }

  // --- Modal Closing Logic ---
  protected cerrarModal() {
    this.showAssignModal.set(false);
    this.showModifyModal.set(false);
    this.modalTurno.set(null);
    this.selectedPatient.set(null);
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.emailPaciente.set('');
    this.duracionTurno.set(50);
    this.observaciones.set('');
    this.modalSelectedDate.set(null); // Reset modal date
    this.modalSelectedTime.set(''); // Reset modal time
    console.log('[cerrarModal] Modals closed. Fields reset.');
  }

  /**
   * Muestra un modal de confirmación personalizado.
   * @param message El mensaje a mostrar en el modal.
   * @returns Una Promesa que se resuelve a `true` si el usuario confirma, `false` si cancela.
   */
  protected showCustomConfirm(message: string): Promise<boolean> {
    this.customConfirmMessage.set(message);
    this.showCustomConfirmModal.set(true);

    return new Promise<boolean>((resolve) => {
      this.customConfirmResolve = resolve;
    });
  }

  /**
   * Maneja la respuesta del modal de confirmación personalizado.
   * @param confirmed `true` si el usuario aceptó, `false` si canceló.
   */
  protected handleCustomConfirm(confirmed: boolean) {
    this.showCustomConfirmModal.set(false);
    if (this.customConfirmResolve) {
      this.customConfirmResolve(confirmed);
      this.customConfirmResolve = null; // Limpiar la función de resolución
    }
  }

  // --- Modal Confirmation Logic ---
  protected async confirmarModal() {
    const currentTurno = this.modalTurno();
    const patientFromDropdown = this.selectedPatient();
    let newDate: Date | null = null;
    let newTime: string = '';

    console.log('[confirmarModal] --- INICIO DE CONFIRMAR MODAL ---');
    console.log('[confirmarModal] currentTurno:', currentTurno);
    console.log(
      '[confirmarModal] patientFromDropdown (selectedPatient signal):',
      patientFromDropdown
    );

    if (this.showModifyModal()) {
      newDate = this.modalSelectedDate();
      newTime = this.modalSelectedTime();
      console.log(
        '[confirmarModal] Flow: Modify Modal. newDate (modalSelectedDate):',
        newDate
      );
      console.log(
        '[confirmarModal] Flow: Modify Modal. newTime (modalSelectedTime):',
        newTime
      );
    } else if (this.showAssignModal()) {
      newDate = currentTurno?.fecha
        ? new Date(`${currentTurno.fecha}T${currentTurno.hora}`)
        : null;
      newTime = currentTurno?.hora?.substring(0, 5) || '';
      console.log(
        '[confirmarModal] Flow: Assign Modal. newDate (from currentTurno):',
        newDate
      );
      console.log(
        '[confirmarModal] Flow: Assign Modal. newTime (from currentTurno):',
        newTime
      );
    } else {
      console.warn(
        '[confirmarModal] No modal is active. Aborting confirmation.'
      );
      this.notificacion.set({
        tipo: 'error',
        mensaje: 'No hay un modal activo para confirmar.',
      });
      return;
    }

    if (!currentTurno || !patientFromDropdown || !newDate || !newTime) {
      console.warn(
        '[confirmarModal] Validation failed: Missing essential data.'
      );
      this.notificacion.set({
        tipo: 'error',
        mensaje: 'Debe seleccionar un paciente, una fecha y una hora válidos.',
      });
      return;
    }

    // NEW: Check for time slot availability when modifying
    const formattedNewDate = this.turnosService.formatearFecha(newDate);
    const targetSlotId = `base-slot-${formattedNewDate}-${newTime}`;
    const allTurnos = this.turnosService.turnosSignal();
    const conflictingTurno = allTurnos.find(
      (t) =>
        t.id === targetSlotId &&
        t.estado !== 'DISPONIBLE' &&
        t.apiId !== currentTurno.apiId // Allow modifying the same slot
    );

    if (conflictingTurno) {
      const conflictMessage = `El horario ${newTime} del ${formattedNewDate} ya está ocupado o bloqueado. Por favor, elija otro horario.`;
      console.warn(
        '[confirmarModal] Conflicto de horario detectado:',
        conflictMessage
      );
      const userAcknowledged = await this.showCustomConfirm(conflictMessage);
      if (userAcknowledged) {
        this.modalSelectedTime.set('');
      }
      return;
    }

    const patientDataForAppointment: AppointmentPatientDto = {
      id: patientFromDropdown.id ?? null,
      firstName: patientFromDropdown.firstName,
      lastName: patientFromDropdown.lastName,
      phoneNumber: patientFromDropdown.phoneNumber,
      email: patientFromDropdown.email || null,
    };

    const turnoToSave: Turno = {
      ...currentTurno,
      paciente: patientDataForAppointment,
      telefono: patientDataForAppointment.phoneNumber,
      email: patientDataForAppointment.email || null,
      duracion: this.duracionTurno(),
      observaciones: this.observaciones().trim(),
      estado: 'CONFIRMADO',
      fecha: formattedNewDate,
      hora: newTime,
    };

    if (currentTurno.apiId) {
      turnoToSave.apiId = currentTurno.apiId;
    }

    console.log('[confirmarModal] Final turnoToSave object:', turnoToSave);

    try {
      console.log(
        '[confirmarModal] Attempting to save/modify appointment via service...'
      );
      await this.turnosService.saveOrUpdateAppointment(
        turnoToSave,
        patientDataForAppointment
      );
      this.cerrarModal();
      console.log(
        '[confirmarModal] Appointment saved/modified successfully. Modals closed.'
      );

      // NEW: If the appointment was moved to a different date, update the main agenda view
      const currentAgendaDate = this.turnosService.formatearFecha(
        this.turnosService.fechaSeleccionadaSignal()
      );
      if (formattedNewDate !== currentAgendaDate) {
        console.log(
          `[confirmarModal] Appointment moved from ${currentAgendaDate} to ${formattedNewDate}. Updating main agenda view.`
        );
        // This will trigger a reload of appointments for the new date and update fechaSeleccionadaSignal
        this.turnosService.seleccionarFecha(newDate);
      } else {
        // If the date didn't change, ensure the current day's agenda is refreshed
        await this.turnosService.refreshCurrentDayAppointments();
      }
    } catch (error: any) {
      console.error(
        '[confirmarModal] Error al guardar/modificar el turno:',
        error
      );

      let errorMessage = 'Error desconocido al guardar/modificar el turno.';
      if (
        error &&
        error.message &&
        typeof error.message === 'string' &&
        error.message.includes('ocupadas')
      ) {
        errorMessage =
          '¡Conflicto de horario! La fecha y hora seleccionadas ya están ocupadas por otro turno.';
      } else if (error && error.message) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('¡Conflicto de horario!')) {
        const userConfirmed = await this.showCustomConfirm(
          errorMessage + ' ¿Desea cerrar este mensaje y revisar la agenda?'
        );
        if (userConfirmed) {
          this.cerrarModal();
        }
      } else {
        this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
      }
    }
    console.log('[confirmarModal] --- FIN DE CONFIRMAR MODAL ---');
  }

  protected cancelarModal() {
    this.cerrarModal();
  }

  // --- Appointment Actions (from main view buttons) ---
  protected asignarTurno(turno: Turno) {
    if (turno.estado === 'DISPONIBLE') {
      console.log('[asignarTurno] Asignando turno disponible:', turno);
      this.abrirAsignarModal(turno);
    } else {
      this.notificacion.set({
        tipo: 'info',
        mensaje: 'Este turno no está disponible para asignación.',
      });
      console.log('[asignarTurno] Attempt to assign unavailable appointment.');
    }
  }

  protected modificarTurno(turno: Turno) {
    console.log('[modificarTurno] Clicked modify for turno:', turno);
    if (turno.estado === 'CONFIRMADO') {
      console.log(
        '[modificarTurno] Modifying confirmed appointment, calling abrirModificarModal:',
        turno
      );
      this.abrirModificarModal(turno);
    } else {
      this.notificacion.set({
        tipo: 'info',
        mensaje: 'Solo los turnos confirmados pueden ser modificados.',
      });
      console.log(
        '[modificarTurno] Attempt to modify unconfirmed appointment.'
      );
    }
  }

  protected async cancelarTurno(turnoId: string) {
    console.log('[cancelarTurno] Method called with turnoId:', turnoId); // NEW LOG
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno || turno.estado !== 'CONFIRMADO') {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se puede cancelar este turno o no está confirmado.' });
      console.warn('[cancelarTurno] Attempt to cancel invalid appointment.');
      return;
    }
    if (turno.apiId === undefined || turno.apiId === null) {
      this.notificacion.set({ tipo: 'error', mensaje: 'Este turno no tiene un ID de backend para cancelar.' });
      console.warn('[cancelarTurno] Attempt to cancel appointment without apiId.');
      return;
    }

    // Usar el modal de confirmación personalizado
    const userConfirmed = await this.showCustomConfirm('¿Está seguro de que desea cancelar este turno? Esta acción no se puede deshacer.');
    if (userConfirmed) {
      try {
        console.log('[cancelarTurno] Cancellation confirmation. Calling service for ID:', turno.apiId);
        await this.turnosService.cancelAppointment(turno.apiId);
        console.log('[cancelarTurno] Turno cancelado exitosamente. La UI debería refrescarse.');
      } catch (error: any) {
        console.error('Error al cancelar el turno:', error);
        const errorMessage = error.message || 'Error desconocido al cancelar el turno.';
        this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
      }
    }
  }

  protected async bloquearHora(turnoId: string) {
    console.log('[bloquearHora] Method called with turnoId:', turnoId); // NEW LOG
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno) {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se encontró el turno a bloquear.' });
      console.warn('[bloquearHora] Attempt to block unfound appointment.');
      return;
    }

    const fechaSeleccionada = this.turnosService.fechaSeleccionadaSignal();
    const [hours, minutes] = turno.hora.split(':').map(Number);
    const slotDateTime = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate(), hours, minutes, 0);

    // Usar el modal de confirmación personalizado
    const userConfirmed = await this.showCustomConfirm('¿Está seguro de que desea bloquear esta hora? Se volverá no disponible.');
    if (userConfirmed) {
      try {
        console.log('[bloquearHora] Block confirmation. Calling service for:', slotDateTime);
        await this.turnosService.toggleBlock(slotDateTime, true);
        console.log('[bloquearHora] Horario bloqueado exitosamente. La UI debería refrescarse.');
      } catch (error: any) {
        console.error('Error al bloquear el horario:', error);
        const errorMessage = error.message || 'Error desconocido al bloquear el horario.';
        this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
      }
    }
  }

  protected async desbloquearHora(turnoId: string) {
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno) {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se encontró el turno a desbloquear.' });
      console.warn('[desbloquearHora] Attempt to unblock unfound appointment.');
      return;
    }

    const fechaSeleccionada = this.turnosService.fechaSeleccionadaSignal();
    const [hours, minutes] = turno.hora.split(':').map(Number);
    const slotDateTime = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate(), hours, minutes, 0);

    // Usar el modal de confirmación personalizado
    const userConfirmed = await this.showCustomConfirm('¿Está seguro de que desea desbloquear esta hora? Se volverá disponible.');
    if (userConfirmed) {
      try {
        console.log('[desbloquearHora] Unblock confirmation. Calling service for:', slotDateTime);
        await this.turnosService.toggleBlock(slotDateTime, false);
        console.log('[desbloquearHora] Horario desbloqueado exitosamente. La UI debería refrescarse.');
      } catch (error: any) {
        console.error('Error al desbloquear el horario:', error);
        const errorMessage = error.message || 'Error desconocido al desbloquear el horario.';
        this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
      }
    }
  }

  // --- Métodos para el Modal de Notas de Sesión ---
  async openNotesModal(appointment: AppointmentResponseDto): Promise<void> {
    console.log(
      'DEBUG [openNotesModal]: Abriendo modal de notas para turno:',
      appointment
    );
    this.selectedAppointmentForNotes.set(appointment);

    // Inicializar las notas con las que ya tiene el turno (si existen)
    // Asumiendo que 'notes' es la propiedad en AppointmentResponseDto para las observaciones
    this.currentNotes.set(appointment.notes || '');

    // Si el turno tiene un paciente asociado y un número de teléfono, intenta cargar observaciones históricas
    if (
      appointment.patientName + ' ' + appointment.patientLastName &&
      appointment.patientPhoneNumber
    ) {
      console.log(
        `DEBUG [openNotesModal]: Intentando cargar observaciones para el paciente con teléfono: ${appointment.patientPhoneNumber}`
      );
      try {
        // FIX: PatientService does not have getPatientObservations. TurnosService does.
        const patientObservations = this.patientService.getPatientObservations(
          appointment.patientPhoneNumber
        );
        if (patientObservations) {
          // Si hay observaciones del paciente, las añadimos a las notas actuales.
          // Puedes decidir si las sobrescribes, las añades al inicio, al final, etc.
          // Aquí las añadimos al final, con un separador.
          const existingNotes = this.currentNotes();
          if (existingNotes) {
            this.currentNotes.set(
              `${existingNotes}\n\n--- Observaciones del Paciente ---\n${patientObservations}`
            );
          } else {
            this.currentNotes.set(
              `--- Observaciones del Paciente ---\n${patientObservations}`
            );
          }
          console.log(
            'DEBUG [openNotesModal]: Observaciones del paciente cargadas y añadidas.'
          );
        } else {
          console.log(
            'DEBUG [openNotesModal]: No se encontraron observaciones históricas para este paciente.'
          );
        }
      } catch (error) {
        console.error(
          'ERROR [openNotesModal]: Error al cargar observaciones del paciente:',
          error
        );
        this.notificacion.set({
          tipo: 'error',
          mensaje: 'Error al cargar observaciones históricas del paciente.',
        });
      }
    } else {
      console.log(
        'DEBUG [openNotesModal]: El turno no tiene paciente o número de teléfono para buscar observaciones históricas.'
      );
    }

    this.showNotesModal.set(true);
    console.log(
      'DEBUG [openNotesModal]: Notas finales cargadas en el modal:',
      this.currentNotes()
    );
  }

  closeNotesModal(): void {
    this.showNotesModal.set(false);
    this.selectedAppointmentForNotes.set(null);
    this.currentNotes.set(''); // Limpiar notas al cerrar
    console.log(
      'DEBUG [closeNotesModal]: Modal de notas cerrado y campos reseteados.'
    );
  }

  async saveNotes(): Promise<void> {
    const appointment = this.selectedAppointmentForNotes();
    if (
      !appointment ||
      appointment.id === undefined ||
      appointment.id === null
    ) {
      this.notificacion.set({
        tipo: 'error',
        mensaje: 'No se ha seleccionado un turno para guardar las notas.',
      });
      return;
    }

    const notesToSave = this.currentNotes();
    console.log(
      `DEBUG [saveNotes]: Guardando notas para turno ID ${appointment.id}:`,
      notesToSave
    );

    try {
      // Asumiendo que 'id' en AppointmentResponseDto es el apiId que necesita el backend
      await this.turnosService.updateAppointmentNotes(
        appointment.id,
        notesToSave
      );
      this.closeNotesModal();
      this.notificacion.set({
        tipo: 'success',
        mensaje: 'Notas guardadas exitosamente.',
      });
      // Opcional: Refrescar la agenda para que las notas se muestren si es necesario
      await this.turnosService.refreshCurrentDayAppointments();
    } catch (error) {
      console.error('ERROR [saveNotes]: Error al guardar las notas:', error);
      this.notificacion.set({
        tipo: 'error',
        mensaje: 'Error al guardar las notas.',
      });
    }
  }

  // NEW: Computed signal for available hours in the modify modal
  protected availableModalHours = computed(() => {
    const selectedDate = this.modalSelectedDate();
    const allTurnos = this.turnosService.turnosSignal(); // Turnos ya fusionados y actualizados
    const modifyingTurno = this.modalTurno(); // El turno que estamos modificando

    console.log(`[availableModalHours] Recalculando para fecha: ${selectedDate?.toDateString()}, Turno a modificar: ${modifyingTurno?.id} (apiId: ${modifyingTurno?.apiId})`);
    console.log('[availableModalHours] Turnos actuales en turnosService.turnosSignal():', allTurnos);

    if (!selectedDate) {
      return []; // No date selected, no hours available
    }

    const formattedSelectedDate = this.turnosService.formatearFecha(selectedDate);
    const hours: string[] = [];

    // Iterar a través de todas las horas posibles del día (8:00 a 22:00)
    for (let hour = 8; hour <= 22; hour++) {
      const formattedHour = (hour < 10 ? '0' : '') + hour + ':00';
      const slotId = `base-slot-${formattedSelectedDate}-${formattedHour}`;

      // Encontrar el turno existente para este slot (ya fusionado con los slots base y los del backend)
      const existingTurno = allTurnos.find((t) => t.id === slotId);

      // Determinar si es un "día/hora especial" (fin de semana o miércoles por la tarde)
      const isSpecialDayTime = 
        selectedDate.getDay() === 0 || // Domingo (0)
        selectedDate.getDay() === 6 || // Sábado (6)
        (selectedDate.getDay() === 3 && hour >= 13); // Miércoles (3) y la hora es 13:00 o más tarde

      console.log(`  - Procesando hora: ${formattedHour}, Es día/hora especial: ${isSpecialDayTime}`);

      // Lógica de disponibilidad:
      // 1. Si es el turno que se está modificando, siempre es seleccionable.
      if (modifyingTurno && existingTurno?.apiId === modifyingTurno.apiId) {
        hours.push(formattedHour);
        console.log(`    -> Añadido (es el turno a modificar): ${formattedHour}`);
      } 
      // 2. Si NO es un día/hora especial:
      //    Es disponible si no hay un turno existente (slot vacío) O si el turno existente está DISPONIBLE.
      else if (!isSpecialDayTime) {
        if (!existingTurno || existingTurno.estado === 'DISPONIBLE') {
          hours.push(formattedHour);
          console.log(`    -> Añadido (día/hora normal, slot vacío o DISPONIBLE): ${formattedHour}`);
        } else {
          console.log(`    -> Excluido (día/hora normal, slot ocupado/bloqueado): ${formattedHour}`);
        }
      } 
      // 3. Si ES un día/hora especial:
      //    Es disponible SÓLO si el turno existente está explícitamente DISPONIBLE.
      //    Esto significa que los slots base "BLOQUEADO" para estos días no se añadirán.
      else { // isSpecialDayTime is true
        if (existingTurno && existingTurno.estado === 'DISPONIBLE') {
          hours.push(formattedHour);
          console.log(`    -> Añadido (día/hora especial, slot DISPONIBLE): ${formattedHour}`);
        } else {
          console.log(`    -> Excluido (día/hora especial, slot no DISPONIBLE): ${formattedHour}`);
        }
      }
    }

    // Ordenar las horas para asegurar que estén en orden cronológico
    hours.sort((a, b) => {
      const [hA, mA] = a.split(':').map(Number);
      const [hB, mB] = b.split(':').map(Number);
      if (hA !== hB) return hA - hB;
      return mA - mB;
    });

    console.log('[availableModalHours] Horas disponibles finales:', hours);
    return hours;
  });
}
