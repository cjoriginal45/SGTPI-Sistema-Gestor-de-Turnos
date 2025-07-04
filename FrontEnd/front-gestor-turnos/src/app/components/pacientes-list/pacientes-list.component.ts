import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../interfaces/patient';
import { PatientService } from '../../services/patient.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { PatientObservation } from '../../interfaces/PatientObservation';
import { Observer } from 'rxjs';
import { AppointmentPatientDto } from '../../interfaces/AppointmentPatientDto';
import { AppointmentRequestDto } from '../../interfaces/AppointmentRequestDto';
import { AppointmentResponseDto } from '../../interfaces/AppointmentResponseDto';


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

  constructor(private patientService: PatientService) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.patientService.getPatients().subscribe({
      next: (data) => {
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
      },
      error: (err) => {
        console.error('Error al cargar pacientes', err);
        alert('Error al cargar la lista de pacientes.');
      }
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

 /* filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.patients().filter(patient => {
      const firstNameMatch = patient.firstName?.toLowerCase().includes(term);
      const lastNameMatch = patient.lastName?.toLowerCase().includes(term);
      const emailMatch = patient.email?.toLowerCase().includes(term);
      const phoneMatch = patient.phoneNumber?.toString().includes(term); 
      return firstNameMatch || lastNameMatch || emailMatch || phoneMatch;
    });
  });*/

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


  assignAppointment(patientPhoneNumber: string) { // <--- CAMBIADO: Acepta phoneNumber
    console.log('DEBUG (assignAppointment): Método llamado para patientPhoneNumber:', patientPhoneNumber);

    // Buscar al paciente por phoneNumber
    const patient = this.patients().find(p => p.phoneNumber === patientPhoneNumber); // <--- CAMBIADO: Búsqueda por phoneNumber

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

    if (day === 0 || day === 6) {
      slots = ['10:00', '11:00', '12:00', '16:00', '17:00'];
    } else {
      slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    }
    this.availableTimeSlots.set(slots);
    this.selectedAppointmentTime.set(null);
  }

  saveAppointment() {
    const patient = this.selectedPatientForAppointment();
    const date = this.selectedAppointmentDate();
    const time = this.selectedAppointmentTime();
    // --- OBTENER LA DURACIÓN SELECCIONADA ---
    const duration = this.selectedDuration(); 

    if (!patient || !patient.phoneNumber || !date || !time || !duration) {
      alert('Por favor, complete todos los campos: paciente, fecha, hora y duración.');
      return;
    }

    const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    const formattedTime = `${time}:00`;

    const patientDtoForAppointment: AppointmentPatientDto = {
        phoneNumber: patient.phoneNumber
    };

    const appointmentToCreate: AppointmentRequestDto = {
      duration: duration, // <-- USAMOS LA DURACIÓN SELECCIONADA AQUÍ
      fecha: formattedDate,
      hora: formattedTime,
      patient: patientDtoForAppointment,
      state: 'CONFIRMADO'
    };

    console.log('Intentando crear turno:', appointmentToCreate);

    this.patientService.createAppointment(appointmentToCreate).subscribe({
      next: (response: AppointmentResponseDto) => {
        console.log('Turno creado exitosamente:', response);
        alert(`Turno agendado para el ${response.fecha} correctamente.`);
        this.closeAssignAppointmentModal();
      },
      error: (error: Error) => {
        console.error('Error al agendar turno:', error.message);
        alert(`Error al agendar turno: ${error.message}`);
      }
    });
  }
  appointmentDuration(): number {
    throw new Error('Method not implemented.');
  }

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