// src/app/components/patient-details/patient-details.component.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TurnosService } from '../../services/turnos.service';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../interfaces/patient';
import { HeaderComponent } from '../header/header.component';
import { AppointmentResponseDto } from '../../interfaces/AppointmentResponseDto';

@Component({
  selector: 'app-patient-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    DatePipe
  ],
  templateUrl: './patient-details.component.html',
  styleUrl: './patient-details.component.css'
})
export class PatientDetailsComponent implements OnInit {

  // --- Inyecciones de Servicios ---
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private patientService = inject(PatientService);
  private turnosService = inject(TurnosService);

  // --- Señales para la información del Paciente ---
  patientId = signal<number | null>(null);
  patient = signal<Patient | null>(null);
  isEditingPatient = signal(false);

  // Señales para los campos editables (se inicializan con los valores del paciente)
  editedFirstName = signal('');
  editedLastName = signal('');
  editedPhoneNumber = signal('');
  editedEmail = signal('');

  // --- Señales para el Historial de Turnos ---
  appointments = signal<AppointmentResponseDto[]>([]);

  // --- Señales para el Modal de Notas de Sesión ---
  showNotesModal = signal(false);
  selectedAppointmentForNotes = signal<AppointmentResponseDto | null>(null);
  currentNotes = signal('');

  // NEW: Computed signal for displaying appointments with 'REALIZADO' status
  displayedAppointments = computed(() => {
    const now = new Date(); // Get current date/time once for consistency within this computation
    now.setSeconds(0); // Ignore seconds for comparison
    now.setMilliseconds(0); // Ignore milliseconds for comparison

    return this.appointments().map(appointment => {
      // Ensure fecha is in YYYY-MM-DD format for reliable parsing with 'T' and time
      // This step is now handled in loadPatientAppointments, but kept for robustness
      let formattedFecha = appointment.fecha;
      if (formattedFecha && formattedFecha.includes('/')) { // Basic check for DD/MM/YYYY or MM/DD/YYYY
        const parts = formattedFecha.split('/');
        if (parts.length === 3) {
          // Assuming DD/MM/YYYY. If it's MM/DD/YYYY, swap parts[0] and parts[1]
          formattedFecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const appointmentDateTime = new Date(`${formattedFecha}T${appointment.hora}`);
      appointmentDateTime.setSeconds(0); // Ignore seconds for comparison
      appointmentDateTime.setMilliseconds(0); // Ignore milliseconds for comparison

      console.log(`DEBUG: Turno ID: ${appointment.id}`);
      console.log(`DEBUG: Fecha original (del backend): ${appointment.fecha}, Hora original: ${appointment.hora}`);
      console.log(`DEBUG: Fecha formateada (para Date obj): ${formattedFecha}`);
      console.log(`DEBUG: appointmentDateTime (parsed): ${appointmentDateTime.toISOString()}`);
      console.log(`DEBUG: now (current): ${now.toISOString()}`);
      console.log(`DEBUG: Comparación (appointmentDateTime < now): ${appointmentDateTime < now}`);
      console.log(`DEBUG: Estado original: ${appointment.state}`);

      // Check if the appointment is 'CONFIRMADO' and in the past
      if (appointment.state === 'CONFIRMADO' && appointmentDateTime < now) {
        console.log(`DEBUG: Turno ${appointment.id} es CONFIRMADO y pasado. Cambiando a REALIZADO.`);
        return { ...appointment, estado: 'REALIZADO' };
      }
      console.log(`DEBUG: Turno ${appointment.id} NO cambia. Estado final: ${appointment.state}`);
      // Otherwise, return the original appointment
      return appointment;
    });
  });

  // --- Señal para Notificaciones (opcional, si no usas un servicio global) ---
  notification = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  // --- Señal para el estado de carga (NUEVO) ---
  loading = signal(false); // Inicialmente en false

  constructor() { }

  ngOnInit(): void {
    // Obtener el ID del paciente de la URL
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      let patientIdNum: number;

      if (idParam) {
        const cleanedIdParam = idParam.replace(/\D/g, '');
        patientIdNum = Number(cleanedIdParam);
      } else {
        patientIdNum = NaN;
      }

      if (!isNaN(patientIdNum)) {
        this.patientId.set(patientIdNum);
        this.loadPatientDetails(patientIdNum);
        this.loadPatientAppointments(patientIdNum);
      } else {
        let errorMessage = 'No se proporcionó un ID de paciente válido en la URL.';
        if (idParam === null) {
          errorMessage = 'El ID del paciente está ausente en la URL. Asegúrate de pasar un ID.';
        } else if (idParam && isNaN(patientIdNum)) {
          errorMessage = `El ID del paciente en la URL ('${idParam}') no es un número válido.`;
        }
        console.error(errorMessage);
        this.showNotification('error', errorMessage + ' Redirigiendo a la lista de pacientes.');
        setTimeout(() => {
          this.router.navigate(['/pacientes']);
        }, 2000);
      }
    });
  }

