// src/app/services/patient.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Patient } from '../interfaces/patient'
import { PatientObservation } from '../interfaces/PatientObservation';
import { AppointmentRequestDto } from '../interfaces/AppointmentRequestDto';
import { AppointmentResponseDto } from '../interfaces/AppointmentResponseDto';


@Injectable({
  providedIn: 'root'
})export class PatientService {
  private baseUrl = 'http://localhost:8080/SGTPI/api';

  constructor(private http: HttpClient) {}

  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.baseUrl}/patients`).pipe(
      catchError(this.handleError)
    );
  }

  createPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${this.baseUrl}/patient`, patient).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error completo:', error);
        
        // Mensaje más detallado según el tipo de error
        let errorMessage = 'Error desconocido';
        if (error.error instanceof ErrorEvent) {
          // Error del lado del cliente
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Error del backend
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

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error);
    
    if (error.status === 0) {
      // Error de red o cliente
      console.error('Error de conexión con el backend');
      return throwError(() => new Error('No se pudo conectar con el servidor. Verifique su conexión.'));
    } else {
      // El backend respondió con un código de error
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
      return throwError(() => new Error('Error en la respuesta del servidor'));
    }
  }

  savePatientObservation(observation: PatientObservation): Observable<string> {
    // IMPORTANT: Specify responseType: 'text' because the backend returns a String.
    return this.http.post(`${this.baseUrl}/patient-observations`, observation, { responseType: 'text' }).pipe(
      catchError(error => {
        console.error('Error in savePatientObservation:', error);
        // You might want to extract error.error if the backend sends structured error messages.
        // For now, re-throw to propagate the error to the component.
        throw error;
      })
    );
  }

  getPatientObservations(phoneNumber: string): Observable<PatientObservation[]> {
    // 1. Explicitly set responseType to 'text'.
    // 2. Do NOT put a generic type like <string> or <PatientObservation[]> directly after .get(),
    //    as responseType handles the raw type. The 'map' operator will then handle the transformation.
    return this.http.get(`${this.baseUrl}/patient-observations/${phoneNumber}`, { responseType: 'text' }).pipe(
      map(rawResponse => { // 'rawResponse' will now be correctly inferred as 'string' by TypeScript
        // Add a runtime type check for extra safety, though TypeScript should prevent this error now.
        if (typeof rawResponse !== 'string') {
          console.error('ERROR: Expected string response but received:', rawResponse);
          // If this happens, it means responseType: 'text' is not working as expected.
          return [];
        }

        let observationText: string = rawResponse; // Explicitly cast for clarity, though not strictly needed now

        
        if (observationText.startsWith('"') && observationText.endsWith('"') && observationText.length > 1) {
          observationText = observationText.slice(1, -1); // Remove first and last character
          console.log('DEBUG (Service Map): Stripped quotes. New observationText:', observationText);
      }

        if (observationText.trim() !== '' && observationText !== 'null') { // .trim() is now safe
          const obs: PatientObservation = {
            phoneNumber: phoneNumber,
            observations: observationText
          };
          console.log('DEBUG (Service Map): Transformed to:', [obs]);
          return [obs];
        }
        console.log('DEBUG (Service Map): No valid observation text received or it was null/empty. Returning empty array.');
        return [];
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('ERROR (Service catchError): Failed to get observations:', error);
        if (error.status === 404) {
          console.log(`No observations found for patient ${phoneNumber} (404 Not Found).`);
          return of([]);
        }
        return throwError(() => new Error(`Error loading observations for ${phoneNumber}: ${error.message}`));
      })
    );
  }


  createAppointment(appointmentData: AppointmentRequestDto): Observable<AppointmentResponseDto> {
    console.log('Service: Sending appointment data to backend:', appointmentData);
    return this.http.post<AppointmentResponseDto>(`${this.baseUrl}/appointment`, appointmentData).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('ERROR (Service catchError): Failed to create appointment:', error);
        let errorMessage = 'Error desconocido al crear el turno.';

        if (error.error instanceof ErrorEvent) {
          // Client-side error (e.g., network error)
          errorMessage = `Error de red: ${error.error.message}`;
        } else if (typeof error.error === 'string' && error.status === 400) {
          // Backend returned 400 with a plain string message (e.g., "Paciente no existe" or validation message)
          errorMessage = `Error al registrar turno: ${error.error}`;
        } else if (error.error && typeof error.error === 'object' && error.error.message) {
            // Backend returned 400/500 with a JSON object that has a 'message' field
            errorMessage = `Error al registrar turno: ${error.error.message}`;
        }
        else if (error.status === 400) {
          // General 400 Bad Request, could be a more complex object we're not handling specifically
          errorMessage = `Error al registrar turno: Datos de entrada inválidos.`;
        } else if (error.status === 500) {
          // Backend returned 500 Internal Server Error
          errorMessage = `Error del servidor al registrar turno. Por favor, inténtelo de nuevo.`;
        } else {
          // Any other HTTP error
          errorMessage = `Error ${error.status}: ${error.statusText || error.message}`;
        }
        // Re-throw the error as a new Error object for the component to catch
        return throwError(() => new Error(errorMessage));
      })
    );
  }

}