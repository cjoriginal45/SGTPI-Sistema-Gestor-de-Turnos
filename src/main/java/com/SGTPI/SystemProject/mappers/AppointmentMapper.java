package com.SGTPI.SystemProject.mappers;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AppointmentMapper {


    private final PatientRepository patientRepository;
    private final ProfessionalRepository professionalRepository;

    public AppointmentMapper(PatientRepository patientRepository, ProfessionalRepository professionalRepository) {
        this.patientRepository = patientRepository;
        this.professionalRepository = professionalRepository;
    }

    //dtoRequest a Entity
    public Appointment requestToAppointment(AppointmentRequestDto dto) {
        Optional<Patient> patient = patientRepository.findByPhoneNumber(dto.patient().phoneNumber());
        Professional professional = professionalRepository.findById(1);

        if (patient.isEmpty() || professional == null) {
            throw new IllegalArgumentException("Paciente o profesional no encontrado");
        }

        return new Appointment(
                dto.duration(),
                convertirFechaHora(dto.fecha(), dto.hora()),
                AppointmentStatus.CONFIRMADO, // Al crear, siempre es CONFIRMADO
                patient.get(),
                professional,
                dto.sessionNotes()
        );
    }

    //Entity a dtoResponse
    public AppointmentResponseDto entityToResponse(Appointment appointment) {
        // Obtenemos el objeto Patient, que puede ser null si el Appointment esta BLOQUEADO
        Patient patient = appointment.getPatient();

        // Inicializamos los campos del paciente con valores por defecto (null o vacíos)
        String patientFirstName = null;
        String patientLastName = null;
        String patientPhoneNumber = null;
        String patientEmail = null;
        Integer patientId = null;

        // Si el objeto Patient no es null, entonces extraemos sus datos
        if (patient != null) {
            patientId = patient.getId();
            patientFirstName = patient.getFirstName();
            patientLastName = patient.getLastName();
            patientPhoneNumber = patient.getPhoneNumber();
            patientEmail = patient.getEmail();
        }

        return new AppointmentResponseDto(
                appointment.getId(),
                patientId,
                patientFirstName,
                patientLastName,
                patientPhoneNumber,
                patientEmail,
                appointment.getDate().toLocalDate().toString(), // Fecha en formato YYYY-MM-DD
                appointment.getDate().toLocalTime().toString(), // Hora en formato HH:mm:ss
                appointment.getStatus().toString(), // Estado del turno
                appointment.getDuration(),
                appointment.getSessionNotes()
        );
    }

    //convertir fecha y hora en LocalDateTime
    public LocalDateTime convertirFechaHora(LocalDate fechaStr, LocalTime horaStr) {
        try {
            return LocalDateTime.of(fechaStr, horaStr);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Formato de fecha/hora inválido");
        }
    }

}
