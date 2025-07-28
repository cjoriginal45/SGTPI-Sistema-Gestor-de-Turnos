// src/app/services/patient.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Patient } from '../interfaces/patient'
import { PatientObservation } from '../interfaces/PatientObservation';
import { AppointmentRequestDto } from '../interfaces/AppointmentRequestDto';
import { AppointmentResponseDto } from '../interfaces/AppointmentResponseDto';
import { environment } from '../environments/environment';
import { AppointmentPatientDto } from '../interfaces/AppointmentPatientDto';


@Injectable({
  providedIn: 'root'
})
export class PatientService { // <-- ¡Asegúrate de que 'export' esté aquí!
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los pacientes del backend, ordenados alfabéticamente.
   * @returns Una Promesa que resuelve con un array de pacientes.
   */
  async getPatients(): Promise<AppointmentPatientDto[]> {
    return new Promise((resolve, reject) => {
      this.http.get<AppointmentPatientDto[]>(`${this.baseUrl}/patients`)
        .pipe(
          catchError(this.handleError<AppointmentPatientDto[]>('getPatients', []))
        )
        .subscribe({
          next: (patients: AppointmentPatientDto[]) => {
            const sortedPatients = patients.sort((a, b) => {
              const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
              const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
              return nameA.localeCompare(nameB);
            });
            resolve(sortedPatients);
          },
          error: (err) => {
            console.error('Error al obtener pacientes:', err);
            reject(err);
          }
        });
    });
  }

  /**
   * Obtiene los detalles de un paciente por su ID.
   * @param id El ID del paciente.
   * @returns Una Promesa que resuelve con el objeto Patient.
   */
  async getPatientById(id: number): Promise<Patient> {
    return new Promise((resolve, reject) => {
      this.http.get<Patient>(`${this.baseUrl}/patient/${id}`) // Asume endpoint /api/patient/{id}
        .pipe(
          catchError(this.handleError<Patient>('getPatientById'))
        )
        .subscribe({
          next: (patient: Patient) => {
            console.log(`Paciente con ID ${id} cargado:`, patient);
            resolve(patient);
          },
          error: (err) => {
            console.error(`Error al obtener paciente con ID ${id}:`, err);
            reject(err);
          }
        });
    });
  }

  /**
   * Actualiza los datos de un paciente existente.
   * @param patient El objeto Patient con los datos actualizados (debe incluir el ID).
   * @returns Una Promesa que resuelve con el objeto Patient actualizado o un mensaje de éxito.
   */
  async updatePatient(patient: Patient): Promise<Patient> {
    if (patient.id === undefined || patient.id === null) {
      return Promise.reject(new Error('No se puede actualizar un paciente sin ID.'));
    }
    return new Promise((resolve, reject) => {
      this.http.patch<Patient>(`${this.baseUrl}/patch-patient/${patient.id}`, patient)
        .pipe(
          catchError(this.handleError<Patient>('updatePatient'))
        )
        .subscribe({
          next: (response: Patient) => {
            console.log('Paciente actualizado exitosamente:', response);
            resolve(response);
          },
          error: (err) => {
            console.error('Error al actualizar paciente:', err);
            reject(err);
          }
        });
    });
  }

  /**
   * Crea un nuevo paciente en el backend.
   * @param patient El objeto Patient a crear.
   * @returns Un Observable que emite el paciente creado.
   */
  createPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${this.baseUrl}/patient`, patient).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error completo:', error);
        let errorMessage = 'Error desconocido';
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Error: ${error.error.message}`;
        } else {
          if (error.status === 400) {
            errorMessage = 'Datos inválidos: ' + (error.error.message || JSON.stringify(error.error));
          } else if (error.status === 500) {
            errorMessage = 'Error interno del servidor';
          } else {
            errorMessage = `Error ${error.status}: ${error.error.message || error.message}`;
          }
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Manejador de errores HTTP genérico.
   * @param operation Nombre de la operación que falló.
   * @param result Valor opcional a devolver en caso de error.
   * @returns Un Observable que emite un error.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      let errorMessage = `Error en ${operation}: `;
      if (error.error instanceof ErrorEvent) {
        errorMessage += `Error del cliente o de red: ${error.error.message}`;
      } else {
        if (error.error && typeof error.error === 'object' && error.error.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string' && error.error.length > 0) {
          errorMessage = error.error;
        } else {
          errorMessage += `Código ${error.status}, Cuerpo: ${JSON.stringify(error.error)}`;
        }
      }
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    };
  }


  /**
   * Guarda una observación para un paciente.
   * @param observation El objeto PatientObservation a guardar.
   * @returns Un Observable que emite un mensaje de texto de éxito.
   */
  savePatientObservation(observation: PatientObservation): Observable<string> {
    return this.http.post(`${this.baseUrl}/patient-observations`, observation, { responseType: 'text' }).pipe(
      catchError(error => {
        console.error('Error in savePatientObservation:', error);
        return throwError(() => new Error(error.error || 'Error al guardar la observación.'));
      })
    );
  }

  /**
   * Obtiene las observaciones de un paciente por su número de teléfono.
   * @param phoneNumber El número de teléfono del paciente.
   * @returns Un Observable que emite un array de PatientObservation.
   */
  getPatientObservations(phoneNumber: string): Observable<string | null> {
    return this.http.get(`${this.baseUrl}/patient-observations/${phoneNumber}`, { responseType: 'text' }).pipe(
      map(rawResponse => {
        let observationText: string = rawResponse;
        if (observationText.startsWith('"') && observationText.endsWith('"') && observationText.length > 1) {
          observationText = observationText.slice(1, -1);
        }
        if (observationText.trim() === '' || observationText.toLowerCase() === 'null') {
          return null;
        }
        return observationText;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('ERROR (PatientService - getPatientObservations): Falló al obtener observaciones:', error);
        if (error.status === 404) {
          console.log(`No se encontraron observaciones para el paciente ${phoneNumber} (404 Not Found).`);
          return of(null);
        }
        return throwError(() => new Error(`Error al cargar observaciones para ${phoneNumber}: ${error.message || error.statusText}`));
      })
    );
  }

  /**
   * Crea un nuevo turno.
   * @param appointmentData Los datos del turno a crear.
   * @returns Un Observable que emite el turno creado.
   */
  createAppointment(appointmentData: AppointmentRequestDto): Observable<AppointmentResponseDto> {
    console.log('Service: Sending appointment data to backend:', appointmentData);
    return this.http.post<AppointmentResponseDto>(`${this.baseUrl}/appointment`, appointmentData).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('ERROR (Service catchError): Failed to create appointment:', error);
        let errorMessage = 'Error desconocido al crear el turno.';

        if (error.error instanceof ErrorEvent) {
          errorMessage = `Error de red: ${error.error.message}`;
        } else if (typeof error.error === 'string' && error.status === 400) {
          errorMessage = `Error al registrar turno: ${error.error}`;
        } else if (error.error && typeof error.error === 'object' && error.error.message) {
            errorMessage = `Error al registrar turno: ${error.error.message}`;
        }
        else if (error.status === 400) {
          errorMessage = `Error al registrar turno: Datos de entrada inválidos.`;
        } else if (error.status === 500) {
          errorMessage = `Error del servidor al registrar turno. Por favor, inténtelo de nuevo.`;
        } else {
          errorMessage = `Error ${error.status}: ${error.statusText || error.message}`;
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
