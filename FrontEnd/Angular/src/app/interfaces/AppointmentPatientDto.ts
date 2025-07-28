export interface AppointmentPatientDto {
  id: number | null; // ¡Importante: debe ser 'number | null' aquí!
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  state?: 'DISPONIBLE' | 'CONFIRMADO' | 'BLOQUEADO' | 'CANCELADO' | 'REALIZADO' | 'EN_CURSO'; // Si 'state' es parte del paciente
  }