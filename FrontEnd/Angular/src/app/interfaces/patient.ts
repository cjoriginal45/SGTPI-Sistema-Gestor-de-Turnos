export interface Patient{
    id?: number; // Puede ser opcional si el backend lo genera
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber: string;
}