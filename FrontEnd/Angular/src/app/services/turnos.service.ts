// src/app/services/turnos.service.ts

import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { Observable, throwError, Subject } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../environments/environment'; // Adjust path if necessary
import { Patient } from '../interfaces/patient'; // Import Patient interface
import { AppointmentResponseDto } from '../interfaces/AppointmentResponseDto';
import { AppointmentRequestDto } from '../interfaces/AppointmentRequestDto';


export interface AppointmentPatientDto {
  id?: number; // Added id for existing patients
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

// --- UPDATED Turno INTERFACE ---
export interface Turno {
  id: string;
  apiId?: number | null;
  hora: string;
  fecha: string;
  estado: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO';
  paciente?: string | null;
  telefono?: string | null;
  email?: string | null;
  duracion: number;
  fechaCreacion?: Date | null;
  fechaModificacion?: Date | null;
  observaciones?: string | null;
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

  private pollingInterval: any;


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
    // this.startPollingForInProgressAppointments(); // <-- COMENTAR O ELIMINAR ESTA LÍNEA
  }

  // --- Auxiliary Methods ---
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

  public formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // --- Appointment Loading Logic ---
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
          catchError(error => this.handleError<AppointmentResponseDto[]>(error, 'getTurnosPorFecha'))
        )
        .subscribe({
          next: (backendResponses: AppointmentResponseDto[]) => {
            console.log('[getTurnosPorFecha] Raw Backend Responses:', backendResponses);

            const targetDate = new Date(dateIsoFormat + 'T12:00:00');
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
                console.log(`  [getTurnosPorFecha] COINCIDENCIA ENCONTRADA para el slot ${slot.hora}. Fusionando con ID de backend: ${foundResponse.id}`);
                return {
                  ...slot,
                  id: `backend-${foundResponse.id}`,
                  apiId: foundResponse.id,
                  estado: foundResponse.state as Turno['estado'],
                  paciente: `${foundResponse.patientName || ''} ${foundResponse.patientLastName || ''}`.trim() || null,
                  telefono: foundResponse.patientPhoneNumber || null,
                  email: foundResponse.patientEmail || null,
                  duracion: foundResponse.duration || slot.duracion,
                  observaciones: foundResponse.notes || null
                };
              }
              return slot;
            });

            console.log('[getTurnosPorFecha] Final Merged Schedule (a ser establecido en la señal):', mergedSchedule);
            this.turnosSignal.set(mergedSchedule);
            this.loading.set(false);
            resolve(mergedSchedule);
          },
          error: (err) => {
            console.error('[getTurnosPorFecha] Error en la suscripción (already handled by catchError):', err);
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
        paciente: turno.paciente || null,
        telefono: turno.telefono || null,
        email: turno.email || null,
        duracion: turno.duracion || 50,
        fechaCreacion: new Date(),
        fechaModificacion: null,
        observaciones: null,
        apiId: null
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
    const weekdayTurnos: Array<{ hora: string; estado: any; paciente?: string; telefono?: string; email?: string; duracion?: number; }> = [
      { hora: '08:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '09:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '10:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '11:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '12:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '13:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '14:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '15:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '16:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '17:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '18:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '19:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '20:00', estado: 'DISPONIBLE', duracion: 50 }, { hora: '21:00', estado: 'DISPONIBLE', duracion: 50 },
      { hora: '22:00', estado: 'DISPONIBLE', duracion: 50 }
    ];

    if (diaSemana === 0 || diaSemana === 6) {
      console.log(`[generarTurnosBase] Bloqueando todos los turnos para el fin de semana (Día: ${diaSemana}).`);
      return weekdayTurnos.map(t => ({ ...t, estado: 'BLOQUEADO' }));
    }

    if (diaSemana === 3) {
      console.log(`[generarTurnosBase] Bloqueando turnos de 15:00 a 18:00 para el miércoles.`);
      return weekdayTurnos.map(t => {
        if (['15:00', '16:00', '17:00', '18:00'].includes(t.hora)) {
          return { ...t, estado: 'BLOQUEADO' };
        }
        return t;
      });
    }

    console.log(`[generarTurnosBase] Available appointments for a normal day.`);
    return weekdayTurnos;
  }

  // --- CRUD Operations (Create, Read, Update, Delete) ---

  async createAppointment(requestDto: AppointmentRequestDto): Promise<AppointmentResponseDto> {
    this.loading.set(true);
    this.error.set(null);

    console.log('[createAppointment] Attempting to create appointment with DTO:', requestDto);

    return new Promise((resolve, reject) => {
      this.http.post<AppointmentResponseDto>(`${this.API_BASE_URL}/appointment`, requestDto)
        .subscribe({
          next: async (response: AppointmentResponseDto) => {
            console.log('[createAppointment] Appointment created successfully:', response);
            this.notificaciones.next({ tipo: 'success', mensaje: `Turno asignado exitosamente (ID: ${response.id}).` });
            this.loading.set(false);
            await this.refreshCurrentDayAppointments();
            resolve(response);
          },
          error: (err: HttpErrorResponse) => {
            console.error(`Error in createAppointment:`, err);
            this.handleError(err, 'createAppointment');
            reject(err);
          }
        });
    });
  }

  async saveOrUpdateAppointment(turno: Turno, patientData: Patient): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    const patientDto: AppointmentPatientDto = {
      id: patientData.id,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      phoneNumber: patientData.phoneNumber,
      email: patientData.email || ''
    };

    const formattedFechaForRequest = turno.fecha.replace(/-/g, '/');
    const formattedHoraForRequest = `${turno.hora}:00`;

    const requestDto: AppointmentRequestDto = {
      duration: turno.duracion || 50,
      fecha: formattedFechaForRequest,
      hora: formattedHoraForRequest,
      patient: patientDto,
      state: turno.estado,
      sessionNotes: turno.observaciones || ''
    };

    console.log('[saveOrUpdateAppointment] --- REQUEST START ---');
    console.log('[saveOrUpdateAppointment] Request DTO to send:', requestDto);
    console.log('[saveOrUpdateAppointment] Appointment API ID:', turno.apiId);
    console.log('[saveOrUpdateAppointment] API Base URL:', this.API_BASE_URL);


    return new Promise((resolve, reject) => {
      let apiCall: Observable<string | AppointmentResponseDto>;
      let requestUrl: string;

      if (turno.apiId !== undefined && turno.apiId !== null) {
        requestUrl = `${this.API_BASE_URL}/patch-appointment/${turno.apiId}`;
        apiCall = this.http.patch(requestUrl, requestDto, { responseType: 'text' });
        console.log(`[saveOrUpdateAppointment] Performing PATCH to: ${requestUrl}`);
      } else {
        requestUrl = `${this.API_BASE_URL}/appointment`;
        apiCall = this.http.post<AppointmentResponseDto>(requestUrl, requestDto);
        console.log(`[saveOrUpdateAppointment] Performing POST to: ${requestUrl}`);
      }

      apiCall.subscribe({
        next: async (response) => {
          console.log('[saveOrUpdateAppointment] Request successful. Response:', response);
          let successMessage: string;

          if (typeof response === 'string') {
            try {
              const parsedResponse = JSON.parse(response);
              successMessage = parsedResponse.text || 'Turno modificado exitosamente.';
            } catch (e) {
              console.warn('[saveOrUpdateAppointment] Failed to parse JSON response (PATCH). Using plain text.', e);
              successMessage = response;
            }
          } else {
            successMessage = `Turno asignado exitosamente (ID: ${response.id}).`;
          }

          this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
          this.loading.set(false);
          await this.refreshCurrentDayAppointments();
          resolve(successMessage);
          console.log('[saveOrUpdateAppointment] --- REQUEST SUCCESSFUL END ---');
        },
        error: (err: HttpErrorResponse) => {
          console.error(`[saveOrUpdateAppointment] ERROR in request:`, err);
          this.handleError(err, 'saveOrUpdateAppointment');
          reject(err);
          console.log('[saveOrUpdateAppointment] --- REQUEST WITH ERROR END ---');
        }
      });
    });
  }

  async cancelAppointment(id: number): Promise<string> {
    this.loading.set(true);
    this.error.set(null);
    return new Promise((resolve, reject) => {
      this.http.put(`${this.API_BASE_URL}/appointment/cancel/${id}`, {}, { responseType: 'text' })
        .subscribe({
          next: async (rawResponseText: string) => {
            console.log(`[cancelAppointment] Success - next block! Raw Response (text):`, rawResponseText);

            let successMessage: string;
            try {
              const parsedResponse = JSON.parse(rawResponseText);
              successMessage = parsedResponse.text || 'Turno cancelado exitosamente.';
            } catch (e) {
              console.warn(`[cancelAppointment] Failed to parse JSON response. Treating as plain text. Error:`, e);
              successMessage = rawResponseText || 'Turno cancelado exitosamente.';
            }

            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);

            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.apiId === id) {
                  return {
                    ...turno,
                    estado: 'CANCELADO',
                  };
                }
                return turno;
              });
            });

            await this.refreshCurrentDayAppointments();
            console.log(`[cancelAppointment] Refresh completed after successful cancellation.`);
            resolve(successMessage);
          },
          error: (err: HttpErrorResponse) => {
            console.error(`[cancelAppointment] ERROR - error block! HttpErrorResponse:`, err);
            this.handleError(err, 'cancelAppointment');
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

    console.log(`[toggleBlock] Attempting to ${block ? 'block' : 'unblock'} time slot for: ${formattedSlotTime}`);

    return new Promise((resolve, reject) => {
      this.http.put(`${this.API_BASE_URL}/appointments/${formattedSlotTime}/${block}`, {}, { responseType: 'text' })
        .subscribe({
          next: async (rawResponseText: string) => {
            console.log(`[toggleBlock] Success - next block! Raw Response (text):`, rawResponseText);

            let successMessage: string;
            try {
              const parsedResponse = JSON.parse(rawResponseText);
              if (parsedResponse && typeof parsedResponse === 'object' && 'text' in parsedResponse) {
                successMessage = parsedResponse.text;
              } else {
                successMessage = block ? 'Horario bloqueado exitosamente.' : 'Horario desbloqueado exitosamente.';
              }
            } catch (e) {
              console.warn(`[toggleBlock] Failed to parse JSON response. Treating as plain text. Error:`, e);
              successMessage = rawResponseText || (block ? 'Horario bloqueado exitosamente.' : 'Horario desbloqueado exitosamente.');
            }

            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);

            const targetDateStr = this.formatearFecha(slotTime);
            const targetTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.fecha === targetDateStr && turno.hora === targetTimeStr) {
                  if (block) {
                    return {
                      ...turno,
                      estado: 'BLOQUEADO',
                      paciente: null,
                      telefono: null,
                      email: null,
                      observaciones: null,
                      apiId: null
                    };
                  } else {
                    return {
                      ...turno,
                      estado: 'DISPONIBLE',
                      paciente: null,
                      telefono: null,
                      email: null,
                      observaciones: null,
                      apiId: null
                    };
                  }
                }
                return turno;
              });
            });

            await this.refreshCurrentDayAppointments();
            console.log(`[toggleBlock] Refresh completed after successful operation.`);
            resolve(successMessage);
          },
          error: (err: HttpErrorResponse) => {
            console.error(`[toggleBlock] ERROR - error block! HttpErrorResponse:`, err);

            if (err.status === 400 && err.error && typeof err.error === 'object' && 'text' in err.error) {
              const serverMessage = err.error.text;
              this.handleError(err, 'toggleBlock', serverMessage);
              reject(new Error(serverMessage));
            } else {
              this.handleError(err, 'toggleBlock');
              reject(err);
            }
          }
        });
    });
  }

  /**
   * Handles HTTP errors and notifies the user.
   * @param error The HttpErrorResponse object.
   * @param operation The name of the operation that caused the error.
   * @param customMessage A custom message to display to the user (optional).
   * @returns An Observable that emits an error.
   */
  private handleError<T>(error: HttpErrorResponse, operation = 'operation', customMessage?: string): Observable<T> {
    let errorMessage = `Error en ${operation}: `;
    let userDisplayMessage: string = 'Ocurrió un error inesperado. Por favor, intente de nuevo.';

    if (isPlatformBrowser(this.platformId)) {
      if (error.error instanceof ErrorEvent) {
        errorMessage += `Error del cliente o de red: ${error.error.message}`;
        userDisplayMessage = 'Hubo un problema de conexión. Intente de nuevo.';
      } else {
        let backendErrorBody: string;
        if (typeof error.error === 'string') {
          backendErrorBody = error.error;
        } else if (error.error === null || error.error === undefined) {
          backendErrorBody = 'No se proporcionaron detalles de error desde el backend.';
        } else if (typeof error.error === 'object') {
          try {
            backendErrorBody = JSON.stringify(error.error);
          } catch (e) {
            backendErrorBody = `Error de backend (objeto no serializable): ${String(error.error)}`;
          }
        } else {
          backendErrorBody = `Tipo de error de backend inesperado: ${String(error.error)}`;
        }
        errorMessage += `Código ${error.status}, Cuerpo: ${backendErrorBody}`;

        if (error.status === 409 && typeof error.error === 'string' && error.error.includes('La fecha y hora seleccionadas ya están ocupadas')) {
          userDisplayMessage = '¡Conflicto de horario! La fecha y hora seleccionadas ya están ocupadas por otro turno.';
        } else if (customMessage) {
          userDisplayMessage = customMessage;
        } else if (error.error && typeof error.error === 'object' && 'message' in error.error) {
          userDisplayMessage = String((error.error as any).message || 'Error del servidor sin mensaje específico.');
        } else if (typeof error.error === 'string' && error.error.length > 0) {
          userDisplayMessage = error.error;
        }
      }
    } else {
      let backendErrorBody: string;
      if (typeof error.error === 'string') {
        backendErrorBody = error.error;
      } else if (error.error === null || error.error === undefined) {
        backendErrorBody = 'No se proporcionaron detalles de error desde el backend (SSR).';
      } else if (typeof error.error === 'object') {
        try {
          backendErrorBody = JSON.stringify(error.error);
        } catch (e) {
          backendErrorBody = `Error de backend (objeto no serializable SSR): ${String(error.error)}`;
        }
      } else {
        backendErrorBody = `Tipo de error de backend inesperado (SSR): ${String(error.error)}`;
      }
      errorMessage += `Código ${error.status}, Cuerpo: ${backendErrorBody}`;
      userDisplayMessage = `Error ${error.status}: Ocurrió un problema en el servidor.`;
    }

    if (userDisplayMessage.trim() === '') {
        userDisplayMessage = 'Ocurrió un error inesperado. Por favor, intente de nuevo.';
    }

    // console.error(errorMessage); // Comentar esta línea para ver si el error desaparece
    // this.error.set(userDisplayMessage); // Comentar esta línea también
    // this.notificaciones.next({ tipo: 'error', mensaje: userDisplayMessage }); // Comentar esta línea también

    return throwError(() => new Error(userDisplayMessage));
  }

  // --- NEW POLLING METHODS ---
  public startPollingForInProgressAppointments(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval); // Clear any existing interval
    }
    // Poll every 30 seconds (adjust as needed)
    this.pollingInterval = setInterval(async () => {
      console.log('[TurnosService] Polling for in-progress appointments...');
      if (isPlatformBrowser(this.platformId)) {
        await this.refreshCurrentDayAppointments();
      }
    }, 30000); // 30 seconds
  }

  public stopPollingForInProgressAppointments(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[TurnosService] Stopped polling for in-progress appointments.');
    }
  }

  /**
   * Obtiene el historial de turnos para un paciente específico.
   * @param patientId El ID del paciente.
   * @returns Una Promesa que resuelve con un array de AppointmentResponseDto.
   */
  async getAppointmentsByPatientId(patientId: number): Promise<AppointmentResponseDto[]> {
    this.loading.set(true);
    this.error.set(null);
    console.log(`[TurnosService] Solicitando historial de turnos para paciente ID: ${patientId}`);

    return new Promise((resolve, reject) => {
      this.http.get<AppointmentResponseDto[]>(`${this.API_BASE_URL}/appointments/patient/${patientId}`)
        .pipe(
          catchError(error => this.handleError<AppointmentResponseDto[]>(error, 'getAppointmentsByPatientId'))
        )
        .subscribe({
          next: (appointments: AppointmentResponseDto[]) => {
            console.log(`Historial de turnos para paciente ID ${patientId}:`, appointments);
            this.loading.set(false);
            resolve(appointments);
          },
          error: (err) => {
            console.error(`Error al obtener historial de turnos para paciente ID ${patientId}:`, err);
            this.loading.set(false);
            reject(err);
          }
        });
    });
  }

