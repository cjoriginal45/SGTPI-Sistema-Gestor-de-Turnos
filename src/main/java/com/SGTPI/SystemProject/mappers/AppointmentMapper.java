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
import java.time.format.DateTimeParseException;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AppointmentMapper {
    
    private final PatientMapper patientMapper;
    private final PatientRepository patientRepository;
    private final ProfessionalRepository professionalRepository;

    public AppointmentMapper(PatientMapper patientMapper, PatientRepository patientRepository, ProfessionalRepository professionalRepository) {
        this.patientMapper = patientMapper;
        this.patientRepository = patientRepository;
        this.professionalRepository = professionalRepository;
    }

    //dtoRequest a dto Response
    public AppointmentResponseDto requestToResponse(AppointmentRequestDto dto) {
        return new AppointmentResponseDto(
                dto.patient().firstName(),
                dto.patient().lastName(),
                dto.patient().phoneNumber(),
                dto.patient().email(),
                dto.fecha().getDayOfMonth()+"/"+dto.fecha().getMonthValue()
        );
    }

    //dtoRequest a Entity
    public Appointment requestToAppointment(AppointmentRequestDto dto) {
        
        Optional<Patient> patient = patientRepository.findByPhoneNumber(dto.patient().phoneNumber());
        Professional professional = professionalRepository.findById(1);
        
        if(patient.isEmpty()){
            return null;
        }
        return new Appointment(
                dto.duration(),
                convertirFechaHora(dto.fecha(), dto.hora()),
                AppointmentStatus.CONFIRMADO,
                patient.get(),
                professional
        );
    }

    //Entity a dtoResponse
    public AppointmentResponseDto entityToResponse(Appointment appointment) {
        return new AppointmentResponseDto(
                appointment.getPatient().getFirstName(),
                appointment.getPatient().getLastName(),
                appointment.getPatient().getPhoneNumber(),
                appointment.getPatient().getEmail(),
                appointment.getDate().toLocalDate().toString()
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
