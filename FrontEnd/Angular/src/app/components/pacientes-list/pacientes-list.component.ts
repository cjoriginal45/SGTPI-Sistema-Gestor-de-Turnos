import { Component, computed, signal, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../interfaces/patient'; // Asegúrate de que esta ruta sea correcta
import { PatientService } from '../../services/patient.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { PatientObservation } from '../../interfaces/PatientObservation'; // Asegúrate de que esta ruta sea correcta
import { AppointmentRequestDto } from '../../interfaces/AppointmentRequestDto'; // Asegúrate de que esta ruta sea correcta
import { AppointmentResponseDto } from '../../interfaces/AppointmentResponseDto'; // Asegúrate de que esta ruta sea correcta
import {TurnosService } from '../../services/turnos.service'; // Asegúrate de que esta ruta sea correcta y que Turno se exporte desde turnos.service.ts o su propia interfaz
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Turno } from '../../interfaces/Turno';
import { AppointmentPatientDto } from '../../interfaces/AppointmentPatientDto';



@Component({
  selector: 'app-pacientes-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FormsModule,
    CalendarComponent,
    DatePipe
  ],
  templateUrl: './pacientes-list.component.html',
  styleUrls: ['./pacientes-list.component.css']
})
export class PatientsListComponent implements OnInit, OnDestroy {

  // Signals for patient registration form
  firstName = signal('');
  lastName = signal('');
  phoneNumber = signal('');
  email = signal('');

  // Signal for general patient registration modal
  showModal = signal(false);

  // List of patients
  patients = signal<AppointmentPatientDto[]>([]);

  // Signal for search term
  searchTerm = signal('');

  // --- Signals for Assign Appointment Modal ---
  showAssignAppointmentModal = signal(false);
  selectedPatientForAppointment = signal<AppointmentPatientDto | null>(null);
  selectedAppointmentDate = signal<Date | null>(null);
  selectedAppointmentTime = signal<string | null>(null);
  selectedDuration = signal<number | null>(null); // Inicializar a null para forzar selección
  availableTimeSlots = signal<string[]>([]);
  
