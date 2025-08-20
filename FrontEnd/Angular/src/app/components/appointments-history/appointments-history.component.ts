// src/app/components/turnos-history/turnos-history.component.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { ProfessionalService } from '../../services/professional.service';
import { AppointmentResponseDto } from '../../interfaces/AppointmentResponseDto';
import { TurnosService } from '../../services/turnos.service';

@Component({
  selector: 'app-turnos-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    DatePipe
  ],
  templateUrl: './appointments-history.component.html',
  styleUrl: './appointments-history.component.css'
})
export class AppointmentsHistoryComponent implements OnInit {

  private professionalService = inject(ProfessionalService);
  private turnosService = inject(TurnosService);

  allAppointments = signal<AppointmentResponseDto[]>([]);
  filteredAppointments = signal<AppointmentResponseDto[]>([]);
  searchQuery = signal('');
  loading = signal(false);
  notification = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  // Signals para la paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);
  
  // Computed signal para calcular los turnos de la página actual
  pagedAppointments = computed(() => {
      const start = (this.currentPage() - 1) * this.itemsPerPage();
      const end = start + this.itemsPerPage();
      return this.filteredAppointments().slice(start, end);
  });
  
  // Computed signal para calcular el número total de páginas
  totalPages = computed(() => Math.ceil(this.filteredAppointments().length / this.itemsPerPage()));

  showNotesModal = signal(false);
  selectedAppointmentForNotes = signal<AppointmentResponseDto | null>(null);
  currentNotes = signal('');

  constructor() { }

  ngOnInit(): void {
      this.loadAllAppointments();
  }

  async loadAllAppointments(): Promise<void> {
      this.loading.set(true);
      try {
          const data = await this.professionalService.getTurnosFromBackend();
          const normalizedData = data.map(app => {
              let normalizedFecha = app.fecha;
              if (normalizedFecha && normalizedFecha.includes('/')) {
                  const parts = normalizedFecha.split('/');
                  if (parts.length === 3) {
                      normalizedFecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
              }
              return { ...app, fecha: normalizedFecha };
          });

          // Filter appointments to only include 'REALIZADO' or 'CANCELADO'
          const relevantAppointments = normalizedData.filter(app => {
              const displayStatus = this.getAppointmentDisplayStatus(app);
              return displayStatus === 'Realizado' || displayStatus === 'Cancelado';
          });

          const sortedAppointments = relevantAppointments.sort((a, b) => {
              const dateTimeA = new Date(`${a.fecha}T${a.hora}`);
              const dateTimeB = new Date(`${b.fecha}T${b.hora}`);
              return dateTimeB.getTime() - dateTimeA.getTime();
          });

          this.allAppointments.set(sortedAppointments);
          this.applyFilter();
          console.log('[TurnosHistoryComponent] All relevant appointments loaded:', this.allAppointments());
      } catch (error) {
          console.error('Error al cargar todos los turnos:', error);
          this.showNotification('error', 'Error al cargar el historial de turnos.');
          this.allAppointments.set([]);
          this.filteredAppointments.set([]);
      } finally {
          this.loading.set(false);
      }
  }

  applyFilter(): void {
      const query = this.searchQuery().toLowerCase().trim();
      if (!query) {
          this.filteredAppointments.set(this.allAppointments());
      } else {
          const filtered = this.allAppointments().filter(appointment => {
              const patientName = `${appointment.patientName || ''} ${appointment.patientLastName || ''}`.toLowerCase();
              const appointmentDate = appointment.fecha.toLowerCase();
              const appointmentTime = appointment.hora.toLowerCase();
              const appointmentStatus = this.getAppointmentDisplayStatus(appointment).toLowerCase();

              return patientName.includes(query) ||
                  appointmentDate.includes(query) ||
                  appointmentTime.includes(query) ||
                  appointmentStatus.includes(query);
          });
          this.filteredAppointments.set(filtered);
      }
      // Cuando el filtro se aplica, siempre volver a la primera página
      this.currentPage.set(1);
  }
  
  // Métodos para cambiar de página
  nextPage(): void {
      if (this.currentPage() < this.totalPages()) {
          this.currentPage.update(page => page + 1);
      }
  }
  
  previousPage(): void {
      if (this.currentPage() > 1) {
          this.currentPage.update(page => page - 1);
      }
  }

  protected getTextoEstado(estado: string): string {
      switch (estado) {
          case 'DISPONIBLE':
              return 'Disponible';
          case 'CONFIRMADO':
              return 'Confirmado';
          case 'BLOQUEADO':
              return 'Bloqueado';
          case 'CANCELADO':
              return 'Cancelado';
          case 'EN_CURSO':
              return 'En curso';
          case 'REALIZADO':
              return 'Realizado';
          default:
              return 'Estado desconocido';
      }
  }

  protected getAppointmentDisplayStatus(appointment: AppointmentResponseDto): string {
      if (appointment.state === 'CANCELADO') {
          return this.getTextoEstado('CANCELADO');
      }

      if (appointment.state === 'CONFIRMADO') {
          const appointmentDateTime = new Date(`${appointment.fecha}T${appointment.hora}`);
          const now = new Date();

          appointmentDateTime.setSeconds(0);
          appointmentDateTime.setMilliseconds(0);
          now.setSeconds(0);
          now.setMilliseconds(0);

          if (appointmentDateTime < now) {
              return this.getTextoEstado('REALIZADO');
          }
      }
      // For any other status, return its direct text representation
      return this.getTextoEstado(appointment.state);
  }

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

  showNotification(tipo: 'success' | 'error' | 'info', mensaje: string): void {
      this.notification.set({ tipo, mensaje });
      setTimeout(() => this.notification.set(null), 3000);
  }

  clearNotification(): void {
      this.notification.set(null);
  }
}
