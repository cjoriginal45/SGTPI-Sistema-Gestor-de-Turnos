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
import org.springframework.dao.DataIntegrityViolationException;
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
        if (dto == null) {
            throw new IllegalArgumentException("El DTO de cita no puede ser nulo");
        }

        // Convertir DTO a entidad
        Appointment appointment = appMapper.requestToAppointment(dto);
        if (appointment == null) {
            throw new IllegalStateException("No se pudo mapear la cita. Verifique los datos del paciente/profesional");
        }

        // Guardar la entidad
        Appointment savedAppointment = appRepository.save(appointment);

        // Convertir la entidad guardada a DTO de respuesta
        return appMapper.entityToResponse(savedAppointment);
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
    private LocalDate getDate(LocalDateTime datetime) {
        return datetime.toLocalDate();
    }

    private LocalTime getTime(LocalDateTime datetime) {
        return datetime.toLocalTime();
    }

    @Transactional
    public String cancelAppointment(int id) {
        return appRepository.findById(id)
                .map(appointment -> {
                    // Validación de estado
                    if (appointment.getStatus() != AppointmentStatus.CONFIRMADO) {
                        return "No se puede cancelar un turno con estado: " + appointment.getStatus();
                    }

                    // Validación de fecha (opcional)
                    if (appointment.getDate().isBefore(LocalDateTime.now())) {
                        return "No se puede cancelar un turno pasado";
                    }

                    // Cancelación
                    appointment.setStatus(AppointmentStatus.CANCELADO);
                    appRepository.save(appointment);
                    return "Turno cancelado exitosamente";
                })
                .orElse("No se encontró un turno con el ID especificado");
    }

    @Transactional
    public String toggleBlock(LocalDateTime slotTime, boolean block) {
        if (block && slotTime.isBefore(LocalDateTime.now())) {
            return "No se puede bloquear un horario pasado";
        }

        if (block) {
            if (appRepository.existsByDate(slotTime)) {
                return "El horario ya está ocupado";
            }

            Appointment blockApp = new Appointment();
            blockApp.setDate(slotTime);
            blockApp.setStatus(AppointmentStatus.BLOQUEADO);
            blockApp.setDuration(60);
            appRepository.save(blockApp);
            return "Horario bloqueado exitosamente";
        } else {
            // Desbloquear - versión optimizada
            int deleted = appRepository.deleteByDateAndStatus(
                    slotTime,
                    AppointmentStatus.BLOQUEADO
            );

            return deleted > 0 ? "Bloqueo eliminado" : "No existe un bloqueo en ese horario";
        }
    }

}