  // --- Métodos de Carga de Datos ---
  async loadPatientDetails(id: number): Promise<void> {
    this.loading.set(true); // Activar loading
    try {
      const patientData = await this.patientService.getPatientById(id);
      this.patient.set(patientData);
      this.editedFirstName.set(patientData.firstName || '');
      this.editedLastName.set(patientData.lastName || '');
      this.editedPhoneNumber.set(patientData.phoneNumber || '');
      this.editedEmail.set(patientData.email || '');
      console.log('Detalles del paciente cargados:', patientData);
    } catch (error) {
      console.error('Error al cargar los detalles del paciente:', error);
      this.showNotification('error', 'Error al cargar los detalles del paciente.');
      this.patient.set(null);
    } finally {
      this.loading.set(false); // Desactivar loading al finalizar (éxito o error)
    }
  }

  async loadPatientAppointments(patientId: number): Promise<void> {
    this.loading.set(true); // Activar loading
    try {
      const patientAppointments = await this.turnosService.getAppointmentsByPatientId(patientId);
      const sortedAppointments = patientAppointments.sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora}`);
        const dateB = new Date(`${b.fecha}T${b.hora}`);
        return dateB.getTime() - dateA.getTime();
      });
      this.appointments.set(sortedAppointments);
      console.log('Historial de turnos del paciente cargado:', sortedAppointments);
    } catch (error) {
      console.error('Error al cargar el historial de turnos:', error);
      this.showNotification('error', 'Error al cargar el historial de turnos.');
      this.appointments.set([]);
    } finally {
      this.loading.set(false); // Desactivar loading al finalizar (éxito o error)
    }
  }

  // --- Métodos para Editar Datos del Paciente ---
  toggleEditPatient(): void {
    this.isEditingPatient.set(!this.isEditingPatient());
    if (!this.isEditingPatient() && this.patient()) {
      this.editedFirstName.set(this.patient()!.firstName || '');
      this.editedLastName.set(this.patient()!.lastName || '');
      this.editedPhoneNumber.set(this.patient()!.phoneNumber || '');
      this.editedEmail.set(this.patient()!.email || '');
    }
  }

  async savePatient(): Promise<void> {
    const patientData = this.patient();
    if (!patientData || !patientData.id) {
      this.showNotification('error', 'No hay datos de paciente para guardar.');
      return;
    }

    const updatedPatient: Patient = {
      id: patientData.id,
      firstName: this.editedFirstName(),
      lastName: this.editedLastName(),
      phoneNumber: this.editedPhoneNumber(),
      email: this.editedEmail()
    };

    try {
      await this.patientService.updatePatient(updatedPatient);
      this.patient.set(updatedPatient);
      this.isEditingPatient.set(false);
      this.showNotification('success', 'Datos del paciente actualizados exitosamente.');
    } catch (error) {
      console.error('Error al guardar los datos del paciente:', error);
      this.showNotification('error', 'Error al guardar los datos del paciente.');
    }
  }

  cancelEditPatient(): void {
    this.toggleEditPatient();
  }

  // --- Métodos para el Modal de Notas de Sesión ---
  async openNotesModal(appointment: AppointmentResponseDto): Promise<void> {
    console.log('DEBUG [openNotesModal]: Abriendo modal de notas para turno:', appointment);
    this.selectedAppointmentForNotes.set(appointment);

    // Inicializar las notas con las que ya tiene el turno (si existen en el DTO inicial)
    // Esto es útil si el 'sessionNotes' del DTO principal ya contiene algo.
    this.currentNotes.set(appointment.notes || '');

    // Si el turno tiene un ID de API válido, intenta cargar las notas definitivas desde el backend
    if (appointment.id !== undefined && appointment.id !== null) {
      console.log(`DEBUG [openNotesModal]: Intentando cargar notas de sesión para el turno ID: ${appointment.id}`);
      try {
        const fetchedNotes = await this.turnosService.getAppointmentNotes(appointment.id);
        if (fetchedNotes !== null || fetchedNotes == "") { // Si se encontraron notas (no 404)
          this.currentNotes.set(fetchedNotes); // Sobrescribe con las notas del backend
          console.log('DEBUG [openNotesModal]: Notas de sesión cargadas y actualizadas desde el backend.');
        } else {
          console.log('DEBUG [openNotesModal]: No se encontraron notas de sesión en el backend para este turno.');
          // Si no hay notas en el backend, se mantiene lo que ya estaba (o un string vacío)
        }
      } catch (error) {
        console.error('ERROR [openNotesModal]: Error al cargar notas de sesión del turno:', error);
        this.notification.set({ tipo: 'error', mensaje: 'Error al cargar las notas de sesión del turno.' });
      }
    } else {
      console.log('DEBUG [openNotesModal]: El turno no tiene un ID de API válido para buscar notas de sesión.');
    }

    this.showNotesModal.set(true);
    console.log('DEBUG [openNotesModal]: Notas finales cargadas en el modal:', this.currentNotes());
  }

  closeNotesModal(): void {
    this.showNotesModal.set(false);
    this.selectedAppointmentForNotes.set(null);
    this.currentNotes.set(''); // Limpiar notas al cerrar
    console.log('DEBUG [closeNotesModal]: Modal de notas cerrado y campos reseteados.');
  }

  async saveNotes(): Promise<void> {
    const appointment = this.selectedAppointmentForNotes();
    // Asegúrate de que appointment.id es el apiId que necesita el backend
    if (!appointment || appointment.id === undefined || appointment.id === null) {
      this.notification.set({ tipo: 'error', mensaje: 'No se ha seleccionado un turno válido para guardar las notas.' });
      return;
    }

    const notesToSave = this.currentNotes();
    console.log(`DEBUG [saveNotes]: Guardando notas para turno ID ${appointment.id}:`, notesToSave);

    try {
      await this.turnosService.updateAppointmentNotes(appointment.id, notesToSave);
      this.closeNotesModal();
      this.notification.set({ tipo: 'success', mensaje: 'Notas guardadas exitosamente.' });
      // Opcional: Refrescar la agenda para que las notas se muestren si es necesario
      // Si las notas se muestran en la vista principal, esto es importante.
      await this.turnosService.refreshCurrentDayAppointments();
    } catch (error) {
      console.error('ERROR [saveNotes]: Error al guardar las notas:', error);
      this.notification.set({ tipo: 'error', mensaje: 'Error al guardar las notas.' });
    }
  }


  // --- Método para Notificaciones ---
  showNotification(tipo: 'success' | 'error' | 'info', mensaje: string): void {
    this.notification.set({ tipo, mensaje });
    setTimeout(() => this.notification.set(null), 3000);
  }

  clearNotification(): void {
    this.notification.set(null);
  }
}
