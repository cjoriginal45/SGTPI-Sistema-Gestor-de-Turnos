import { AppointmentPatientDto } from "./AppointmentPatientDto";


export interface Turno {
  id: string;
  apiId?: number | null;
  hora: string;
  fecha: string;
  estado: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO';
  paciente?: AppointmentPatientDto | null;
  telefono?: string | null;
  email?: string | null;
  duracion: number;
  observaciones?: string | null;
}