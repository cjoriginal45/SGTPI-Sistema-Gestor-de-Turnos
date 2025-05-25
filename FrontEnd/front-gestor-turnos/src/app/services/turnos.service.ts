import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

export interface Turno {
  id: string;
  hora: string;
  fecha: string;
  estado: 'disponible' | 'ocupado' | 'bloqueado' | 'cancelado';
  paciente?: string;
  telefono?: string;
  duracion?: number;
  observaciones?: string;
  fechaCreacion: Date;
  fechaModificacion?: Date;
}

export interface CrearTurnoRequest {
  hora: string;
  fecha: string;
  paciente: string;
  telefono?: string;
  duracion: number;
  observaciones?: string;
}

export interface ActualizarTurnoRequest {
  paciente?: string;
  telefono?: string;
  duracion?: number;
  observaciones?: string;
}

export interface EstadisticasTurnos {
  turnosHoy: number;
  horasLibres: number;
  turnosCancelados: number;
  turnosConfirmados: number;
  horasBloqueadas: number;
}

@Injectable({
  providedIn: 'root',
})
export class TurnosService {
  private turnos = signal<Turno[]>([]);
  private loading = signal(false);
  private error = signal<string | null>(null);
  private fechaSeleccionada = signal<Date>(new Date());

  private notificaciones$ = new BehaviorSubject<{
    tipo: 'success' | 'error' | 'info';
    mensaje: string;
  } | null>(null);

  // Getters para signals (readonly)
  get turnosSignal() {
    return this.turnos.asReadonly();
  }
  get loadingSignal() {
    return this.loading.asReadonly();
  }
  get errorSignal() {
    return this.error.asReadonly();
  }
  get fechaSeleccionadaSignal() {
    return this.fechaSeleccionada.asReadonly();
  }
  get notificaciones() {
    return this.notificaciones$.asObservable();
  }

  // Computed properties
  estadisticasDelDia = computed<EstadisticasTurnos>(() => {
    const turnos = this.turnos();
    return {
      turnosHoy: turnos.filter((t) => t.estado === 'ocupado').length,
      horasLibres: turnos.filter((t) => t.estado === 'disponible').length,
      turnosCancelados: turnos.filter((t) => t.estado === 'cancelado').length,
      turnosConfirmados: turnos.filter((t) => t.estado === 'ocupado').length,
      horasBloqueadas: turnos.filter((t) => t.estado === 'bloqueado').length,
    };
  });

  turnosPorPeriodo = computed(() => {
    const turnos = this.turnos();
    return {
      manana: turnos.filter((t) => this.esManana(t.hora)),
      tarde: turnos.filter((t) => this.esTarde(t.hora)),
      noche: turnos.filter((t) => this.esNoche(t.hora)),
    };
  });

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

  private formatearFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  seleccionarFecha(fecha: Date) {
    const normalizedDate = new Date(fecha);
    normalizedDate.setHours(0, 0, 0, 0); // Normalizar fecha
    this.fechaSeleccionada.set(normalizedDate);
    this.cargarTurnos(normalizedDate);
  }

  private cargarTurnos(fecha: Date) {
    this.loading.set(true);
    try {
      // Simulamos carga de datos
      setTimeout(() => {
        this.turnos.set(this.generarTurnosParaFecha(fecha));
        this.loading.set(false);
      }, 300);
    } catch (error) {
      this.error.set('Error al cargar turnos');
      this.loading.set(false);
    }
  }