  // Notificaciones
  protected notificacion = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);
  private destroy$ = new Subject<void>(); // Para gestionar las suscripciones

  filteredPatients = signal<AppointmentPatientDto[]>([]);
  // --- Signals for Add Notes Modal ---
  showAddNotesModal = signal(false);
  selectedPatientForNotes = signal<AppointmentPatientDto | null>(null);
  patientNotes = signal('');
  // REMOVIDO: patientObservations ya no se usa para una única nota de texto.

  constructor(
    private patientService: PatientService,
    private turnosService: TurnosService
  ) {}

  ngOnInit() {
    this.loadPatients();
    // Suscribirse a las notificaciones del TurnosService
    this.turnosService.notificaciones
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        this.notificacion.set(notif);
        if (notif) {
          setTimeout(() => this.notificacion.set(null), 3000);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadPatients() {
    try {
      const data = await this.patientService.getPatients();
      console.log('DEBUG: Raw data from getPatients() backend:', data);
      this.patients.set(data);
      this.filterPatients();
      console.log('DEBUG: Patients signal after update:', this.patients());
      console.log('DEBUG: FilteredPatients signal after update:', this.filteredPatients());
    } catch (err: any) {
      console.error('Error al cargar pacientes', err);
      this.notificacion.set({ tipo: 'error', mensaje: 'Error al cargar la lista de pacientes.' });
    }
  }

  openRegisterModal() {
    this.firstName.set('');
    this.lastName.set('');
    this.phoneNumber.set('');
    this.email.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  registerPatient() {
    if (!this.firstName() || !this.lastName() || !this.phoneNumber()) {
      this.notificacion.set({ tipo: 'error', mensaje: 'Por favor complete los campos obligatorios: Nombre, Apellido y Teléfono.' });
      return;
    }

    const patientToRegister: Patient = {
      firstName: this.firstName(),
      lastName: this.lastName(),
      phoneNumber: this.phoneNumber(),
      email: this.email()
    };

    console.log('Datos a enviar:', patientToRegister);

    this.patientService.createPatient(patientToRegister).subscribe({
      next: (createdPatient) => {
        console.log('Paciente registrado:', createdPatient);
        this.notificacion.set({ tipo: 'success', mensaje: 'Paciente registrado con éxito!' });
        this.loadPatients();
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error completo:', error);
        const errorMessage = error.error?.message || error.message || 'Error desconocido al registrar el paciente.';
        this.notificacion.set({ tipo: 'error', mensaje: `Error al registrar: ${errorMessage}` });
      }
    });
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const term = input.value.toLowerCase();
    this.searchTerm.set(term);
    this.filterPatients();
  }

  private filterPatients() {
    const term = this.searchTerm().toLowerCase();
    const allPatients = this.patients();
    const filtered = allPatients.filter(patient => {
      const firstNameMatch = patient.firstName?.toLowerCase().includes(term);
      const lastNameMatch = patient.lastName?.toLowerCase().includes(term);
      const emailMatch = patient.email?.toLowerCase().includes(term);
      const phoneMatch = patient.phoneNumber?.toString().includes(term);
      return firstNameMatch || lastNameMatch || emailMatch || phoneMatch;
    });
    this.filteredPatients.set(filtered);
  }


  assignAppointment(patientPhoneNumber: string) {
    console.log('DEBUG (assignAppointment): Método llamado para patientPhoneNumber:', patientPhoneNumber);

    const patient = this.patients().find(p => p.phoneNumber === patientPhoneNumber);

    if (patient) {
      console.log('DEBUG (assignAppointment): Paciente encontrado:', patient);
      this.selectedPatientForAppointment.set(patient);
      this.selectedAppointmentDate.set(null);
      this.selectedAppointmentTime.set(null);
      this.availableTimeSlots.set([]);
      this.selectedDuration.set(null);
      this.showAssignAppointmentModal.set(true);
      console.log('DEBUG (assignAppointment): showAssignAppointmentModal se establece a true.');
    } else {
      console.error(`ERROR (assignAppointment): Paciente con teléfono ${patientPhoneNumber} no encontrado en la lista local.`);
      this.notificacion.set({ tipo: 'error', mensaje: 'Error interno: El paciente no pudo ser seleccionado para asignar un turno.' });
    }
  }

  closeAssignAppointmentModal() {
    this.showAssignAppointmentModal.set(false);
    this.selectedPatientForAppointment.set(null);
    this.selectedDuration.set(null);
  }

  async onDateSelected(date: Date) {
    this.selectedAppointmentDate.set(date);
    this.selectedAppointmentTime.set(null);
    this.availableTimeSlots.set([]);

    const formattedDate = this.turnosService.formatearFecha(date);

    try {
      // Obtener la lista de turnos fusionada (base del frontend + turnos del backend)
      // Esta lista ya contendrá los slots virtualmente bloqueados con estado 'BLOQUEADO'
      // y los slots ocupados por el backend con estado 'CONFIRMADO' o 'BLOQUEADO'.
      const mergedTurnos: Turno[] = await this.turnosService.getTurnosPorFecha(formattedDate);
      console.log('DEBUG: Turnos fusionados para la fecha seleccionada:', mergedTurnos);

      // Filtrar para mostrar solo los horarios que tienen estado 'DISPONIBLE'
      // Esto significa que los slots virtualmente bloqueados (estado 'BLOQUEADO')
      // no aparecerán en el dropdown a menos que su estado cambie a 'DISPONIBLE'
      // a través de una acción como "desbloquear" en la agenda.
      const filteredSlots: string[] = mergedTurnos
          .filter(turno => turno.estado === 'DISPONIBLE')
          .map(turno => turno.hora);

      this.availableTimeSlots.set(filteredSlots);

      if (filteredSlots.length === 0) {
        this.notificacion.set({ tipo: 'info', mensaje: 'No hay horarios disponibles para esta fecha.' });
      }
    } catch (err: any) {
      console.error('Error al cargar turnos para filtrar:', err);
      this.notificacion.set({ tipo: 'error', mensaje: 'Error al cargar la disponibilidad de turnos.' });
      this.availableTimeSlots.set([]);
    }
  }

  async saveAppointment() {
    const patient = this.selectedPatientForAppointment();
    const date = this.selectedAppointmentDate();
    const time = this.selectedAppointmentTime();
    // FIX: Ensure duration is always a number
    const duration = Number(this.selectedDuration()); 

    console.log('DEBUG (saveAppointment): Duración seleccionada:', duration, typeof duration);
    console.log('DEBUG (saveAppointment): Horario seleccionado para guardar:', time);
    console.log('DEBUG (saveAppointment): Horarios disponibles en el frontend (availableTimeSlots) en el momento de la submission:', this.availableTimeSlots());

    // Validar que el horario seleccionado esté en la lista de horarios disponibles del frontend
    // Si el horario no está en availableTimeSlots, significa que ya fue filtrado por onDateSelected
    // (ya sea por bloqueo virtual o por ocupación del backend).
    if (time && !this.availableTimeSlots().includes(time)) {
        this.notificacion.set({ tipo: 'error', mensaje: 'El horario seleccionado no está disponible. Por favor, elija otro.' });
        return;
    }

    // Validar campos obligatorios
    // FIX: Check if duration is a valid number (not NaN from Number(null))
    if (!patient || !patient.phoneNumber || !date || !time || isNaN(duration) || duration === null) {
      this.notificacion.set({ tipo: 'error', mensaje: 'Por favor, complete todos los campos: paciente, fecha, hora y duración.' });
      return;
    }

    const formattedDate = this.turnosService.formatearFecha(date);
    const formattedTime = `${time}:00`; // Asegurarse de que tenga segundos

    // Obtener la última versión fusionada de turnos (base del frontend + backend)
    // Esto es CRÍTICO para que la validación tenga en cuenta los bloqueos virtuales del frontend
    // y los turnos reales del backend.
    const turnosDelDia = await this.turnosService.getTurnosPorFecha(formattedDate);
    console.log('DEBUG (saveAppointment): turnosDelDia (fusionados) en el momento de la submission:', turnosDelDia);

    // Buscar el turno específico que el usuario intentó seleccionar en la lista fusionada
    const selectedTimeSlotInMergedSchedule = turnosDelDia.find(t => {
        // Asegurarse de comparar solo la hora (HH:MM)
        return t.hora.substring(0, 5) === time;
    });

    // Validar el estado del slot seleccionado en la lista fusionada
    if (selectedTimeSlotInMergedSchedule) {
        if (selectedTimeSlotInMergedSchedule.estado === 'BLOQUEADO') {
            this.notificacion.set({ tipo: 'error', mensaje: 'Error: La franja horaria seleccionada está bloqueada y no se puede asignar un turno.' });
            return; // Detener la ejecución
        } else if (selectedTimeSlotInMergedSchedule.estado === 'CONFIRMADO') {
            this.notificacion.set({ tipo: 'error', mensaje: 'Error: La fecha y hora seleccionadas ya están ocupadas por otro turno confirmado.' });
            return; // Detener la ejecución
        }
        // Si el estado es 'CANCELADO' o 'REALIZADO', se asume que está disponible para ser asignado.
        // Si es 'DISPONIBLE', también se procede.
    } else {
        // Esto no debería ocurrir si el 'time' proviene de 'availableTimeSlots()',
        // pero es una validación de seguridad extra.
        this.notificacion.set({ tipo: 'error', mensaje: 'El horario seleccionado no es válido o no se encontró en la agenda.' });
        return;
    }

    const patientDtoForAppointment: AppointmentPatientDto  = {
      id: patient.id || null,
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phoneNumber: patient.phoneNumber || '',
      email: patient.email || '',
      state: 'CONFIRMADO' // Siempre crear como CONFIRMADO desde aquí
    };

    // Determine whether to create a new appointment or update an existing one
    if (selectedTimeSlotInMergedSchedule.apiId) {
        // If apiId exists, it means this slot was previously managed by the backend
        // (e.g., it was CONFIRMADO, then CANCELADO/DESBLOQUEADO, and now we're re-assigning it).
        // Update the existing backend record.
        const turnoToUpdate: Turno = {
            ...selectedTimeSlotInMergedSchedule, // Keep existing ID, fecha, hora, etc.
            estado: 'CONFIRMADO', // Set to CONFIRMADO
            paciente: patient, // Assign the new patient
            duracion: duration, // Use the converted duration
            observaciones: '' // Clear or update notes as needed
        };
        console.log('Intentando actualizar turno existente:', turnoToUpdate);
        try {
            const response = await this.turnosService.saveOrUpdateAppointment(turnoToUpdate, patientDtoForAppointment);
            console.log('Turno actualizado exitosamente:', response);
            this.notificacion.set({ tipo: 'success', mensaje: `Turno actualizado para el ${formattedDate} correctamente.` });
            this.closeAssignAppointmentModal();
        } catch (error: any) {
            console.error('Error al actualizar turno:', error);
            const errorMessage = error.message || 'Error desconocido al actualizar el turno.';
            this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
        }
    } else {
        // If apiId does NOT exist, it's a truly new slot that was only generated by the frontend.
        // Create a new appointment in the backend.
        const appointmentToCreate: AppointmentRequestDto = {
            duration: duration, // Use the converted duration
            fecha: formattedDate,
            hora: formattedTime,
            patient: patientDtoForAppointment,
            state: 'CONFIRMADO', // Always create as CONFIRMADO from here
            sessionNotes: '' // Initially empty, can be updated later
        };
        console.log('Intentando crear turno nuevo:', appointmentToCreate);
        try {
            const response = await this.turnosService.createAppointment({
                ...appointmentToCreate,
                patient: patientDtoForAppointment
            });
            console.log('Turno creado exitosamente:', response);
            this.notificacion.set({ tipo: 'success', mensaje: `Turno agendado para el ${response.fecha} correctamente.` });
            this.closeAssignAppointmentModal();
        } catch (error: any) {
            console.error('Error al agendar turno:', error);
            const errorMessage = error.message || 'Error desconocido al agendar el turno.';
            this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
        }
    }
  }

  addNotes(patientPhoneNumber: string) {
    const patient = this.patients().find(p => p.phoneNumber === patientPhoneNumber);
  
    if (!patient) {
      this.notificacion.set({ tipo: 'error', mensaje: 'Error interno: No se pudo seleccionar el paciente correctamente para agregar notas.' });
      return; 
    }

    this.selectedPatientForNotes.set(patient);
    this.patientNotes.set('');

    this.patientService.getPatientObservations(patient.phoneNumber).subscribe({
      next: (notes: string | null) => {
        this.patientNotes.set(notes || '');
        console.log(`[addNotes] Notas cargadas para ${patient.firstName}:`, notes);
        this.showAddNotesModal.set(true);
      },
      error: (error: HttpErrorResponse) => {
        console.error(`Error al cargar notas para el paciente ${patient.firstName}:`, error);
        this.notificacion.set({ tipo: 'error', mensaje: 'Error al cargar notas del paciente.' });
        this.patientNotes.set('');
        this.showAddNotesModal.set(true);
      }
    });
  }

  closeAddNotesModal() {
    this.showAddNotesModal.set(false);
    this.selectedPatientForNotes.set(null);
    this.patientNotes.set('');
  }

  saveNotes() {
    const patient = this.selectedPatientForNotes();
    const newNoteContent = this.patientNotes();

    if (newNoteContent.trim() === '') {
      this.notificacion.set({ tipo: 'error', mensaje: 'La nota no puede estar vacía.' });
      return;
    }

    if (!patient || !patient.phoneNumber) {
      this.notificacion.set({ tipo: 'error', mensaje: 'Error interno: No se pudo identificar al paciente correctamente para guardar la nota.' });
      return;
    }

    const observationToSave: PatientObservation = {
      phoneNumber: patient.phoneNumber,
      observations: newNoteContent
    };

    this.patientService.savePatientObservation(observationToSave).subscribe({
      next: (successMessage: string) => {
        console.log('DEBUG (saveNotes): Backend success response:', successMessage);
        this.notificacion.set({ tipo: 'success', mensaje: `Nota guardada para ${patient.firstName} ${patient.lastName} correctamente.` });
        this.closeAddNotesModal();
      },
      error: (error: HttpErrorResponse) => {
        console.error('ERROR (saveNotes): Error al guardar la nota (backend):', error);
        const errorMessage = error.error?.message || error.message || 'Error desconocido al guardar la nota.';
        this.notificacion.set({ tipo: 'error', mensaje: errorMessage });
      }
    });
  }
}
