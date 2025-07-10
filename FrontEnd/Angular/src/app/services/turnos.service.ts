// src/app/services/turnos.service.ts

import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { Observable, throwError, Subject } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../environments/environment'; // Adjust path if necessary
import { Patient } from '../interfaces/patient'; // Import Patient interface

// --- DTO INTERFACES ---
// These interfaces represent the structure of data sent to and received from the backend.
// If you have them in separate files (e.g., src/app/interfaces/appointment-dtos.ts),
// you can delete these definitions and keep only their imports.

// --- DTO INTERFACES ---
// ACTUALIZACIÓN CLAVE AQUÍ: Añadir firstName, lastName, email a AppointmentPatientDto
export interface AppointmentPatientDto {
  id?: number; // Added id for existing patients
  firstName: string; // <-- AÑADIDO
  lastName: string;  // <-- AÑADIDO
  phoneNumber: string;
  email: string;     // <-- AÑADIDO
}

export interface AppointmentRequestDto {
  duration: number; // Appointment duration (e.g., in minutes)
  fecha: string;    // Format 'YYYY/MM/DD'
  hora: string;     // Format 'HH:mm:ss'
  patient: Patient; // Nested DTO for the patient
  state: string;
  sessionNotes?: string; // NEW FIELD: Session observations!
}

export interface AppointmentResponseDto {
  id: number;
  patientName: string;
  patientLastName: string;
  patientPhoneNumber: string;
  patientEmail: string;
  fecha: string; // Date in backend format (e.g., 'YYYY/MM/DD')
  hora: string;  // Time in backend format (e.g., 'HH:mm:ss')
  state: string;
  duration: number; // Duration in minutes
  notes?: string; // Optional field for additional notes (if backend returns it)
  creationDate?: string; // Creation date from backend (for compatibility)
  modificationDate?: string; // Modification date from backend (for compatibility)
}
// --- END DTO INTERFACES ---


// --- UPDATED Turno INTERFACE ---
// This interface represents the internal structure of an 'appointment' in your Angular application.
// It combines data from generated time slots (DISPONIBLE) and backend (CONFIRMADO/BLOQUEADO).
export interface Turno {
  id: string; // Frontend-friendly ID: 'slot-...' or 'backend-{apiId}'
  apiId?: number; // The actual numeric backend ID for confirmed/blocked appointments

  hora: string; // HH:mm format for display (e.g., '09:00')
  fecha: string; // YYYY-MM-DD format for Date object creation and comparison

  estado: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO';

  // Patient details (only for CONFIRMADO and CANCELADO)
  paciente?: string; // Full name: patientName + patientLastName
  telefono?: string;
  email?: string; // New: from patientEmail
  duracion: number; // Appointment duration

