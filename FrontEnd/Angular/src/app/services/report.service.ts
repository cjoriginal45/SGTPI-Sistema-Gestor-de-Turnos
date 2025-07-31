// src/app/services/report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReportMetaDataDto } from '../interfaces/ReportMetaDataDto';
import { ReportRequestDateDto } from '../interfaces/ReportRequestDateDto';
import { ReportResponseDto } from '../interfaces/ReportResponseDto';
import { environment } from '../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private apiUrl = environment.apiBaseUrl+"/reports"; // Asegúrate de que la URL sea correcta

  constructor(private http: HttpClient) {}

  /**
   * Envía una solicitud al backend para generar un reporte.
   * @param request Los parámetros del reporte a generar, incluyendo un rango de fechas.
   * @returns Un Observable con la respuesta del backend.
   */
  generateReport(request: ReportRequestDateDto): Observable<ReportResponseDto> {
    return this.http
      .post<ReportResponseDto>(`${this.apiUrl}/generate`, request)
      .pipe(
        catchError(this.handleError) // Manejo de errores
      );
  }

  /**
   * Obtiene la lista de todos los reportes generados.
   * @returns Un Observable con la lista de metadatos de los reportes.
   */
  getAllReportMetadata(): Observable<ReportMetaDataDto[]> {
    return this.http
      .get<ReportMetaDataDto[]>(this.apiUrl)
      .pipe(
        catchError(this.handleError) // Manejo de errores
      );
  }

  /**
   * Inicia la descarga de un reporte directamente en el navegador.
   * @param reportId El ID del reporte a descargar.
   */
  downloadReport(reportId: number): Observable<Blob> {
    const url = `${this.apiUrl}/download/${reportId}`;
    // La clave es responseType: 'blob' para manejar la respuesta como un archivo
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Manejador de errores para las peticiones HTTP.
   * @param error El objeto HttpErrorResponse.
   * @returns Un Observable con el error.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.error instanceof ErrorEvent) {
      // Un error del lado del cliente o de la red.
      console.error('Ocurrió un error:', error.error.message);
    } else {
      // El backend retornó un código de error.
      const errorMessage = error.error?.error || `Backend returned code ${error.status}, body was: ${error.error}`;
      console.error(errorMessage);
    }
    // Retorna un observable con un mensaje de error más claro para el componente.
    return throwError(() => new Error('Algo salió mal; por favor, inténtelo de nuevo más tarde.'));
  }
}
