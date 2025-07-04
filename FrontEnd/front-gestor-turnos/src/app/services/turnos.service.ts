import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, throwError, Subject } from 'rxjs'; // Import Subject
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Import HttpErrorResponse
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { isPlatformBrowser } from '@angular/common';
// Assuming you have an environment file

// --- DTO INTERFACES (as provided by you, moved here for clarity if not in separate file) ---
// If these are indeed in separate files like '../interfaces/AppointmentResponseDto.ts',
// then you would remove these definitions from here and keep their imports.
export interface AppointmentPatientDto {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export interface AppointmentRequestDto {
  duration: number; // The duration of the appointment (e.g., in minutes)
  fecha: string;    // Formatted as 'YYYY/MM/DD'
  hora: string;     // Formatted as 'HH:mm:ss'
  patient: AppointmentPatientDto; // Nested patient DTO
  state:string;
}

export interface AppointmentResponseDto {
  id: number;
  patientName: string;
  patientLastName: string;
  patientPhoneNumber: string;
  patientEmail: string;
  fecha: string; // This will likely be 'YYYY/MM/DD' from backend
  hora:string;
  state: string;
}
// --- END DTO INTERFACES ---


// --- UPDATED Turno INTERFACE ---
// This interface represents the internal structure of a 'turno' in your Angular app.
// It combines data from both generated (DISPONIBLE) and backend (CONFIRMADO/BLOQUEADO) slots.
export interface Turno {
  id: string; // Frontend-friendly ID: 'slot-...' or 'backend-{apiId}'
  apiId?: number; // The actual numerical ID from the backend database for confirmed/blocked appointments

  hora: string; // HH:mm format for display (e.g., '09:00')
  fecha: string; // YYYY-MM-DD format for internal Date object creation and comparison

  estado: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO';

  // Patient details (only for CONFIRMADO state, usually)
  paciente?: string; // Full name: patientName + patientLastName
  telefono?: string;
  email?: string; // New: From patientEmail
  duracion: number; // Duration of the appointment

  fechaCreacion: Date; // Timestamp when this turno was created/loaded in frontend
  fechaModificacion?: Date;
  observaciones?: string;
}
// --- END UPDATED Turno INTERFACE ---


@Injectable({
  providedIn: 'root',
})
export class TurnosService {

  private platformId = inject(PLATFORM_ID); // Inject PLATFORM_ID to check environment
  private http = inject(HttpClient); // Use inject for HttpClient
  
  // Use environment variables for API base URL
  // Changed base URL to common prefix: 'http://localhost:8080/SGTPI/api'
  private API_BASE_URL = environment.apiBaseUrl;

  // Signals para el estado de los turnos y la fecha
  public turnosSignal = signal<Turno[]>([]);
  public loading = signal(false);
  public error = signal<string | null>(null);
  public fechaSeleccionadaSignal = signal<Date>(new Date()); // Today's date by default

  // notifications$ should be public for components to subscribe
  public notificaciones = new Subject<{ tipo: 'success' | 'error' | 'info'; mensaje: string }>();

  // Use a computed signal for turnosPorPeriodo for reactivity
  public turnosPorPeriodo = computed(() => {
    const turnosDelDia = this.turnosSignal();
    const manana: Turno[] = [];
    const tarde: Turno[] = [];
    const noche: Turno[] = [];

    turnosDelDia.forEach(turno => {
      // Use the helper methods which parse the hour from turno.hora
      if (this.esManana(turno.hora)) {
        manana.push(turno);
      } else if (this.esTarde(turno.hora)) {
        tarde.push(turno);
      } else if (this.esNoche(turno.hora)) {
        noche.push(turno);
      }
    });

    return { manana, tarde, noche };
  });


  constructor() {
    this.cargarTurnos(this.fechaSeleccionadaSignal()); // Carga inicial al iniciar el servicio
  }

  // Métodos helper para categorizar por período (usados internamente)
  // Adjusted logic to align with common period definitions and your base turnos hours
  private esManana(hora: string): boolean {
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 8 && h < 13; // 8:00 to 12:59
  }

  private esTarde(hora: string): boolean {
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 13 && h < 20; // 13:00 to 19:59
  }

  private esNoche(hora: string): boolean {
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 20 && h <= 22; // 20:00 to 22:00 (assuming 22:00 is max based on generarTurnosBase)
  }

