// src/app/components/principal/principal.component.ts

import { Component, ViewChild, signal, OnInit, OnDestroy, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Import isPlatformBrowser
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CalendarComponent } from '../calendar/calendar.component';
import { HeaderComponent } from "../header/header.component";
import { TurnosService, Turno } from '../../services/turnos.service';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../interfaces/patient'; // Asegúrate de que esta ruta sea correcta

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent, HeaderComponent],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css'
})
export class PrincipalComponent implements OnInit, OnDestroy {

  @ViewChild('calendarComponent') calendar!: CalendarComponent; // This is for the main calendar

  public turnosService = inject(TurnosService); // Public to be accessible in HTML for initialDate
  private patientService = inject(PatientService);
  private destroy$ = new Subject<void>();

  // --- Signals para el estado de los Modales ---
  protected showAssignModal = signal(false); // Controls the "Assign" modal visibility
  protected showModifyModal = signal(false); // Controls the "Modify" modal visibility
  protected modalTurno = signal<Turno | null>(null); // Data of the appointment being operated on

  // --- Signals para la lista de Pacientes y el Paciente Seleccionado ---
  protected patientsList = signal<Patient[]>([]);
  protected selectedPatient = signal<Patient | null>(null);

  // Signals para los inputs del formulario dentro de los modales
  protected pacienteNombre = signal<string>(''); // Kept for compatibility/internal validation
  protected telefonoPaciente = signal<string>('');
  protected emailPaciente = signal<string>('');
  protected duracionTurno = signal<number>(50);
  protected observaciones = signal<string>('');

  // --- NEW SIGNALS FOR DATE/TIME IN THE MODIFY MODAL ---
  protected modalSelectedDate = signal<Date | null>(null);
  protected modalSelectedTime = signal<string>(''); // HH:mm format

