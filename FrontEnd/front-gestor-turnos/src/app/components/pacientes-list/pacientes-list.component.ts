import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../interfaces/patient';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-pacientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FormsModule],
  templateUrl: './pacientes-list.component.html',
  styleUrls: ['./pacientes-list.component.css']
})
export class PatientsListComponent implements OnInit {

  // Signals for form inputs (instead of one object signal)
  firstName = signal('');
  lastName = signal('');
  phoneNumber = signal('');
  email = signal('');

  // Señales para el estado del modal (se mantiene igual)
  showModal = signal(false);

  // Lista de pacientes (señal reactiva)
  patients = signal<Patient[]>([]);

  // Señal para el término de búsqueda
  searchTerm = signal('');

  constructor(private patientService: PatientService) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.patientService.getPatients().subscribe({
      next: (data: Patient[]) => {
        this.patients.set(data || []);
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
        alert('Error al cargar pacientes: ' + error.message);
        this.patients.set([]);
      }
    });
  }

  openRegisterModal() {
    // Reset individual signals
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
    // Use individual signal values
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

  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.patients().filter(patient => {
      // Add checks for undefined/null before calling string methods
      const firstNameMatch = patient.firstName?.toLowerCase().includes(term);
      const lastNameMatch = patient.lastName?.toLowerCase().includes(term);
      const emailMatch = patient.email?.toLowerCase().includes(term); // email is already optional, but good to be safe
      const phoneMatch = patient.phoneNumber?.includes(term); // phone might be a number, ensure it's a string or handle
  
      // Combine the conditions.
      // The `?.` (optional chaining) operator is key here.
      // It returns `undefined` if the left-hand side is null or undefined,
      // which then safely evaluates to `false` in a boolean context.
      return firstNameMatch || lastNameMatch || emailMatch || phoneMatch;
    });
  });
  

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  assignAppointment(patientId: number) {
    console.log(`Asignar turno a paciente con ID: ${patientId}`);
  }

  addNotes(patientId: number) {
    console.log(`Agregar notas a paciente con ID: ${patientId}`);
  }
}