import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';

interface CancellationResponse {
  status: 'success' | 'error';
  message: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-cancellation',
  templateUrl: './reminder.component.html',
  styleUrls: ['./reminder.component.css']
})
export class ReminderComponent implements OnInit {
  reminderId: string | null = null;
  status: 'initial' | 'loading' | 'success' | 'error' = 'initial';
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.reminderId = params.get('reminderId');
      if (this.reminderId) {
        console.log('Reminder ID obtenido de la URL:', this.reminderId);
        // Podrías llamar a confirmCancellation() aquí si quieres que se procese automáticamente
        // o esperar a que el usuario haga clic en un botón.
      } else {
        this.status = 'error';
        this.message = 'No se encontró un ID de recordatorio válido en la URL.';
        console.error('No se encontró reminderId en la URL.');
      }
    });
  }

  /**
   * Confirma la cancelación del turno haciendo una llamada a la API.
   */
  confirmCancellation(): void {
    if (this.reminderId) {
      this.status = 'loading'; // Cambia el estado para mostrar el spinner
      const apiUrl = `${environment.apiBaseUrl}/reminders/cancel/${this.reminderId}`;
      console.log('Llamando a la API para cancelar:', apiUrl);

      this.http.get<CancellationResponse>(apiUrl)
        .pipe(
          finalize(() => {
            console.log('Llamada a la API finalizada.');
          })
        )
        .subscribe({
          next: (response) => {
            this.status = response.status;
            this.message = response.message;
            console.log('Respuesta de la API (éxito):', response);
            this.handlePostCancellationAction(); // Llama a la nueva función para manejar el cierre/redirección
          },
          error: (err) => {
            this.status = 'error';
            this.message = err.error?.message || 'Ocurrió un error inesperado al cancelar.';
            console.error('Error en la llamada a la API:', err);
            this.handlePostCancellationAction(); // Llama a la nueva función incluso en caso de error
          }
        });
    } else {
      console.error('No se puede confirmar la cancelación: reminderId es nulo.');
    }
  }

  /**
   * Aborta la cancelación y navega de vuelta a la página principal.
   * Se llama al hacer clic en el botón "No, volver".
   */
  abortCancellation(): void {
    console.log('Cancelación abortada.');
    // Siempre redirige si no se puede cerrar la ventana
    this.router.navigate(['/']);
    // Intenta cerrar la ventana, pero no dependas de ello
    try {
      window.close();
    } catch (e) {
      console.warn('No se pudo cerrar la pestaña automáticamente al abortar:', e);
    }
  }

  /**
   * Maneja la acción posterior a la cancelación (cierre de ventana o redirección).
   */
  private handlePostCancellationAction(): void {
    // Intenta cerrar la ventana. Si falla, redirige.
    try {
      // Esta condición es una heurística; window.opener existe si la ventana fue abierta por otra.
      // Sin embargo, incluso con window.opener, los navegadores pueden bloquear window.close().
      if (window.opener && !window.opener.closed) { // Verifica si la ventana que la abrió sigue abierta
        window.close();
      } else {
        console.warn('No se pudo cerrar la pestaña automáticamente. Redirigiendo a la página principal.');
        this.router.navigate(['/']); // Redirige si no se puede cerrar
      }
    } catch (e) {
      console.warn('Error al intentar cerrar la pestaña, redirigiendo:', e);
      this.router.navigate(['/']); // Redirige en caso de cualquier error al intentar cerrar
    }
  }
}
