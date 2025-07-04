export interface AppointmentResponseDto {
  id: number;
  patientName: string;
  patientLastName: string;
  patientPhoneNumber: string;
  patientEmail: string;
  fecha: string; // This will likely be 'YYYY/MM/DD' from backend
  hora:string;
  state: string;
  duration: number; // Duration in minutes
  notes?: string; // Optional field for additional notes
  }