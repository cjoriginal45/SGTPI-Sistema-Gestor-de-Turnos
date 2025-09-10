// src/app/services/professional.service.ts

import { inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http"; // Import HttpErrorResponse
import { AppointmentResponseDto } from "../interfaces/AppointmentResponseDto"; // Ensure this path is correct
import { catchError } from "rxjs/operators"; // Correct import for catchError
import { lastValueFrom, throwError } from "rxjs"; // Import lastValueFrom and throwError

@Injectable({
  providedIn: 'root',
})
export class ProfessionalService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  private API_BASE_URL = environment.apiBaseUrl;

  // NEW: Signals for loading and error state, as used in getTurnosFromBackend
  public loading = signal(false);
  public error = signal<string | null>(null);

  /**
   * Fetches all appointments from the backend.
   * @returns A Promise resolving to an array of AppointmentResponseDto.
   */
  async getTurnosFromBackend(): Promise<AppointmentResponseDto[]> {
    this.loading.set(true);
    this.error.set(null); // Clear previous errors

    try {
      const backendResponses: AppointmentResponseDto[] = await lastValueFrom(
        this.http.get<AppointmentResponseDto[]>(`${this.API_BASE_URL}/appointments`)
          .pipe(
            catchError(error => this.handleError<AppointmentResponseDto[]>(error, 'getTurnosFromBackend'))
          )
      );
      console.log('[ProfessionalService] All appointments fetched successfully:', backendResponses);
      this.loading.set(false);
      return backendResponses;
    } catch (err: any) {
      console.error('[ProfessionalService] Error in getTurnosFromBackend promise:', err);
      this.loading.set(false);
      // Set a user-friendly error message
      this.error.set(err.message || 'Error al cargar los turnos del historial.');
      throw err; // Re-throw the error for the component to handle
    }
  }

  /**
   * Handles HTTP errors and returns an observable with a user-friendly error message.
   * @param error The HttpErrorResponse object.
   * @param operation The name of the operation that failed.
   * @returns An Observable that emits an error.
   */
  private handleError<T>(error: HttpErrorResponse, operation = 'operation') {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `Error: ${error.error.message}`;
      console.error(`[ProfessionalService] Client-side error in ${operation}:`, error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      errorMessage = `Server returned code ${error.status}, body was: ${JSON.stringify(error.error)}`;
      console.error(`[ProfessionalService] Backend returned error in ${operation}:`, error.status, error.error);
    }
    // Set the error signal for UI display
    this.error.set(`Error al ${operation}: ${errorMessage}`);
    // Return an observable with a user-facing error message.
    return throwError(() => new Error(`Something bad happened; please try again later. ${errorMessage}`));
  }
}