  // Método helper para formatear la fecha a YYYY-MM-DD
  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Método público para cambiar la fecha y recargar los turnos.
   * Llamado desde el componente Principal (e.g., al seleccionar un día en el calendario).
   */
  seleccionarFecha(fecha: Date) {
    const normalizedDate = new Date(fecha);
    normalizedDate.setHours(0, 0, 0, 0); // Normalize to start of day
    this.fechaSeleccionadaSignal.set(normalizedDate); // Use the public signal directly
    this.cargarTurnos(normalizedDate);
  }

  /**
   * Realiza la llamada HTTP para obtener los turnos y fusionarlos con la plantilla base.
   * Actualiza las signals 'turnos' y 'turnosPorPeriodo'.
   */
  async getTurnosPorFecha(dateIsoFormat: string): Promise<Turno[]> {
    this.loading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      // Corrected endpoint path for fetching by date: /appointments/by-date/{date}
      this.http.get<AppointmentResponseDto[]>(`${this.API_BASE_URL}/appointments/${dateIsoFormat}`)
        .pipe(
          catchError(this.handleError<AppointmentResponseDto[]>('getTurnosPorFecha', []))
        )
        .subscribe({
          next: (backendResponses: AppointmentResponseDto[]) => {
            const fullDaySchedule = this.generarTurnosParaFecha(new Date(dateIsoFormat));
            const mergedSchedule: Turno[] = fullDaySchedule.map(slot => {
                const foundResponse = backendResponses.find(
                    backendRes => {
                        // Backend fecha is 'YYYY/MM/DD', slot.fecha is 'YYYY-MM-DD'. Standardize for comparison.
                        const backendFechaFormatted = backendRes.fecha.replace(/\//g, '-');
                        // Backend hora is 'HH:mm:ss', slot.hora is 'HH:mm'. Standardize for comparison.
                        const backendHoraFormatted = backendRes.hora.substring(0, 5);

                        return backendFechaFormatted === slot.fecha && backendHoraFormatted === slot.hora;
                    }
                );
                if (foundResponse) {
                    return {
                        ...slot,
                        id: `backend-${foundResponse.id}`, // Link to backend ID for unique frontend ID
                        apiId: foundResponse.id, // Store the actual numerical backend ID
                        estado: foundResponse.state as Turno['estado'],
                        paciente: `${foundResponse.patientName || ''} ${foundResponse.patientLastName || ''}`.trim(),
                        telefono: foundResponse.patientPhoneNumber || undefined,
                        email: foundResponse.patientEmail || undefined, // Map the email
                        duracion: slot.duracion, // Assuming default 50 if not explicitly from backend DTO
                        fechaCreacion: new Date(), // Or from backend if available in DTO
                        fechaModificacion: undefined, // From backend if available
                        observaciones: undefined // From backend if available
                    };
                }
                return slot;
            });

            this.turnosSignal.set(mergedSchedule); // Update the main turnos signal
            this.loading.set(false);
            resolve(mergedSchedule);
          },
          error: (err) => {
            // Error already handled by handleError operator
            reject(err);
          }
        });
    });
  }

  // Método interno que inicia la carga (llamado por seleccionarFecha)
  private cargarTurnos(fecha: Date) {
    const isoDate = this.formatearFecha(fecha); // Format to YYYY-MM-DD
    this.getTurnosPorFecha(isoDate);
  }

  // Genera la plantilla base de horarios para un día
  private generarTurnosParaFecha(fecha: Date): Turno[] {
    const fechaStr = this.formatearFecha(fecha); // YYYY-MM-DD
    const diaSemana = fecha.getDay(); // 0 for Sunday, 6 for Saturday
    const diaMes = fecha.getDate(); // Day of the month

    const turnosBase = this.generarTurnosBase(diaSemana, diaMes);

    return turnosBase.map((turno): Turno => {
      return {
        id: `base-slot-${fechaStr}-${turno.hora}`, // Frontend ID
        fecha: fechaStr,
        hora: turno.hora,
        estado: turno.estado,
        paciente: turno.paciente || undefined,
        telefono: turno.telefono || undefined,
        email: turno.email || undefined, // Add email to the base slot
        duracion: turno.duracion || 50,
        fechaCreacion: new Date(), // Set current date as creation date
        fechaModificacion: undefined,
        observaciones: undefined,
        apiId: undefined // Base slots don't have a backend ID
      };
    });
  }

