// src/app/services/patient.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Patient } from '../interfaces/patient'

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

/*
export class PatientService {
  // Asegúrate de que esta URL sea la correcta para obtener la LISTA de pacientes
  private baseUrl = 'http://localhost:8080/SGTPI/api'; // Base para todos los endpoints de la API

  constructor(private http: HttpClient) {}

  // Método para OBTENER TODOS los pacientes
  getPatients(): Observable<Patient[]> { // <-- Ahora retorna un array de Patient
    return this.http.get<Patient[]>(`${this.baseUrl}/patients`); // <-- Endpoint en plural para la colección
  }

  // Método para CREAR un paciente (POST)
  createPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${this.baseUrl}/patient`, patient); // <-- Endpoint en singular para el recurso
  }*/
 
}