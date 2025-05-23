package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.mappers.AppointmentMapper;
import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.repositories.AppointmentRepository;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private final AppointmentMapper appMapper;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appRepository;

    public AppointmentService(AppointmentMapper appMapper,
            AppointmentRepository appRepository,
            PatientRepository patientRepository) {
        this.appMapper = appMapper;
        this.appRepository = appRepository;
        this.patientRepository = patientRepository;
    }

    //crear turno
    @Transactional
    public AppointmentResponseDto createAppointment(AppointmentRequestDto dto) {
        if (dto != null) {

            appRepository.save(appMapper.requestToAppointment(dto));
        }

        return appMapper.requestToResponse(dto);
    }

    //lista de turnos
    public List<AppointmentResponseDto> getAppointments() {
        return appRepository.findAll()
                .stream()
                .map(appointment -> appMapper.entityToResponse(appointment))
                .collect(Collectors.toList());
    }

    //lista de turnos por fecha
    public List<AppointmentResponseDto> getAppointmentsByDate(LocalDate date) {
        return appRepository.findByDate(date)
                .stream()
                .map(appointment -> appMapper.entityToResponse(appointment))
                .collect(Collectors.toList());
    }

    public List<AppointmentResponseDto> getAppointmentsById(int id) {
        Optional<Patient> patient = patientRepository.findById(id);

        return (List<AppointmentResponseDto>) patient.get().getAppointment()
                .stream()
                .map(appointment -> appMapper.entityToResponse(appointment))
                .collect(Collectors.toList());
    }

    public AppointmentResponseDto patchAppointment(int id, Map<String, Object> updates) {
        Appointment app = appRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Turno no encontrado"));

        updates.forEach((key, value) -> {
            switch (key) {
                case "duration":
                    app.setDuration((Integer) value);
                    break;
                case "date":
                    app.setDate((LocalDateTime) value);
                    break;
                case "status":
                    app.setStatus(AppointmentStatus.valueOf(value.toString()));
                    break;
                case "patient":
                    app.setPatient(appMapper.requestToAppointment((AppointmentRequestDto) value).getPatient());
                    break;
            }
        });
        Appointment updated = appRepository.save(app);
        return appMapper.entityToResponse(updated);
    }
    
    //ya veremos como lo implementamos
    private LocalDate getDate(LocalDateTime datetime){
        return datetime.toLocalDate();
    }
    
    private LocalTime getTime(LocalDateTime datetime){
        return datetime.toLocalTime();
    }
}