  // Define las reglas para la plantilla base (ej. fines de semana bloqueados)
  private generarTurnosBase(diaSemana: number, diaMes: number): Array<{
    hora: string;
    estado: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO';
    paciente?: string;
    telefono?: string;
    email?: string; // Add email to base turno
    duracion?: number;
  }> {
    const weekdayTurnos: Array<{ hora: string; estado: any; paciente?: string; telefono?: string; email?: string; duracion?: number; }> = [
      { hora: '08:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '09:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '10:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '11:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '12:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '13:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '14:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '15:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '16:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '17:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '18:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '19:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '20:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '21:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '22:00', estado: 'DISPONIBLE', duracion: 50 }
    ];

    // Blocked on weekends (0 = Sunday, 6 = Saturday)
    if (diaSemana === 0 || diaSemana === 6) { return weekdayTurnos.map(t => ({ ...t, estado: 'BLOQUEADO' })); }
    // Blocked on Wednesdays (3 = Wednesday) afternoons
    if (diaSemana === 3) {
      return weekdayTurnos.map(t => {
          if (['15:00', '16:00', '17:00', '18:00'].includes(t.hora)) { return { ...t, estado: 'BLOQUEADO' }; }
          return t;
      });
    }

    // Mock data for even days if no backend data
    if (diaMes % 2 === 0) {
        const modifiedTurnos = JSON.parse(JSON.stringify(weekdayTurnos)); // Deep copy
        const index10 = modifiedTurnos.findIndex((t: { hora: string; }) => t.hora === '10:00');
        if(index10 !== -1) { modifiedTurnos[index10] = { ...modifiedTurnos[index10], estado: 'CONFIRMADO', paciente: 'Paciente Mock Mañana (Par)', telefono: '11223344', email: 'mock.manana@example.com' }; }
        const index16 = modifiedTurnos.findIndex((t: { hora: string; }) => t.hora === '16:00');
        if(index16 !== -1) { modifiedTurnos[index16] = { ...modifiedTurnos[index16], estado: 'CONFIRMADO', paciente: 'Paciente Mock Tarde (Par)', telefono: '55667788', email: 'mock.tarde@example.com' }; }
        return modifiedTurnos;
    }
    return weekdayTurnos;
  }

  // --- CRUD Operations ---

  async saveOrUpdateAppointment(turno: Turno): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    // Prepare patient DTO, handling potential missing name parts
    const nameParts = turno.paciente?.trim().split(/\s+/) || [];
    const firstName = nameParts.length > 0 ? nameParts[0] : 'Desconocido';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';


