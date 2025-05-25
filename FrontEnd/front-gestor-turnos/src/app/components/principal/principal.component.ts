import { Component, ViewChild, signal, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CalendarComponent } from '../calendar/calendar.component';
import { HeaderComponent } from "../header/header.component";
import { TurnosService, Turno, CrearTurnoRequest, ActualizarTurnoRequest } from '../../services/turnos.service';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent, HeaderComponent],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css'
})
export class PrincipalComponent implements OnInit, OnDestroy {

  @ViewChild('calendarComponent') calendar!: CalendarComponent;

  // Inyección de dependencias
  private turnosService = inject(TurnosService);
  private destroy$ = new Subject<void>();

  // Signals para el estado del componente
  protected showModal = signal(false);
  protected modalTurno = signal<Turno | null>(null);
  protected pacienteNombre = signal('');
  protected telefonoPaciente = signal('');
  protected duracionTurno = signal(50);
  protected observaciones = signal('');
  protected notificacion = signal<{tipo: 'success' | 'error' | 'info', mensaje: string} | null>(null);



  protected turnos = computed(() => this.turnosService.turnosSignal());
  protected turnosPorPeriodo = computed(() => this.turnosService.turnosPorPeriodo());

  // Computed properties
  protected get tituloModal() {
    const turno = this.modalTurno();
    if (!turno) return 'Asignar Turno';
    return turno.estado === 'ocupado' ? 'Modificar Turno' : 'Asignar Turno';
  }



  estadisticas = computed(() => this.turnosService.estadisticasDelDia());
  fechaSeleccionada = computed(() => this.turnosService.fechaSeleccionadaSignal());

  ngOnInit() {
    this.turnosService.notificaciones
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        this.notificacion.set(notif);
        if (notif) {
          setTimeout(() => this.notificacion.set(null), 3000);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos del calendario
  toggleCalendar() {
    this.calendar.onToggleClick();
  }

  onDaySelected(event: { date: Date }) {
    this.turnosService.seleccionarFecha(event.date);
  }

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

  onDateSelected(date: Date) {
    this.turnosService.seleccionarFecha(date);
  }

  irAHoy() {
    const hoy = new Date();
    this.turnosService.seleccionarFecha(hoy);
  }

  // Métodos para gestión de turnos
  async asignarTurno(turno: Turno) {
    this.modalTurno.set(turno);
    this.limpiarFormularioModal();
    this.showModal.set(true);
  }

  async modificarTurno(turno: Turno) {
    this.modalTurno.set(turno);
    this.pacienteNombre.set(turno.paciente || '');
    this.telefonoPaciente.set(turno.telefono || '');
    this.duracionTurno.set(turno.duracion || 50);
    this.observaciones.set(turno.observaciones || '');
    this.showModal.set(true);
  }

  async bloquearHora(turnoId: string) {
    try {
      await this.turnosService.cambiarEstadoTurno(turnoId, 'bloqueado');
    } catch (error) {
      console.error('Error al bloquear hora:', error);
      this.mostrarError('Error al bloquear la hora');
    }
  }

  async desbloquearHora(turnoId: string) {
    try {
      await this.turnosService.cambiarEstadoTurno(turnoId, 'disponible');
    } catch (error) {
      console.error('Error al desbloquear hora:', error);
      this.mostrarError('Error al desbloquear la hora');
    }
  }

  async cancelarTurno(turnoId: string) {
    if (confirm('¿Estás seguro de que deseas cancelar este turno?')) {
      try {
        await this.turnosService.cambiarEstadoTurno(turnoId, 'disponible');
      } catch (error) {
        console.error('Error al cancelar turno:', error);
        this.mostrarError('Error al cancelar el turno');
      }
    }
  }

  // Métodos del modal
  async confirmarModal() {
    const turno = this.modalTurno();
    const nombre = this.pacienteNombre().trim();
    
    if (!turno || !nombre) {
      this.mostrarError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      if (turno.estado === 'ocupado') {
        const request: ActualizarTurnoRequest = {
          paciente: nombre,
          telefono: this.telefonoPaciente().trim() || undefined,
          duracion: this.duracionTurno(),
          observaciones: this.observaciones().trim() || undefined
        };
        await this.turnosService.actualizarTurno(turno.id, request);
      } else {
        const request: CrearTurnoRequest = {
          hora: turno.hora,
          fecha: turno.fecha,
          paciente: nombre,
          telefono: this.telefonoPaciente().trim() || undefined,
          duracion: this.duracionTurno(),
          observaciones: this.observaciones().trim() || undefined
        };
        await this.turnosService.crearTurno(request);
      }
      
      this.cerrarModal();
    } catch (error) {
      console.error('Error al procesar turno:', error);
      this.mostrarError('Error al guardar el turno');
    }
  }

  cancelarModal() {
    this.cerrarModal();
  }

  cerrarModal() {
    this.showModal.set(false);
    this.modalTurno.set(null);
    this.limpiarFormularioModal();
  }

  // Métodos helper
  private limpiarFormularioModal() {
    this.pacienteNombre.set('');
    this.telefonoPaciente.set('');
    this.duracionTurno.set(50);
    this.observaciones.set('');
  }

  private esManana(hora: string): boolean {
    const h = parseInt(hora.split(':')[0]);
    return h >= 8 && h < 13;
  }

  private esTarde(hora: string): boolean {
    const h = parseInt(hora.split(':')[0]);
    return h >= 13 && h < 20;
  }

  private esNoche(hora: string): boolean {
    const h = parseInt(hora.split(':')[0]);
    return h >= 20;
  }

  protected getIconoPorEstado(estado: string): string {
    switch (estado) {
      case 'bloqueado': return 'lock';
      case 'disponible': return 'schedule';
      case 'ocupado': return 'person';
      case 'cancelado': return 'cancel';
      default: return 'schedule';
    }
  }

  protected getTextoEstado(turno: Turno): string {
    switch (turno.estado) {
      case 'bloqueado': return 'Bloqueado';
      case 'disponible': return 'Disponible';
      case 'ocupado': return turno.paciente || 'Ocupado';
      case 'cancelado': return 'Cancelado';
      default: return 'Disponible';
    }
  }

  private mostrarError(mensaje: string) {
    this.notificacion.set({ tipo: 'error', mensaje });
    setTimeout(() => this.notificacion.set(null), 3000);
  }

  limpiarNotificacion() {
    this.notificacion.set(null);
  }

  /*
  async exportarTurnos(formato: 'csv' | 'pdf' = 'csv') {
    try {
      const blob = this.turnosService.exportarTurnos(formato);
      const a = document.createElement('a');
      a.href = url;
      a.download = `turnos-${this.fechaSeleccionada()}.${formato}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar:', error);
      this.mostrarError('Error al exportar los turnos');
    }
  }*/
}