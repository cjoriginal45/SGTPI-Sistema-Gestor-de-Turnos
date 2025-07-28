export interface AppointmentResponseDto {
  id: number; // ID del turno en el backend
  patientId?: number | null; // ID del paciente (puede ser de nivel superior)
  patientName?: string;
  patientLastName?: string;
  patientPhoneNumber?: string;
  patientEmail?: string;
  fecha: string; // Formato YYYY/MM/DD
  hora: string; // Formato HH:MM:SS
  state: string; // Estado del turno (e.g., "CONFIRMADO", "CANCELADO")
  duration: number; // Duración en minutos
  notes?: string; // Notas de la sesión
  }