  // --- Signals for Notifications ---
  protected notificacion = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  // Computed properties that observe service signals and update automatically
  protected turnos = computed(() => this.turnosService.turnosSignal());
  protected turnosPorPeriodo = computed(() => this.turnosService.turnosPorPeriodo());
  protected fechaSeleccionada = computed(() => this.turnosService.fechaSeleccionadaSignal());

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
          setTimeout(() => this.notificacion.set(null), 3000);
        }
      });

    this.loadPatients();
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
      if (this.showModifyModal() && this.modalTurno()?.estado === 'CONFIRMADO') {
          console.log('[loadPatients] Modify modal open and is CONFIRMADO, re-attempting to preload patient...');
          this.preloadPatientForModal(this.modalTurno()!);
      }
    } catch (error) {
      console.error('[loadPatients] Error al cargar pacientes:', error);
      this.notificacion.set({ tipo: 'error', mensaje: 'Error al cargar la lista de pacientes.' });
    }
  }

  // --- Method to handle patient selection in the dropdown ---
  protected onPatientSelected(event: Event) {
    const rawSelectedValue = (event.target as HTMLSelectElement).value;
    console.log(`[onPatientSelected] Valor RAW del dropdown: '${rawSelectedValue}' (tipo: ${typeof rawSelectedValue})`);

    let selectedId: number | null = null;

    if (rawSelectedValue && rawSelectedValue !== 'null' && rawSelectedValue !== 'undefined') {
        const parsedId = Number(rawSelectedValue);
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
        console.log('[onPatientSelected] Selección vacía o inválida (ID nulo). Campos reseteados.');
        return;
    }

    const patient = this.patientsList().find(p => p.id === selectedId);
    this.selectedPatient.set(patient || null);

    this.telefonoPaciente.set(patient?.phoneNumber || '');
    this.emailPaciente.set(patient?.email || '');
    this.pacienteNombre.set(`${patient?.firstName || ''} ${patient?.lastName || ''}`.trim());

    console.log('[onPatientSelected] Paciente seleccionado (signal):', this.selectedPatient());
    console.log('[onPatientSelected] Teléfono actualizado (signal):', this.telefonoPaciente());
    console.log('[onPatientSelected] Email actualizado (signal):', this.emailPaciente());
  }

  // --- Methods for Main Calendar Interaction ---
  toggleCalendar() {
    this.calendar.onToggleClick();
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
      case 'CONFIRMADO': return 'Confirmado';
      case 'CANCELADO': return 'Cancelado';
      case 'REALIZADO': return 'Realizado';
      case 'EN_CURSO': return 'En curso';
      default: return 'Estado desconocido';
    }
  }

  protected limpiarNotificacion() {
    this.notificacion.set(null);
  }

  // --- Logic for Opening Specific Modals ---

  protected abrirAsignarModal(turno: Turno) {
    console.log('[abrirAsignarModal] Abriendo modal para asignar turno:', turno);
    this.modalTurno.set(turno);

    this.selectedPatient.set(null);
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.emailPaciente.set('');
    this.duracionTurno.set(50);
    this.observaciones.set('');

    const initialModalDate = new Date(`${turno.fecha}T${turno.hora}`);
    this.modalSelectedDate.set(initialModalDate);
    this.modalSelectedTime.set(turno.hora.substring(0, 5));

    this.showAssignModal.set(true);
    this.showModifyModal.set(false);
    console.log('[abrirAsignarModal] Assign modal opened. showAssignModal state:', this.showAssignModal());
  }

  protected abrirModificarModal(turno: Turno) {
    console.log('[abrirModificarModal] Abriendo modal para modificar turno:', turno);
    this.modalTurno.set(turno);

    this.selectedPatient.set(null);
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.emailPaciente.set('');
    this.duracionTurno.set(turno.duracion || 50);
    this.observaciones.set(turno.observaciones || '');

    const initialModalDate = turno.fecha && turno.hora ? new Date(`${turno.fecha}T${turno.hora}`) : this.turnosService.fechaSeleccionadaSignal();
    this.modalSelectedDate.set(initialModalDate);
    this.modalSelectedTime.set(turno.hora ? turno.hora.substring(0, 5) : '08:00');

    console.log('[abrirModificarModal] Initial modal date and time signals set to:', this.modalSelectedDate(), this.modalSelectedTime());

    if (turno.estado === 'CONFIRMADO') {
        console.log('[abrirModificarModal] Appointment is CONFIRMADO. Attempting to preload patient.');
        this.preloadPatientForModal(turno);
    }

    this.showModifyModal.set(true);
    this.showAssignModal.set(false);
    console.log('[abrirModificarModal] Modify modal opened. showModifyModal state:', this.showModifyModal());
  }

  private preloadPatientForModal(turno: Turno) {
    console.log('[preloadPatientForModal] Starting preload for appointment:', turno);
    if (this.patientsList().length === 0) {
        console.warn('[preloadPatientForModal] patientsList is empty. Preloading may fail. Ensure patients are loaded before opening the modal for modification.');
    }

    const patientFullName = turno.paciente?.trim();

    const foundPatient = this.patientsList().find(p =>
        p.phoneNumber === turno.telefono &&
        `${p.firstName} ${p.lastName}`.trim() === patientFullName
    );

    if (foundPatient) {
        console.log('[preloadPatientForModal] Patient found in list:', foundPatient);
        this.selectedPatient.set(foundPatient);
        this.pacienteNombre.set(`${foundPatient.firstName} ${foundPatient.lastName}`.trim());
        this.telefonoPaciente.set(foundPatient.phoneNumber);
        this.emailPaciente.set(foundPatient.email || '');
    } else {
        console.warn('[preloadPatientForModal] Appointment patient NOT found in the loaded patient list.');
        console.log('   Appointment data:', { paciente: turno.paciente, telefono: turno.telefono, email: turno.email });
        console.log('   Available patients:', this.patientsList());
        this.pacienteNombre.set(turno.paciente || '');
        this.telefonoPaciente.set(turno.telefono || '');
        this.emailPaciente.set(turno.email || '');
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

  // --- Modal Confirmation Logic ---
  protected async confirmarModal() {
    const currentTurno = this.modalTurno();
    const patientToAssign = this.selectedPatient();
    let newDate: Date | null = null;
    let newTime: string = '';

    console.log('[confirmarModal] --- INICIO DE CONFIRMAR MODAL ---');
    console.log('[confirmarModal] currentTurno:', currentTurno);
    console.log('[confirmarModal] patientToAssign (selectedPatient signal):', patientToAssign);

    // Determine the date and time based on the active modal
    if (this.showModifyModal()) { // If it's the modify modal
        newDate = this.modalSelectedDate();
        newTime = this.modalSelectedTime();
        console.log('[confirmarModal] Flow: Modify Modal. newDate (modalSelectedDate):', newDate);
        console.log('[confirmarModal] Flow: Modify Modal. newTime (modalSelectedTime):', newTime);
    } else if (this.showAssignModal()) { // If it's the assign modal
        // For assigning, date and time come from the original slot of modalTurno
        newDate = currentTurno?.fecha ? new Date(`${currentTurno.fecha}T${currentTurno.hora}`) : null;
        newTime = currentTurno?.hora?.substring(0, 5) || '';
        console.log('[confirmarModal] Flow: Assign Modal. newDate (from currentTurno):', newDate);
        console.log('[confirmarModal] Flow: Assign Modal. newTime (from currentTurno):', newTime);
    } else {
        console.warn('[confirmarModal] No modal is active. Aborting confirmation.');
        this.notificacion.set({ tipo: 'error', mensaje: 'No hay un modal activo para confirmar.' });
        return;
    }

    // --- Validation before proceeding ---
    if (!currentTurno || !patientToAssign || !newDate || !newTime) {
      console.warn('[confirmarModal] Validation failed: Missing essential data.');
      console.log('   currentTurno:', currentTurno);
      console.log('   patientToAssign:', patientToAssign);
      console.log('   newDate:', newDate);
      console.log('   newTime:', newTime);
      this.notificacion.set({ tipo: 'error', mensaje: 'Debe seleccionar un paciente, una fecha y una hora válidos.' });
      return;
    }

    // --- STEP 1: Prepare and Update Patient Data (if changed) ---
    let patientUpdated = false;
    let updatedPatientData: Patient = { ...patientToAssign };

    console.log('[confirmarModal] Current telefonoPaciente signal:', this.telefonoPaciente());
    console.log('[confirmarModal] Original patientToAssign.phoneNumber:', patientToAssign.phoneNumber);
    console.log('[confirmarModal] Current emailPaciente signal:', this.emailPaciente());
    console.log('[confirmarModal] Original patientToAssign.email:', patientToAssign.email);

    if (this.telefonoPaciente() !== updatedPatientData.phoneNumber ||
        this.emailPaciente() !== (updatedPatientData.email || '')) {

        updatedPatientData.phoneNumber = this.telefonoPaciente();
        updatedPatientData.email = this.emailPaciente();
        patientUpdated = true;
        console.log('[confirmarModal] Patient data detected as modified. updatedPatientData:', updatedPatientData);
    }

    if (patientUpdated) {
        try {
            console.log('[confirmarModal] Attempting to update patient data via service...');
            await this.patientService.updatePatient(updatedPatientData);
            this.notificacion.set({ tipo: 'success', mensaje: 'Datos del paciente actualizados.' });
            console.log('[confirmarModal] Patient data updated successfully. Reloading patients list...');
            await this.loadPatients();
        } catch (error) {
            console.error('[confirmarModal] Error al actualizar los datos del paciente:', error);
            this.notificacion.set({ tipo: 'error', mensaje: 'Error al actualizar los datos del paciente.' });
            return;
        }
    } else {
        console.log('[confirmarModal] No patient data modification detected. Skipping patient update.');
    }

    // --- STEP 2: Prepare and Save/Update Appointment ---
    const turnoToSave: Turno = {
      ...currentTurno,
      paciente: `${updatedPatientData.firstName} ${updatedPatientData.lastName}`.trim(),
      telefono: updatedPatientData.phoneNumber,
      email: updatedPatientData.email || '',
      duracion: this.duracionTurno(),
      observaciones: this.observaciones().trim(),
      estado: 'CONFIRMADO',
      fecha: this.turnosService.formatearFecha(newDate),
      hora: newTime
    };

    if (currentTurno.apiId) {
      turnoToSave.apiId = currentTurno.apiId;
    }

    console.log('[confirmarModal] Final turnoToSave object:', turnoToSave);

    try {
      console.log('[confirmarModal] Attempting to save/modify appointment via service...');
      await this.turnosService.saveOrUpdateAppointment(turnoToSave, updatedPatientData);
      this.cerrarModal();
      console.log('[confirmarModal] Appointment saved/modified successfully. Modals closed.');
    } catch (error: any) { // Capturamos el error para manejarlo
      console.error('[confirmarModal] Error al guardar/modificar el turno:', error);

      let errorMessage = 'Error desconocido al guardar/modificar el turno.';
      // Intentamos analizar el error para ver si es un conflicto
      if (error && error.error && typeof error.error === 'string' && error.error.includes('La fecha y hora seleccionadas ya están ocupadas')) {
          errorMessage = '¡Conflicto de horario! La fecha y hora seleccionadas ya están ocupadas por otro turno.';
      } else if (error && error.message) {
          errorMessage = error.message;
      }
      this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
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
      this.notificacion.set({ tipo: 'info', mensaje: 'Este turno no está disponible para asignación.' });
      console.log('[asignarTurno] Attempt to assign unavailable appointment.');
    }
  }

  protected modificarTurno(turno: Turno) {
    console.log('[modificarTurno] Clicked modify for turno:', turno);
    if (turno.estado === 'CONFIRMADO') {
      console.log('[modificarTurno] Modifying confirmed appointment, calling abrirModificarModal:', turno);
      this.abrirModificarModal(turno);
    } else {
      this.notificacion.set({ tipo: 'info', mensaje: 'Solo los turnos confirmados pueden ser modificados.' });
      console.log('[modificarTurno] Attempt to modify unconfirmed appointment.');
    }
  }

  protected async cancelarTurno(turnoId: string) {
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

    if (confirm('¿Está seguro de que desea cancelar este turno? Esta acción no se puede deshacer.')) {
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
    const turno = this.turnosService.turnosSignal().find(t => t.id === turnoId);
    if (!turno) {
      this.notificacion.set({ tipo: 'error', mensaje: 'No se encontró el turno a bloquear.' });
      console.warn('[bloquearHora] Attempt to block unfound appointment.');
      return;
    }

    const fechaSeleccionada = this.turnosService.fechaSeleccionadaSignal();
    const [hours, minutes] = turno.hora.split(':').map(Number);
    const slotDateTime = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate(), hours, minutes, 0);

    if (confirm('¿Está seguro de que desea bloquear esta hora? Se volverá no disponible.')) {
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

    if (confirm('¿Está seguro de que desea desbloquear esta hora? Se volverá disponible.')) {
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
}