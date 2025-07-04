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
  duration: number; // Duration in minutes
  notes?: string; // Optional field for additional notes
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

  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  private API_BASE_URL = environment.apiBaseUrl;

  public turnosSignal = signal<Turno[]>([]);
  public loading = signal(false);
  public error = signal<string | null>(null);
  public fechaSeleccionadaSignal = signal<Date>(new Date());

  public notificaciones = new Subject<{ tipo: 'success' | 'error' | 'info'; mensaje: string }>();

  public turnosPorPeriodo = computed(() => {
    const turnosDelDia = this.turnosSignal();
    const manana: Turno[] = [];
    const tarde: Turno[] = [];
    const noche: Turno[] = [];

    turnosDelDia.forEach(turno => {
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
    this.cargarTurnos(this.fechaSeleccionadaSignal());
  }

  private esManana(hora: string): boolean {
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 8 && h < 13;
  }

  private esTarde(hora: string): boolean {
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 13 && h < 20;
  }

  private esNoche(hora: string): boolean {
    const h = parseInt(hora.split(':')[0], 10);
    return h >= 20 && h <= 22;
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public async refreshCurrentDayAppointments(): Promise<void> {
    const currentSelectedDate = this.fechaSeleccionadaSignal();
    const dateIsoFormat = this.formatearFecha(currentSelectedDate);
    console.log(`[TurnosService] Refrescando turnos para la fecha actual: ${dateIsoFormat}`);
    await this.getTurnosPorFecha(dateIsoFormat);
  }

  seleccionarFecha(fecha: Date) {
    const normalizedDate = new Date(fecha);
    normalizedDate.setHours(0, 0, 0, 0);
    this.fechaSeleccionadaSignal.set(normalizedDate);
    this.cargarTurnos(normalizedDate);
  }

  async getTurnosPorFecha(dateIsoFormat: string): Promise<Turno[]> {
    this.loading.set(true);
    this.error.set(null);

    console.log(`[getTurnosPorFecha] Requesting appointments for date: ${dateIsoFormat}`);

    return new Promise((resolve, reject) => {
      this.http.get<AppointmentResponseDto[]>(`${this.API_BASE_URL}/appointments/${dateIsoFormat}`)
        .pipe(
          catchError(this.handleError<AppointmentResponseDto[]>('getTurnosPorFecha', []))
        )
        .subscribe({
          next: (backendResponses: AppointmentResponseDto[]) => {
            console.log('[getTurnosPorFecha] Raw Backend Responses:', backendResponses);

            const targetDate = new Date(dateIsoFormat + 'T12:00:00Z');
            console.log('[getTurnosPorFecha] Date object passed to generarTurnosParaFecha:', targetDate);

            const fullDaySchedule = this.generarTurnosParaFecha(targetDate);
            console.log('[getTurnosPorFecha] Frontend Base Schedule:', fullDaySchedule);

            const mergedSchedule: Turno[] = fullDaySchedule.map(slot => {
              const foundResponse = backendResponses.find(
                backendRes => {
                  const backendFechaFormatted = backendRes.fecha.replace(/\//g, '-');
                  const backendHoraFormatted = backendRes.hora.substring(0, 5);

                  return backendFechaFormatted === slot.fecha && backendHoraFormatted === slot.hora;
                }
              );

              if (foundResponse) {
                console.log(`  [getTurnosPorFecha] MATCH FOUND for slot ${slot.hora}. Merging with backend ID: ${foundResponse.id}`);
                return {
                  ...slot,
                  id: `backend-${foundResponse.id}`,
                  apiId: foundResponse.id,
                  estado: foundResponse.state as Turno['estado'],
                  paciente: `${foundResponse.patientName || ''} ${foundResponse.patientLastName || ''}`.trim(),
                  telefono: foundResponse.patientPhoneNumber || undefined,
                  email: foundResponse.patientEmail || undefined,
                  duracion: foundResponse.duration || slot.duracion,
                  observaciones: foundResponse.notes || undefined
                };
              }
              return slot;
            });

            console.log('[getTurnosPorFecha] Final Merged Schedule (to be set to signal):', mergedSchedule);
            this.turnosSignal.set(mergedSchedule);
            this.loading.set(false);
            resolve(mergedSchedule);
          },
          error: (err) => {
            console.error('[getTurnosPorFecha] Error fetching appointments:', err);
            reject(err);
          }
        });
    });
  }

  private cargarTurnos(fecha: Date) {
    const isoDate = this.formatearFecha(fecha);
    this.getTurnosPorFecha(isoDate);
  }

  private generarTurnosParaFecha(fecha: Date): Turno[] {
    const fechaStr = this.formatearFecha(fecha);
    const diaSemana = fecha.getDay();
    const diaMes = fecha.getDate();

    const turnosBase = this.generarTurnosBase(diaSemana, diaMes);

    return turnosBase.map((turno): Turno => {
      return {
        id: `base-slot-${fechaStr}-${turno.hora}`,
        fecha: fechaStr,
        hora: turno.hora,
        estado: turno.estado,
        paciente: turno.paciente || undefined,
        telefono: turno.telefono || undefined,
        email: turno.email || undefined,
        duracion: turno.duracion || 50,
        fechaCreacion: new Date(),
        fechaModificacion: undefined,
        observaciones: undefined,
        apiId: undefined
      };
    });
  }


  private generarTurnosBase(diaSemana: number, diaMes: number): Array<{
      hora: string;
      estado: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO';
      paciente?: string;
      telefono?: string;
      email?: string;
      duracion?: number;
    }> {
      // Definimos la lista base de horarios disponibles para cualquier día.
      // Inicialmente, todos están 'DISPONIBLE' y sin datos de paciente.
      const weekdayTurnos: Array<{ hora: string; estado: any; paciente?: string; telefono?: string; email?: string; duracion?: number; }> = [
        { hora: '08:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '09:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '10:00', estado: 'DISPONIBLE', duracion: 50 },
        { hora: '11:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '12:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '13:00', estado: 'DISPONIBLE', duracion: 50 },
        { hora: '14:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '15:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '16:00', estado: 'DISPONIBLE', duracion: 50 },
        { hora: '17:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '18:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '19:00', estado: 'DISPONIBLE', duracion: 50 },
        { hora: '20:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '21:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '22:00', estado: 'DISPONIBLE', duracion: 50 }
      ];
  
      // Lógica para bloquear fines de semana (domingo = 0, sábado = 6)
      if (diaSemana === 0 || diaSemana === 6) {
          console.log(`[generarTurnosBase] Bloqueando todos los turnos para el fin de semana (Día: ${diaSemana}).`);
          return weekdayTurnos.map(t => ({ ...t, estado: 'BLOQUEADO' }));
      }
  
      // Lógica para bloquear horarios específicos los miércoles (díaSemana === 3)
      if (diaSemana === 3) {
          console.log(`[generarTurnosBase] Bloqueando turnos de 15:00 a 18:00 para el miércoles.`);
          return weekdayTurnos.map(t => {
              if (['15:00', '16:00', '17:00', '18:00'].includes(t.hora)) {
                  return { ...t, estado: 'BLOQUEADO' };
              }
              return t;
          });
      }
  
      // Si no es fin de semana ni miércoles, devolvemos los turnos tal cual (DISPONIBLE).
      console.log(`[generarTurnosBase] Turnos disponibles para el día normal.`);
      return weekdayTurnos;
  }

  // --- CRUD Operations ---

  async saveOrUpdateAppointment(turno: Turno): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    const nameParts = turno.paciente?.trim().split(/\s+/) || [];
    const firstName = nameParts.length > 0 ? nameParts[0] : 'Desconocido';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const patientDto: AppointmentPatientDto = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: turno.telefono || '',
      email: turno.email || ''
    };

    const formattedFechaForRequest = turno.fecha.replace(/-/g, '/');
    const formattedHoraForRequest = `${turno.hora}:00`;

    const requestDto: AppointmentRequestDto = {
      duration: turno.duracion || 50,
      fecha: formattedFechaForRequest,
      hora: formattedHoraForRequest,
      patient: patientDto,
      state: turno.estado
    };

    if (turno.apiId !== undefined && turno.apiId !== null) {
      const updateEndpoint = `${this.API_BASE_URL}/patch-appointment/${turno.apiId}`;
      return new Promise((resolve, reject) => {
        this.http.put(updateEndpoint, requestDto)
          .pipe(
            // No usar catchError para un 200 OK
          )
          .subscribe({
            next: async (response: any) => { // response will be the parsed JSON or plain text
              const successMessage = response && response.text ? response.text : 'Turno modificado exitosamente.';
              this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
              this.loading.set(false);
              await this.refreshCurrentDayAppointments();
              resolve(successMessage);
            },
            error: (err) => { // This error block will only be hit for actual HTTP errors (4xx, 5xx)
              console.error(`Error en updateAppointment:`, err);
              this.handleHttpError(err, 'updateAppointment',null); // Usa un manejador de errores real
              reject(err);
            }
          });
      });
    } else {
      const createEndpoint = (`${this.API_BASE_URL}/appointment`);
      return new Promise((resolve, reject) => {
        this.http.post<AppointmentResponseDto>(createEndpoint, requestDto)
          .pipe(
            // No usar catchError para un 200 OK
          )
          .subscribe({
            next: async (response: AppointmentResponseDto) => {
              const successMessage = `Turno asignado exitosamente (ID: ${response.id}).`;
              this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
              this.loading.set(false);
              await this.refreshCurrentDayAppointments();
              resolve(successMessage);
            },
            error: (err) => {
              console.error(`Error en createAppointment:`, err);
              this.handleHttpError(err, 'createAppointment',null);
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
      this.http.put(`${this.API_BASE_URL}/appointment/cancel/${id}`, {}, { responseType: 'text' })
        .subscribe({
          next: async (rawResponseText: string) => {
            console.log(`[cancelAppointment] SUCCESS - Next block entered! Raw Response (text):`, rawResponseText);

            let successMessage: string;
            let parsedResponse: any;

            try {
              parsedResponse = JSON.parse(rawResponseText);
              if (parsedResponse && typeof parsedResponse === 'object' && 'text' in parsedResponse) {
                successMessage = parsedResponse.text;
              } else {
                successMessage = 'Turno cancelado exitosamente.';
              }
            } catch (e) {
              console.warn(`[cancelAppointment] Failed to parse response as JSON. Treating as plain text. Error:`, e);
              successMessage = rawResponseText || 'Turno cancelado exitosamente.';
            }

            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);

            // *** NEW: Optimistic UI update for cancellation, retaining patient data ***
            // This updates the signal immediately, before the full refresh.
            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.apiId === id) { // Match by apiId as it's a backend ID
                  // Update the state to 'CANCELADO'
                  // IMPORTANT: Do NOT set patient, phone, email, etc., to undefined here.
                  return {
                    ...turno,
                    estado: 'CANCELADO',
                    // Patient data (paciente, telefono, email, observaciones) is retained
                  };
                }
                return turno;
              });
            });

            // Full refresh to sync with backend data and confirm changes
            await this.refreshCurrentDayAppointments();
            console.log(`[cancelAppointment] Refresh completed after successful cancellation.`);
            resolve(successMessage);
          },
          error: (err: HttpErrorResponse) => { // This block should now ONLY be hit for non-200 status codes
            console.error(`[cancelAppointment] ERROR - Error block entered! HttpErrorResponse:`, err);
            this.handleHttpError(err, 'cancelAppointment',null);
            reject(err);
          }
        });
    });
}


  // --- toggleBlock (MÉTODO ACTUALIZADO) ---
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

    console.log(`[toggleBlock] Attempting to ${block ? 'block' : 'unblock'} schedule for: ${formattedSlotTime}`);

    return new Promise((resolve, reject) => {
      // *** KEY CHANGE HERE: Add { responseType: 'text' } ***
      this.http.put(`${this.API_BASE_URL}/appointments/${formattedSlotTime}/${block}`, {}, { responseType: 'text' })
        .subscribe({
          next: async (rawResponseText: string) => { // <-- Response is now a string
            console.log(`[toggleBlock] SUCCESS - Next block entered! Raw Response (text):`, rawResponseText);

            let successMessage: string;
            let parsedResponse: any;

            try {
              // Attempt to parse the raw text as JSON
              parsedResponse = JSON.parse(rawResponseText);
              // Extract the message if it has the 'text' property
              if (parsedResponse && typeof parsedResponse === 'object' && 'text' in parsedResponse) {
                successMessage = parsedResponse.text;
              } else {
                // Fallback if parsed but no 'text' property
                successMessage = block ? 'Horario bloqueado exitosamente.' : 'Horario desbloqueado exitosamente.';
              }
            } catch (e) {
              // If JSON.parse fails (e.g., backend sent plain text)
              console.warn(`[toggleBlock] Failed to parse response as JSON. Treating as plain text. Error:`, e);
              successMessage = rawResponseText || (block ? 'Horario bloqueado exitosamente.' : 'Horario desbloqueado exitosamente.');
            }

            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);

            // Optimistic UI update (optional, but good for perceived performance)
            const targetDateStr = this.formatearFecha(slotTime);
            const targetTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.fecha === targetDateStr && turno.hora === targetTimeStr) {
                  if (block) {
                    return { ...turno, estado: 'BLOQUEADO', paciente: undefined, telefono: undefined, email: undefined, observaciones: undefined, apiId: undefined };
                  } else {
                    return { ...turno, estado: 'DISPONIBLE', paciente: undefined, telefono: undefined, email: undefined, observaciones: undefined, apiId: undefined };
                  }
                }
                return turno;
              });
            });

            // Full refresh to sync with backend data
            await this.refreshCurrentDayAppointments();
            console.log(`[toggleBlock] Refresh completed after successful operation.`);
            resolve(successMessage);
          },
          error: (err: HttpErrorResponse) => {
            // This block should now ONLY be hit for non-200 status codes (like 400, 404, 500)
            console.error(`[toggleBlock] ERROR - Error block entered! HttpErrorResponse:`, err);

            // Handle the specific 400 cases for "No existe un bloqueo"
            if (err.status === 400 && err.error && typeof err.error === 'object' && 'text' in err.error) {
              const serverMessage = err.error.text;
              this.handleHttpError(err, 'toggleBlock', serverMessage);
              reject(new Error(serverMessage)); // Reject with the server's specific message
            } else {
              this.handleHttpError(err, 'toggleBlock',null); // General error handling
              reject(err);
            }
          }
        });
    });
}

  // --- Nuevo y simplificado manejador de errores HTTP ---
  private handleHttpError(error: HttpErrorResponse, operation = 'operation', serverMessage: any) {
    let errorMessage = `Error en ${operation}: `;

    if (isPlatformBrowser(this.platformId)) {
      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage += `Error del cliente o de red: ${error.error.message}`;
      } else {
        // Backend error (non-200 status code)
        const backendError = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        errorMessage += `Código ${error.status}, Cuerpo: ${backendError}`;
      }
    } else {
      // Server-side (SSR) or non-browser environment
      errorMessage += `Código ${error.status}, Cuerpo: ${JSON.stringify(error.error)}`;
    }

    console.error(errorMessage);
    const userMessage = typeof error.error === 'string' ? error.error : 'Ocurrió un error inesperado. Intente de nuevo.';
    this.error.set(userMessage);
    this.notificaciones.next({ tipo: 'error', mensaje: userMessage });
  }

  // Anterior handleError (si es que lo estabas usando en otros lados que *realmente* esperan que se active el catchError para 200s,
  // aunque no es la práctica recomendada).
  // Si solo lo usabas en getTurnosPorFecha, podemos mantenerlo, pero para los PUT/POST es mejor el patrón de arriba.
  // Si no tienes otro uso fuera de getTurnosPorFecha, puedes eliminar o adaptar este.
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      let errorMessage = `Error en ${operation}: `;

      if (isPlatformBrowser(this.platformId)) {
        if (error.error instanceof ErrorEvent) {
          errorMessage += `Error del cliente o de red: ${error.error.message}`;
        } else {
          const backendError = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
          errorMessage += `Código ${error.status}, Cuerpo: ${backendError}`;
        }
      } else {
        errorMessage += `Código ${error.status}, Cuerpo: ${JSON.stringify(error.error)}`;
      }

      console.error(errorMessage);
      this.error.set(typeof error.error === 'string' ? error.error : 'Ocurrió un error inesperado. Intente de nuevo.');
      this.notificaciones.next({ tipo: 'error', mensaje: typeof error.error === 'string' ? error.error : 'Ocurrió un error inesperado.' });
      return throwError(() => new Error(errorMessage));
    };
  }
}