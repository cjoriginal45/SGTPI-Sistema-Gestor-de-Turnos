import { AppointmentPatientDto } from './AppointmentPatientDto';

export interface AppointmentRequestDto {
  fecha: string; // Formato YYYY/MM/DD
  hora: string; // Formato HH:MM:SS
  duration: number;
  patient: AppointmentPatientDto; // El paciente debe ser un objeto AppointmentPatientDto
  state: string;
  sessionNotes?: string;
}