/**
   * Actualiza las notas de sesión de un turno específico.
   * Utiliza la nueva API: PATCH /session-notes/{id}
   * @param appointmentId El ID del turno.
   * @param notes Las nuevas notas de sesión.
   * @returns Una Promesa que resuelve cuando las notas se han guardado.
   */
async updateAppointmentNotes(appointmentId: number, notes: string): Promise<void> {
  this.loading.set(true);
  this.error.set(null);
  console.log(`[TurnosService] Actualizando notas para turno ID ${appointmentId} con API: /session-notes/{id}`);

  return new Promise((resolve, reject) => {
    // El backend espera el cuerpo como un String directamente, no un objeto JSON con una propiedad.
    // Por lo tanto, enviamos la cadena de 'notes' directamente como cuerpo de la solicitud.
    this.http.patch(`${this.API_BASE_URL}/session-notes/${appointmentId}`, notes, { responseType: 'text' })
      .pipe(
        catchError(error => this.handleError<string>(error, 'updateAppointmentNotes'))
      )
      .subscribe({
        next: (response) => {
          console.log(`Notas del turno ID ${appointmentId} actualizadas:`, response);
          this.notificaciones.next({ tipo: 'success', mensaje: 'Notas actualizadas exitosamente.' });
          this.loading.set(false);
          resolve();
        },
        error: (err) => {
          console.error(`Error al actualizar notas para turno ID ${appointmentId}:`, err);
          this.loading.set(false);
          reject(err);
        }
      });
  });
}