  fechaCreacion?: Date; // Timestamp when this appointment was created/loaded in frontend
  fechaModificacion?: Date; // Timestamp of last modification in backend
  observaciones?: string; // Corresponds to sessionNotes in the backend Request DTO
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
    console.log(`[TurnosService] Refreshing appointments for current date: ${dateIsoFormat}`);
    await this.getTurnosPorFecha(dateIsoFormat);
  }

  seleccionarFecha(fecha: Date) {
    const normalizedDate = new Date(fecha);
    normalizedDate.setHours(0, 0, 0, 0); // Normalize date to midnight to avoid timezone issues
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

            // Ensure the target date is correct to generate the base schedule
            const targetDate = new Date(dateIsoFormat + 'T12:00:00'); // Use T12:00:00 to avoid DST issues
            console.log('[getTurnosPorFecha] Date object passed to generateTurnosParaFecha:', targetDate);

            const fullDaySchedule = this.generarTurnosParaFecha(targetDate);
            console.log('[getTurnosPorFecha] Frontend Base Schedule:', fullDaySchedule);

            const mergedSchedule: Turno[] = fullDaySchedule.map(slot => {
              const foundResponse = backendResponses.find(
                backendRes => {
                  // Normalize formats for comparison
                  const backendFechaFormatted = backendRes.fecha.replace(/\//g, '-'); // Ensure YYYY-MM-DD
                  const backendHoraFormatted = backendRes.hora.substring(0, 5); // Ensure HH:mm

                  return backendFechaFormatted === slot.fecha && backendHoraFormatted === slot.hora;
                }
              );

              if (foundResponse) {
                console.log(`  [getTurnosPorFecha] MATCH FOUND for slot ${slot.hora}. Merging with backend ID: ${foundResponse.id}`);
                return {
                  ...slot,
                  id: `backend-${foundResponse.id}`, // Frontend ID
                  apiId: foundResponse.id, // Actual backend ID
                  estado: foundResponse.state as Turno['estado'],
                  // Combine first and last name for 'paciente' field
                  paciente: `${foundResponse.patientName || ''} ${foundResponse.patientLastName || ''}`.trim(),
                  telefono: foundResponse.patientPhoneNumber || undefined,
                  email: foundResponse.patientEmail || undefined,
                  duracion: foundResponse.duration || slot.duracion,
                  // Ensure creation/modification dates are Date objects
                  fechaCreacion: foundResponse.creationDate ? new Date(foundResponse.creationDate) : undefined, // Can be string from backend
                  fechaModificacion: foundResponse.modificationDate ? new Date(foundResponse.modificationDate) : undefined, // Can be string from backend
                  observaciones: foundResponse.notes || undefined // Map notes to observaciones
                };
              }
              return slot; // If no backend response, use the base slot (DISPONIBLE or BLOQUEADO by default)
            });

            console.log('[getTurnosPorFecha] Final Merged Schedule (to be set in signal):', mergedSchedule);
            this.turnosSignal.set(mergedSchedule);
            this.loading.set(false);
            resolve(mergedSchedule);
          },
          error: (err) => {
            // Error is already handled by the pipe(catchError(...))
            console.error('[getTurnosPorFecha] Error in subscription (already handled by catchError):', err);
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
    const diaSemana = fecha.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diaMes = fecha.getDate(); // Day of the month (not used for rules for now)

    const turnosBase = this.generarTurnosBase(diaSemana, diaMes);

    return turnosBase.map((turno): Turno => {
      return {
        id: `base-slot-${fechaStr}-${turno.hora}`, // Unique frontend ID
        fecha: fechaStr,
        hora: turno.hora,
        estado: turno.estado,
        paciente: turno.paciente || undefined,
        telefono: turno.telefono || undefined,
        email: turno.email || undefined,
        duracion: turno.duracion || 50,
        fechaCreacion: new Date(), // Assign current date upon generation
        fechaModificacion: undefined,
        observaciones: undefined,
        apiId: undefined // Initially no backend ID
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
    // Define the base list of available times for any day.
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

    // Logic to block weekends (Sunday = 0, Saturday = 6)
    if (diaSemana === 0 || diaSemana === 6) {
      console.log(`[generarTurnosBase] Blocking all appointments for the weekend (Day: ${diaSemana}).`);
      return weekdayTurnos.map(t => ({ ...t, estado: 'BLOQUEADO' }));
    }

    // Logic to block specific times on Wednesdays (diaSemana === 3)
    if (diaSemana === 3) {
      console.log(`[generarTurnosBase] Blocking appointments from 15:00 to 18:00 for Wednesday.`);
      return weekdayTurnos.map(t => {
        if (['15:00', '16:00', '17:00', '18:00'].includes(t.hora)) {
          return { ...t, estado: 'BLOQUEADO' };
        }
        return t;
      });
    }

    // If not weekend or Wednesday, return appointments as is (DISPONIBLE).
    console.log(`[generarTurnosBase] Available appointments for a normal day.`);
    return weekdayTurnos;
  }

  // --- CRUD Operations (Create, Read, Update, Delete) ---

  /**
   * Creates a new appointment in the backend.
   * @param requestDto The AppointmentRequestDto with the data to create.
   * @returns A Promise with the created AppointmentResponseDto.
   */
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
            await this.refreshCurrentDayAppointments(); // Refresh to reflect changes
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

  /**
   * Saves or updates an appointment in the backend.
   * @param turno The Turno object with data to save/update.
   * @param patientData The complete Patient object selected from the list.
   * @returns A Promise with a success message.
   */
  async saveOrUpdateAppointment(turno: Turno, patientData: Patient): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    // Use Patient object data directly
    const patientDto: AppointmentPatientDto  = {
      id: patientData.id, // Ensure ID is sent for existing patients
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      phoneNumber: patientData.phoneNumber,
      email: patientData.email || '' // Ensure email is always a string
    };

    const formattedFechaForRequest = turno.fecha.replace(/-/g, '/'); // Format YYYY/MM/DD for backend
    const formattedHoraForRequest = `${turno.hora}:00`; // Format HH:mm:ss

    const requestDto: AppointmentRequestDto = {
      duration: turno.duracion || 50,
      fecha: formattedFechaForRequest,
      hora: formattedHoraForRequest,
      patient: patientDto, // Pass the patient DTO
      state: turno.estado,
      sessionNotes: turno.observaciones || '' // Map observations to sessionNotes
    };

    console.log('[saveOrUpdateAppointment] --- REQUEST START ---');
    console.log('[saveOrUpdateAppointment] Request DTO to send:', requestDto);
    console.log('[saveOrUpdateAppointment] Appointment API ID:', turno.apiId);
    console.log('[saveOrUpdateAppointment] API Base URL:', this.API_BASE_URL);


    return new Promise((resolve, reject) => {
      // Determine if it's an update (PATCH) or a creation (POST)
      let apiCall: Observable<string | AppointmentResponseDto>;
      let requestUrl: string;

      if (turno.apiId !== undefined && turno.apiId !== null) {
        // For PATCH, the Observable will emit a string
        requestUrl = `${this.API_BASE_URL}/patch-appointment/${turno.apiId}`;
        apiCall = this.http.patch(requestUrl, requestDto, { responseType: 'text' });
        console.log(`[saveOrUpdateAppointment] Performing PATCH to: ${requestUrl}`);
      } else {
        // For POST, the Observable will emit an AppointmentResponseDto
        requestUrl = `${this.API_BASE_URL}/appointment`;
        apiCall = this.http.post<AppointmentResponseDto>(requestUrl, requestDto);
        console.log(`[saveOrUpdateAppointment] Performing POST to: ${requestUrl}`);
      }

      apiCall.subscribe({
        next: async (response) => {
          console.log('[saveOrUpdateAppointment] Request successful. Response:', response);
          let successMessage: string;

          if (typeof response === 'string') {
            // PATCH case (patch-appointment), where we expect text
            try {
              const parsedResponse = JSON.parse(response);
              successMessage = parsedResponse.text || 'Turno modificado exitosamente.';
            } catch (e) {
              console.warn('[saveOrUpdateAppointment] Failed to parse JSON response (PATCH). Using plain text.', e);
              successMessage = response;
            }
          } else {
            // POST case (appointment), where we expect an AppointmentResponseDto object
            successMessage = `Turno asignado exitosamente (ID: ${response.id}).`;
          }

          this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
          this.loading.set(false);
          await this.refreshCurrentDayAppointments(); // Refresh to reflect changes
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

  /**
   * Cancels an existing appointment.
   * @param id The backend ID of the appointment.
   * @returns A Promise with a success message.
   */
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

            // *** OPTIMISTIC UI UPDATE FOR CANCELLATION ***
            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.apiId === id) { // Match by apiId (backend ID)
                  // Update status to 'CANCELADO' and keep patient data for display
                  return {
                    ...turno,
                    estado: 'CANCELADO',
                    // Important: Do not delete patient data here (name, phone, email, observations)
                    // so they continue to show in the interface as "Canceled (Patient Name)".
                    // Deletion of this data will occur with refresh if the backend does not send them for canceled ones.
                  };
                }
                return turno;
              });
            });

            // Full refresh to synchronize with backend data and confirm changes
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

  /**
   * Blocks or unblocks a time slot.
   * @param slotTime The exact date and time of the slot.
   * @param block Boolean: true to block, false to unblock.
   * @returns A Promise with a success message.
   */
  async toggleBlock(slotTime: Date, block: boolean): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

    const year = slotTime.getFullYear();
    const month = (slotTime.getMonth() + 1).toString().padStart(2, '0');
    const day = slotTime.getDate().toString().padStart(2, '0');
    const hours = slotTime.getHours().toString().padStart(2, '0');
    const minutes = slotTime.getMinutes().toString().padStart(2, '0');
    const seconds = slotTime.getSeconds().toString().padStart(2, '0');
    // Format required by the backend for the URL
    const formattedSlotTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    console.log(`[toggleBlock] Attempting to ${block ? 'block' : 'unblock'} time slot for: ${formattedSlotTime}`);

    return new Promise((resolve, reject) => {
      // PUT request to the block/unblock endpoint. We expect a text response.
      this.http.put(`${this.API_BASE_URL}/appointments/${formattedSlotTime}/${block}`, {}, { responseType: 'text' })
        .subscribe({
          next: async (rawResponseText: string) => {
            console.log(`[toggleBlock] Success - next block! Raw Response (text):`, rawResponseText);

            let successMessage: string;
            try {
              // Try to parse the response as JSON (backend might send { "text": "Message" })
              const parsedResponse = JSON.parse(rawResponseText);
              if (parsedResponse && typeof parsedResponse === 'object' && 'text' in parsedResponse) {
                successMessage = parsedResponse.text;
              } else {
                // Fallback if parsed but no 'text' property
                successMessage = block ? 'Horario bloqueado exitosamente.' : 'Horario desbloqueado exitosamente.';
              }
            } catch (e) {
              // If JSON.parse fails (e.g., backend sent plain text)
              console.warn(`[toggleBlock] Failed to parse JSON response. Treating as plain text. Error:`, e);
              successMessage = rawResponseText || (block ? 'Horario bloqueado exitosamente.' : 'Horario desbloqueado exitosamente.');
            }

            this.notificaciones.next({ tipo: 'success', mensaje: successMessage });
            this.loading.set(false);

            // *** OPTIMISTIC UI UPDATE FOR BLOCK/UNBLOCK ***
            const targetDateStr = this.formatearFecha(slotTime);
            const targetTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            this.turnosSignal.update(currentTurnos => {
              return currentTurnos.map(turno => {
                if (turno.fecha === targetDateStr && turno.hora === targetTimeStr) {
                  if (block) {
                    // If blocked, clear patient data and apiId
                    return { ...turno, estado: 'BLOQUEADO', paciente: undefined, telefono: undefined, email: undefined, observaciones: undefined, apiId: undefined };
                  } else {
                    // If unblocked, set to DISPONIBLE and clear apiId if it was explicitly blocked
                    return { ...turno, estado: 'DISPONIBLE', paciente: undefined, telefono: undefined, email: undefined, observaciones: undefined, apiId: undefined };
                  }
                }
                return turno;
              });
            });

            // Full refresh to synchronize with backend data
            await this.refreshCurrentDayAppointments();
            console.log(`[toggleBlock] Refresh completed after successful operation.`);
            resolve(successMessage);
          },
          error: (err: HttpErrorResponse) => {
            console.error(`[toggleBlock] ERROR - error block! HttpErrorResponse:`, err);

            // Handle specific errors, such as trying to unblock something that doesn't exist
            if (err.status === 400 && err.error && typeof err.error === 'object' && 'text' in err.error) {
              const serverMessage = err.error.text;
              this.handleError(err, 'toggleBlock', serverMessage); // Use server message
              reject(new Error(serverMessage)); // Reject with specific server message
            } else {
              this.handleError(err, 'toggleBlock'); // General error handling
              reject(err);
            }
          }
        });
    });
  }

  // --- Generalized HTTP Error Handler ---
  /**
   * Handles HTTP errors and notifies the user.
   * @param error The HttpErrorResponse object.
   * @param operation The name of the operation that caused the error.
   * @param customMessage A custom message to display to the user (optional).
   * @returns An Observable that emits an error.
   */
  private handleError<T>(error: HttpErrorResponse, operation = 'operation', customMessage?: string): Observable<T> {
    let errorMessage = `Error en ${operation}: `;
    let userDisplayMessage: string;

    if (isPlatformBrowser(this.platformId)) {
      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage += `Error del cliente o de red: ${error.error.message}`;
        userDisplayMessage = 'Hubo un problema de conexión. Intente de nuevo.';
      } else {
        // Backend error (non-2xx status codes)
        const backendErrorBody = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        errorMessage += `Código ${error.status}, Cuerpo: ${backendErrorBody}`;

        // --- Lógica añadida para manejar el conflicto de horario ---
        if (error.status === 409 && typeof error.error === 'string' && error.error.includes('La fecha y hora seleccionadas ya están ocupadas')) {
          userDisplayMessage = '¡Conflicto de horario! La fecha y hora seleccionadas ya están ocupadas por otro turno.';
        } else if (customMessage) { // Prioritize custom message if provided
          userDisplayMessage = customMessage;
        } else if (error.error && typeof error.error === 'object' && 'message' in error.error) { // Check for 'message' property
          userDisplayMessage = (error.error as any).message; // Cast to any to access message
        } else if (typeof error.error === 'string' && error.error.length > 0) {
          userDisplayMessage = error.error;
        } else {
          userDisplayMessage = `Error ${error.status}: Ocurrió un problema en el servidor.`;
        }
      }
    } else {
      // Server-side (SSR) or non-browser environment
      errorMessage += `Código ${error.status}, Cuerpo: ${JSON.stringify(error.error)}`;
      userDisplayMessage = `Error ${error.status}: Ocurrió un problema en el servidor.`;
    }

    console.error(errorMessage);
    this.error.set(userDisplayMessage);
    this.notificaciones.next({ tipo: 'error', mensaje: userDisplayMessage });

    // Throw the error so subscribers can handle it
    return throwError(() => new Error(userDisplayMessage));
  }

}
