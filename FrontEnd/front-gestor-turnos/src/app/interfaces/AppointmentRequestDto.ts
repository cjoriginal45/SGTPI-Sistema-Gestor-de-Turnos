import { AppointmentPatientDto } from './AppointmentPatientDto';

export interface AppointmentRequestDto {
  duration: number; // The duration of the appointment (e.g., in minutes)
  fecha: string; // Formatted as 'YYYY/MM/DD'
  hora: string; // Formatted as 'HH:mm:ss'
  patient: AppointmentPatientDto; // Nested patient DTO
  state: string;
}