/**
 * Obtiene las notas de sesión de un turno específico por su ID.
 * Utiliza la nueva API: GET /get-notes/{id}
 * @param appointmentId El ID del turno.
 * @returns Una Promesa que resuelve con la cadena de observaciones o `null` si no se encuentran.
 */
async getAppointmentNotes(appointmentId: number): Promise<string | null> {
  this.loading.set(true);
  this.error.set(null);
  console.log(`[TurnosService] Solicitando notas para el turno ID: ${appointmentId} con API: /get-notes/{id}`);

  return new Promise((resolve, reject) => {
    this.http.get<string>(`${this.API_BASE_URL}/get-notes/${appointmentId}`, { responseType: 'text' as 'json' })
      .pipe(
        catchError(error => {
          // Si el backend devuelve 404 (Not Found), eso significa que no hay notas para ese ID.
          // Queremos que esto resuelva a null, no que lance un error fatal.
          if (error.status === 404) {
            console.log(`[getAppointmentNotes] No se encontraron notas para el turno ID ${appointmentId} (404 Not Found).`);
            this.loading.set(false);
            return new Observable<string | null>(subscriber => {
              subscriber.next(null);
              subscriber.complete();
            });
          }
          // Para otros errores, usa el manejador de errores estándar
          return this.handleError<string | null>(error, 'getAppointmentNotes');
        })
      )
      .subscribe({
        next: (notes: string | null) => {
          console.log(`[getAppointmentNotes] Notas recibidas para turno ID ${appointmentId}:`, notes);
          this.loading.set(false);
          resolve(notes);
        },
        error: (err) => {
          console.error(`[getAppointmentNotes] Error en la suscripción para turno ID ${appointmentId}:`, err);
          this.loading.set(false);
          reject(err);
        }
      });
  });
}
}