  private generarTurnosParaFecha(fecha: Date): Turno[] {
    const fechaStr = this.formatearFecha(fecha);
    const diaSemana = fecha.getDay(); // 0=domingo, 6=sábado
    const diaMes = fecha.getDate();

    // Generar turnos base con tipo explícito
    const turnosBase: Array<{
        hora: string;
        estado: 'disponible' | 'ocupado' | 'bloqueado' | 'cancelado';
        paciente?: string;
        telefono?: string;
        duracion?: number;
    }> = this.generarTurnosBase(diaSemana, diaMes);

    // Mapeo seguro con verificación de tipos
    return turnosBase.map((turno, index): Turno => {
        return {
            id: `turno-${fechaStr}-${index}`,
            hora: turno.hora,
            fecha: fechaStr,
            estado: turno.estado,
            paciente: turno.paciente || undefined,
            telefono: turno.telefono || undefined,
            duracion: turno.duracion || 50, // Valor por defecto
            fechaCreacion: new Date(),
            fechaModificacion: new Date(),
            observaciones: undefined // Campo opcional explícito
        };
    });
}

private generarTurnosBase(diaSemana: number, diaMes: number): Array<{
  hora: string;
  estado: 'disponible' | 'ocupado' | 'bloqueado' | 'cancelado';
  paciente?: string;
  telefono?: string;
  duracion?: number;
}> {
  // Base structure for weekdays
  const weekdayTurnos: Array<{
      hora: string;
      estado: 'disponible' | 'ocupado' | 'bloqueado';
      paciente?: string;
      telefono:string;
  }> = [
      { hora: '08:00', estado: 'bloqueado',paciente:"-",telefono:"-" },
      { hora: '09:00', estado: 'disponible',paciente:"-",telefono:"-"  },
      { hora: '10:00', estado: 'disponible' ,paciente:"-",telefono:"-" },
      { hora: '11:00', estado: 'disponible' ,paciente:"-",telefono:"-" },
      { hora: '12:00', estado: 'disponible' ,paciente:"-",telefono:"-" },
      { hora: '13:00', estado: 'bloqueado' ,paciente:"-",telefono:"-" },
      { hora: '14:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '15:00', estado: 'disponible',paciente:"-",telefono:"-"  },
      { hora: '16:00', estado: 'disponible',paciente:"-",telefono:"-"  },
      { hora: '17:00', estado: 'disponible',paciente:"-",telefono:"-"  },
      { hora: '18:00', estado: 'disponible',paciente:"-",telefono:"-"  },
      { hora: '19:00', estado: 'bloqueado' ,paciente:"-",telefono:"-" },
      { hora: '20:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '21:00', estado: 'bloqueado',paciente:"-",telefono:"-" },
      { hora: '22:00', estado: 'bloqueado' ,paciente:"-",telefono:"-" }
  ];

  // Weekend structure
  if (diaSemana === 0 || diaSemana === 6) { // Domingo(0) o Sábado(6)
      return [
          { hora: '09:00', estado: 'bloqueado' },
          { hora: '10:00', estado: 'bloqueado' },
          { hora: '11:00', estado: 'bloqueado' },
          { hora: '12:00', estado: 'bloqueado' }
      ];
  }

  // Wednesday special schedule
  if (diaSemana === 3) { // Miércoles
    return [
      { hora: '08:00', estado: 'bloqueado',paciente:"-",telefono:"-" },
      { hora: '09:00', estado: 'disponible',paciente:"-",telefono:"-"  },
      { hora: '10:00', estado: 'disponible' ,paciente:"-",telefono:"-" },
      { hora: '11:00', estado: 'disponible' ,paciente:"-",telefono:"-" },
      { hora: '12:00', estado: 'disponible' ,paciente:"-",telefono:"-" },
      { hora: '13:00', estado: 'bloqueado' ,paciente:"-",telefono:"-" },
      { hora: '14:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '15:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '16:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '17:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '18:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '19:00', estado: 'bloqueado' ,paciente:"-",telefono:"-" },
      { hora: '20:00', estado: 'bloqueado',paciente:"-",telefono:"-"  },
      { hora: '21:00', estado: 'bloqueado',paciente:"-",telefono:"-" },
      { hora: '22:00', estado: 'bloqueado' ,paciente:"-",telefono:"-" }
    ];
  }

  // Even days of month - add some occupied appointments
  if (diaMes % 2 === 0) {
      const modifiedTurnos = [...weekdayTurnos];
      modifiedTurnos[2] = { ...modifiedTurnos[2], estado: 'ocupado', paciente: 'Paciente Regular' };
      modifiedTurnos[8] = { ...modifiedTurnos[8], estado: 'ocupado', paciente: 'Paciente Frecuente' };
      return modifiedTurnos;
  }

  return weekdayTurnos;
}



  async crearTurno(request: CrearTurnoRequest): Promise<Turno> {
    this.loading.set(true);
    try {
      const nuevoTurno: Turno = {
        ...request,
        id: `turno-${Date.now()}`,
        estado: 'ocupado',
        fechaCreacion: new Date(),
      };

      this.turnos.update((turnos) => [...turnos, nuevoTurno]);
      this.mostrarNotificacion(
        'success',
        `Turno asignado a ${request.paciente} exitosamente`
      );
      return nuevoTurno;
    } catch (error) {
      this.mostrarNotificacion('error', 'Error al crear el turno');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async actualizarTurno(
    id: string,
    request: ActualizarTurnoRequest
  ): Promise<Turno> {
    this.loading.set(true);
    try {
      this.turnos.update((turnos) =>
        turnos.map((turno) =>
          turno.id === id
            ? {
                ...turno,
                ...request,
                fechaModificacion: new Date(),
              }
            : turno
        )
      );

      const turnoActualizado = this.turnos().find((t) => t.id === id);
      this.mostrarNotificacion('success', 'Turno actualizado exitosamente');

      if (!turnoActualizado) throw new Error('Turno no encontrado');
      return turnoActualizado;
    } catch (error) {
      this.mostrarNotificacion('error', 'Error al actualizar el turno');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async cambiarEstadoTurno(id: string, estado: Turno['estado']): Promise<void> {
    this.loading.set(true);
    try {
      this.turnos.update((turnos) =>
        turnos.map((turno) =>
          turno.id === id
            ? {
                ...turno,
                estado,
                fechaModificacion: new Date(),
                ...(estado === 'disponible' || estado === 'bloqueado'
                  ? {
                      paciente: undefined,
                      telefono: undefined,
                      observaciones: undefined,
                    }
                  : {}),
              }
            : turno
        )
      );

      const mensajes = {
        bloqueado: 'Hora bloqueada exitosamente',
        disponible: 'Hora desbloqueada exitosamente',
        cancelado: 'Turno cancelado exitosamente',
        ocupado: 'Turno confirmado exitosamente',
      };

      this.mostrarNotificacion('success', mensajes[estado]);
    } catch (error) {
      const mensaje = `Error al ${
        estado === 'bloqueado' ? 'bloquear' : 'cambiar estado de'
      } la hora`;
      this.mostrarNotificacion('error', mensaje);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  private mostrarNotificacion(
    tipo: 'success' | 'error' | 'info',
    mensaje: string
  ): void {
    this.notificaciones$.next({ tipo, mensaje });
    setTimeout(() => this.notificaciones$.next(null), 5000);
  }

  // Método mock para exportar (simulado)
  exportarTurnos(formato: 'csv' | 'pdf' = 'csv') {
    return of(new Blob(['Datos de turnos mock'], { type: 'text/csv' }));
  }
}