    const patientDto: AppointmentPatientDto = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: turno.telefono || '',
      email: turno.email || ''
    };

    // Ensure date 'YYYY-MM-DD' from Turno is 'YYYY/MM/DD' for backend request DTO
    const formattedFechaForRequest = turno.fecha.replace(/-/g, '/');
    // Ensure time 'HH:mm' from Turno is 'HH:mm:ss' for backend request DTO
    const formattedHoraForRequest = `${turno.hora}:00`;

    const requestDto: AppointmentRequestDto = {
      duration: turno.duracion || 50, // Default duration if not set
      fecha: formattedFechaForRequest,
      hora: formattedHoraForRequest,
      patient: patientDto,
      state: turno.estado // Use the state from the turno (e.g., CONFIRMADO)
    };

    // If it's an existing appointment (has apiId), it's an update (PUT)
    if (turno.apiId !== undefined && turno.apiId !== null) {
      // PUT: /SGTPI/api/appointments/{id}
      const updateEndpoint = `${this.API_BASE_URL}/patch-appointment/${turno.apiId}`;
      return new Promise((resolve, reject) => {
        this.http.put(updateEndpoint, requestDto)
          .pipe(
            catchError(this.handleError<any>('updateAppointment', null))
          )
          .subscribe({
            next: (response: any) => {
              const successMessage = response || 'Turno modificado exitosamente.';
              this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
              this.loading.set(false);
              this.cargarTurnos(this.fechaSeleccionadaSignal()); // Reload data
              resolve(successMessage);
            },
            error: (err) => {
              reject(err);
            }
          });
      });
    } else {
      // It's a new appointment (POST)
      // POST: /SGTPI/api/appointments
      const createEndpoint = (`${this.API_BASE_URL}/appointment`); // Uses the base URL
      return new Promise((resolve, reject) => {
        this.http.post<AppointmentResponseDto>(createEndpoint, requestDto)
          .pipe(
            catchError(this.handleError<AppointmentResponseDto>('createAppointment', {} as AppointmentResponseDto))
          )
          .subscribe({
            next: (response: AppointmentResponseDto) => {
              const successMessage = `Turno asignado exitosamente (ID: ${response.id}).`;
              this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
              this.loading.set(false);
              this.cargarTurnos(this.fechaSeleccionadaSignal()); // Reload data
              resolve(successMessage);
            },
            error: (err) => {
              reject(err);
            }
          });
      });
    }
  }

  async cancelAppointment(id: number): Promise<string> {
    this.loading.set(true);
    this.error.set(null);
    return new Promise((resolve, reject) => {
      // PUT: /SGTPI/api/appointment/cancel/{id} (Note: 'appointment' singular)
      this.http.put(`${this.API_BASE_URL}/appointment/cancel/${id}`, {}) // Adjust URL
        .pipe(
          catchError(this.handleError<any>('cancelAppointment', null))
        )
        .subscribe({
          next: (response: any) => {
            const successMessage = response || 'Turno cancelado exitosamente.';
            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);
            this.cargarTurnos(this.fechaSeleccionadaSignal());
            resolve(successMessage);
          },
          error: (err) => {
            reject(err);
          }
        });
    });
  }

  async toggleBlock(slotTime: Date, block: boolean): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    const year = slotTime.getFullYear();
    const month = (slotTime.getMonth() + 1).toString().padStart(2, '0');
    const day = slotTime.getDate().toString().padStart(2, '0');
    const hours = slotTime.getHours().toString().padStart(2, '0');
    const minutes = slotTime.getMinutes().toString().padStart(2, '0');
    const seconds = slotTime.getSeconds().toString().padStart(2, '0');
    const formattedSlotTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    return new Promise((resolve, reject) => {
      this.http.put(`${this.API_BASE_URL}/appointments/${formattedSlotTime}/${block}`, {})
        .pipe(
          catchError(this.handleError<any>('toggleBlock', null))
        )
        .subscribe({
          next: (response: any) => {
            const successMessage = response || (block ? 'Bloqueo exitoso.' : 'Desbloqueo exitoso.');
            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);

            // --- THE CRITICAL FIX: Update the signal *before* resolving the promise ---
            const targetDateStr = this.formatearFecha(slotTime); // YYYY-MM-DD
            const targetTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`; // HH:mm

            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.fecha === targetDateStr && turno.hora === targetTimeStr) {
                  // If blocking, clear patient data and apiId
                  if (block) {
                    return {
                      ...turno,
                      estado: 'BLOQUEADO',
                      paciente: undefined,
                      telefono: undefined,
                      email: undefined,
                      observaciones: undefined,
                      apiId: undefined // No backend ID for a blocked slot
                    };
                  } else {
                    // If unblocking, set to DISPONIBLE and clear patient data
                    return {
                      ...turno,
                      estado: 'DISPONIBLE',
                      paciente: undefined,
                      telefono: undefined,
                      email: undefined,
                      observaciones: undefined,
                      apiId: undefined // No backend ID for a newly available slot
                    };
                  }
                }
                return turno;
              });
            });
            // --- END CRITICAL FIX ---

            // Now resolve the promise, after the signal has been updated
            resolve(successMessage);
          },
          error: (err) => {
            reject(err);
          }
        });
    });
  }

  // --- General Error Handler ---
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      let errorMessage = `Error en ${operation}: `;

      // Check if running in a browser environment before using ErrorEvent
      if (isPlatformBrowser(this.platformId)) { // <-- THE CRITICAL CHANGE IS HERE
        if (error.error instanceof ErrorEvent) {
          // Client-side or network error
          errorMessage += `Error del cliente: ${error.error.message}`;
        } else {
          // Backend error
          const backendError = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
          errorMessage += `Código ${error.status}, Cuerpo: ${backendError}`;
        }
      } else {
        // Server-side (SSR) or non-browser environment
        // ErrorEvent is not defined here, handle general HttpErrorResponse
        errorMessage += `Código ${error.status}, Cuerpo: ${JSON.stringify(error.error)}`;
      }

      console.error(errorMessage);
      // Use error.error if it's a direct message from the backend, otherwise a generic message
      this.error.set(typeof error.error === 'string' ? error.error : 'Ocurrió un error inesperado. Intente de nuevo.');
      this.notificaciones.next({ tipo: 'error', mensaje: typeof error.error === 'string' ? error.error : 'Ocurrió un error inesperado.' });
      return throwError(() => new Error(errorMessage));
    };
  }
}