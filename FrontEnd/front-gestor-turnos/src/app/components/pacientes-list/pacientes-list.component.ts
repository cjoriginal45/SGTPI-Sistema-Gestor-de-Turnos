import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../interfaces/patient';
import { PatientService } from '../../services/patient.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { PatientObservation } from '../../interfaces/PatientObservation';
// import { Observer } from 'rxjs'; // No es necesario importar Observer directamente aquí
import { AppointmentRequestDto } from '../../interfaces/AppointmentRequestDto';
import { AppointmentResponseDto } from '../../interfaces/AppointmentResponseDto';
import { AppointmentPatientDto, TurnosService } from '../../services/turnos.service'; // ¡Importa TurnosService!


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
export class PatientsListComponent implements OnInit {

  // Signals for patient registration form
  firstName = signal('');
  lastName = signal('');
  phoneNumber = signal('');
  email = signal('');

  // Signal for general patient registration modal
  showModal = signal(false);

  // List of patients
  patients = signal<Patient[]>([]);

  // Signal for search term
  searchTerm = signal('');

  // --- Signals for Assign Appointment Modal ---
  showAssignAppointmentModal = signal(false);
  selectedPatientForAppointment = signal<Patient | null>(null);
  selectedAppointmentDate = signal<Date | null>(null);
  selectedAppointmentTime = signal<string | null>(null);
  availableTimeSlots = signal<string[]>([]);
  selectedDuration = signal<number>(30);

  
  filteredPatients = signal<Patient[]>([]);
  // --- Signals for Add Notes Modal ---
  showAddNotesModal = signal(false);
  selectedPatientForNotes = signal<Patient | null>(null);
  patientNotes = signal('');
  patientObservations = signal<PatientObservation[]>([]); // To hold all notes for the selected patient

  // Inyectar TurnosService
  constructor(
    private patientService: PatientService,
    private turnosService: TurnosService // ¡Inyectar TurnosService!
  ) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.patientService.getPatients().then((data) => {
      console.log('DEBUG: Raw data from getPatients() backend:', data);
      this.patients.set(data); // Carga todos los pacientes en 'patients'
      
      // --- IMPORTANTE: Actualiza 'filteredPatients' aquí TAMBIÉN ---
      // Después de cargar todos los pacientes, aplica el filtro inicial (si hay un término de búsqueda)
      // o simplemente muestra todos si no hay término.
      const currentSearchTerm = this.searchTerm();
      if (currentSearchTerm) {
          const filtered = data.filter(patient => {
              const firstNameMatch = patient.firstName?.toLowerCase().includes(currentSearchTerm);
              const lastNameMatch = patient.lastName?.toLowerCase().includes(currentSearchTerm);
              const emailMatch = patient.email?.toLowerCase().includes(currentSearchTerm);
              const phoneMatch = patient.phoneNumber?.toString().includes(currentSearchTerm);
              return firstNameMatch || lastNameMatch || emailMatch || phoneMatch;
          });
          this.filteredPatients.set(filtered);
      } else {
          this.filteredPatients.set(data); // Si no hay término de búsqueda, muestra todos
      }
      console.log('DEBUG: Patients signal after update:', this.patients());
      console.log('DEBUG: FilteredPatients signal after update:', this.filteredPatients());
    }).catch((err) => {
      console.error('Error al cargar pacientes', err);
      alert('Error al cargar la lista de pacientes.');
    });
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
      alert('Por favor complete los campos obligatorios: Nombre, Apellido y Teléfono.');
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
        alert('Paciente registrado con éxito!');
        this.loadPatients();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error completo:', error);
        const errorMessage = error.error?.message || error.message || 'Error desconocido al registrar el paciente.';
        alert(`Error al registrar: ${errorMessage}`);
      }
    });
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const term = input.value.toLowerCase();
    this.searchTerm.set(term); // Actualiza el término de búsqueda

    // Lógica de filtrado: FILTRA DIRECTAMENTE LA SEÑAL patients()
    const filtered = this.patients().filter(patient => {
      const firstNameMatch = patient.firstName?.toLowerCase().includes(term);
      const lastNameMatch = patient.lastName?.toLowerCase().includes(term);
      const emailMatch = patient.email?.toLowerCase().includes(term);
      const phoneMatch = patient.phoneNumber?.toString().includes(term); // Asegúrate de que phoneNumber sea un string o pueda convertirse.
      return firstNameMatch || lastNameMatch || emailMatch || phoneMatch;
    });
    this.filteredPatients.set(filtered); // Actualiza filteredPatients con los resultados del filtro
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
      this.showAssignAppointmentModal.set(true);
      console.log('DEBUG (assignAppointment): showAssignAppointmentModal se establece a true.');
    } else {
      console.error(`ERROR (assignAppointment): Paciente con teléfono ${patientPhoneNumber} no encontrado en la lista local.`);
      alert('Error interno: El paciente no pudo ser seleccionado para asignar un turno.');
    }
  }

  closeAssignAppointmentModal() {
    this.showAssignAppointmentModal.set(false);
    this.selectedPatientForAppointment.set(null);
  }

  onDateSelected(date: Date) {
    this.selectedAppointmentDate.set(date);
    this.simulateTimeSlots(date);
  }

  private simulateTimeSlots(date: Date) {
    const day = date.getDay();
    let slots: string[] = [];

    if (day === 0 || day === 6) { // Domingo (0) o Sábado (6)
      slots = ['10:00', '11:00', '12:00', '16:00', '17:00'];
    } else if (day === 3) { // Miércoles (3)
      // Horarios específicos para miércoles (ej. bloqueado de 15:00 a 18:00)
      slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '19:00', '20:00', '21:00', '22:00'];
    } else { // Días de semana normales
      slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    }
    this.availableTimeSlots.set(slots);
    this.selectedAppointmentTime.set(null);
  }

  async saveAppointment() { // Convertido a async
    const patient = this.selectedPatientForAppointment();
    const date = this.selectedAppointmentDate();
    const time = this.selectedAppointmentTime();
    const duration = this.selectedDuration(); 

    if (!patient || !patient.phoneNumber || !date || !time || !duration) {
      alert('Por favor, complete todos los campos: paciente, fecha, hora y duración.');
      return;
    }

    const formattedDate = this.turnosService.formatearFecha(date); // Usar el método público del servicio
    const formattedTime = `${time}:00`;

    // --- Lógica de validación de disponibilidad ANTES de enviar al backend ---
    // Esto es una validación optimista en el frontend. El backend siempre hará la validación final.
    const selectedDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0);

    // Obtener los turnos del día seleccionado desde el TurnosService
    // Esto asume que TurnosService ya tiene los turnos cargados para la fecha seleccionada
    // Si no, necesitarías cargar los turnos para esa fecha aquí.
    const turnosDelDia = this.turnosService.turnosSignal();
    const conflictingTurno = turnosDelDia.find(t => {
      // Comparar solo fecha y hora, ignorando segundos/milisegundos
      const turnoDateTime = new Date(`${t.fecha}T${t.hora}`);
      return turnoDateTime.getFullYear() === selectedDateTime.getFullYear() &&
             turnoDateTime.getMonth() === selectedDateTime.getMonth() &&
             turnoDateTime.getDate() === selectedDateTime.getDate() &&
             turnoDateTime.getHours() === selectedDateTime.getHours() &&
             turnoDateTime.getMinutes() === selectedDateTime.getMinutes() &&
             (t.estado === 'CONFIRMADO' || t.estado === 'BLOQUEADO');
    });

    if (conflictingTurno) {
      if (conflictingTurno.estado === 'CONFIRMADO') {
        alert('Error: La fecha y hora seleccionadas ya están ocupadas por otro turno confirmado.');
      } else if (conflictingTurno.estado === 'BLOQUEADO') {
        alert('Error: La franja horaria seleccionada está bloqueada y no se puede asignar un turno.');
      }
      return; // Detener la ejecución si hay conflicto
    }

    const patientDtoForAppointment: AppointmentPatientDto  = {
      id: patient.id, // Ensure the ID is included
      firstName: patient.firstName || '', // Provide default values if necessary
      lastName: patient.lastName || '',
      phoneNumber: patient.phoneNumber || '',
      email: patient.email || '',
      // Ensure all required properties for the Patient type are included
    };

    const appointmentToCreate: AppointmentRequestDto = {
      duration: duration,
      fecha: formattedDate,
      hora: formattedTime,
      patient: patientDtoForAppointment,
      state: 'CONFIRMADO', // Siempre se crea como CONFIRMADO desde aquí
      sessionNotes: '' // Puedes añadir un campo para notas si lo necesitas en este modal
    };

    console.log('Intentando crear turno:', appointmentToCreate);

    try {
      // Llamar al método createAppointment del TurnosService
      // Esto es para que el TurnosService se encargue de la lógica de la API
      const response = await this.turnosService.createAppointment({
        ...appointmentToCreate,
        patient: patientDtoForAppointment // Ensure the patient object matches the expected type
      });
      console.log('Turno creado exitosamente:', response);
      alert(`Turno agendado para el ${response.fecha} correctamente.`);
      this.closeAssignAppointmentModal();
      // Opcional: Recargar los turnos de la agenda principal si este componente no lo hace automáticamente
      // this.turnosService.refreshCurrentDayAppointments();
    } catch (error: any) {
      console.error('Error al agendar turno:', error);
      // El backend ya envía mensajes de error específicos (409 Conflict, 400 Bad Request)
      // Los manejadores de excepciones en el backend ya devuelven un mensaje.
      const errorMessage = error.message || 'Error desconocido al agendar el turno.';
      alert(`Error al agendar turno: ${errorMessage}`);
    }
  }

  // Este método no es necesario si no lo usas en el HTML
  // appointmentDuration(): number {
  //   throw new Error('Method not implemented.');
  // }

  // --- Add Notes Modal Handlers (cleaned up validation) ---
  addNotes(patientPhoneNumber: string) {
    const patient = this.patients().find(p => p.phoneNumber === patientPhoneNumber);
  

    if (!patient) {
      alert('Error interno: No se pudo seleccionar el paciente correctamente para agregar notas.');
      return; 
    }

    this.selectedPatientForNotes.set(patient);
    this.patientNotes.set(''); // Clear textarea signal before loading


    this.patientService.getPatientObservations(patient.phoneNumber).subscribe({
      next: (observations) => {

        
        this.patientObservations.set(observations); // Set signal for display in list

        if (observations && observations.length > 0) {
          this.patientNotes.set(observations[0].observations); // Load into textarea
        } else {
          console.log('6. Observations array IS empty. Clearing patientNotes signal.');
          this.patientNotes.set(''); // Ensure textarea is empty
        }

        this.showAddNotesModal.set(true); // Open modal
        console.log('--- END addNotes DEBUG (Success) ---');
      },
      error: (error) => {
        console.error('ERROR (addNotes): getPatientObservations - ERROR callback triggered:', error);
        alert('Error al cargar notas existentes.');
        this.patientObservations.set([]);
        this.patientNotes.set('');
        this.showAddNotesModal.set(true);
        console.log('--- END addNotes DEBUG (Error) ---');
      }
    });
  }



  closeAddNotesModal() {
    this.showAddNotesModal.set(false);
    this.selectedPatientForNotes.set(null);
    this.patientNotes.set('');
    this.patientObservations.set([]);
  }

  saveNotes() {
    const patient = this.selectedPatientForNotes();
    const newNoteContent = this.patientNotes();

    if (newNoteContent.trim() === '') {
      alert('La nota no puede estar vacía.');
      return;
    }

    // Validation for phoneNumber
    if (!patient || !patient.phoneNumber) { // Check if patient or patient.phoneNumber is invalid
      alert('Error interno: No se pudo identificar al paciente correctamente para guardar la nota.');
      return;
    }

    const observationToSave: PatientObservation = {
      phoneNumber: patient.phoneNumber, // Use phoneNumber here
      observations: newNoteContent
    };

    this.patientService.savePatientObservation(observationToSave).subscribe({
      next: (successMessage: string) => {
        console.log('DEBUG (saveNotes): Backend success response:', successMessage);
        alert(`Nota guardada para ${patient.firstName} ${patient.lastName} correctamente.`);
        
        this.patientObservations.set([
          { phoneNumber: patient.phoneNumber, observations: newNoteContent } // Use phoneNumber here
        ]);
      },
      error: (error) => {
        console.error('ERROR (saveNotes): Error al guardar la nota (backend):', error);
        const errorMessage = error.error?.message || error.message || 'Error desconocido al guardar la nota.';
        alert(`Error al guardar la nota: ${errorMessage}`);
      }
    });
  }
}
