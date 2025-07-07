package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.exceptions.AppointmentBlockedException;
import com.SGTPI.SystemProject.exceptions.AppointmentConflictException;
import com.SGTPI.SystemProject.mappers.AppointmentMapper;
import com.SGTPI.SystemProject.mappers.PatientMapper;
import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.repositories.AppointmentRepository;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private final AppointmentMapper appMapper;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appRepository;

    private final ObjectMapper objectMapper;

    private final PatientMapper patientMapper;

    public AppointmentService(AppointmentMapper appMapper, PatientRepository patientRepository,
                              AppointmentRepository appRepository, ObjectMapper objectMapper, PatientMapper patientMapper) {
        this.appMapper = appMapper;
        this.patientRepository = patientRepository;
        this.appRepository = appRepository;
        this.objectMapper = objectMapper;
        this.patientMapper = patientMapper;
        if (!objectMapper.getRegisteredModuleIds().contains(JavaTimeModule.class.getName())) {
            objectMapper.registerModule(new JavaTimeModule());
        }
    }

    //crear turno
    @Transactional
    public AppointmentResponseDto createAppointment(AppointmentRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("El DTO de cita no puede ser nulo");
        }

        // Convertir DTO a entidad (sin guardar aún)
        Appointment appointment = appMapper.requestToAppointment(dto);
        if (appointment == null) {
            throw new IllegalStateException("No se pudo mapear la cita. Verifique los datos del paciente/profesional");
        }

        // --- LÓGICA DE VALIDACIÓN PARA CREAR TURNO ---
        LocalDateTime requestedDateTime = appointment.getDate(); // Obtiene la fecha y hora del turno a crear

        // 1. Validar si ya existe un turno CONFIRMADO en esa fecha/hora
        Optional<Appointment> existingConfirmedAppointment = appRepository.findByDateAndStatus(
                requestedDateTime,
                AppointmentStatus.CONFIRMADO // <--- PASA EL ENUM DIRECTAMENTE
        );
        if (existingConfirmedAppointment.isPresent()) {
            throw new AppointmentConflictException("Ya existe un turno confirmado en la fecha y hora solicitadas.");
        }

        // 2. Validar si la franja horaria está BLOQUEADA
        Optional<Appointment> existingBlockedAppointment = appRepository.findByDateAndStatus(
                requestedDateTime,
                AppointmentStatus.BLOQUEADO
        );
        if (existingBlockedAppointment.isPresent()) {
            throw new AppointmentBlockedException("La franja horaria solicitada está bloqueada y no se puede asignar un turno.");
        }

        // 3. Manejo de turnos CANCELADOS:
        // Si la franja horaria estuviera CANCELADA, findByDateAndStatus para CONFIRMADO y BLOQUEADO
        // no encontraría nada, lo que permite que el nuevo turno se cree.
        // No necesitamos "sobrescribir" explícitamente un turno CANCELADO.
        // Si el backend debe eliminar el registro CANCELADO y crear uno nuevo,
        // esa lógica sería más compleja y no es necesaria si solo se busca DISPONIBILIDAD.
        // Por ahora, un slot CANCELADO se considera DISPONIBLE para una nueva asignación.

        // --- Manejo del Paciente: Solo se permite asignar a pacientes existentes ---
        if (appointment.getPatient() == null || appointment.getPatient().getId() == null) {
            throw new IllegalArgumentException("Debe seleccionar un paciente existente para asignar el turno.");
        }

        // Busca el paciente existente por ID y lo asocia al turno
        Patient existingPatient = patientRepository.findById(appointment.getPatient().getId())
                .orElseThrow(() -> new IllegalArgumentException("Paciente asociado no encontrado con ID: " + appointment.getPatient().getId()));
        appointment.setPatient(existingPatient); // Asigna la instancia manejada del paciente existente

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



    @Transactional
    public AppointmentResponseDto patchAppointment(int id, Map<String, Object> updates) {
        Appointment app = appRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Turno no encontrado con ID: " + id));

        final AtomicReference<LocalDate> tempLocalDateRef = new AtomicReference<>(app.getDate().toLocalDate());
        final AtomicReference<LocalTime> tempLocalTimeRef = new AtomicReference<>(app.getDate().toLocalTime());


        updates.forEach((key, value) -> {
            System.out.println("Processing key: " + key + ", value: " + value + ", type: " + (value != null ? value.getClass().getName() : "null"));

            switch (key) {
                case "duration":
                    if (value instanceof Number) {
                        app.setDuration(((Number) value).intValue());
                    } else {
                        System.err.println("Valor inesperado para 'duration': " + value);
                    }
                    break;
                case "fecha":
                    if (value instanceof String) {
                        try {
                            tempLocalDateRef.set(LocalDate.parse((String) value, DateTimeFormatter.ofPattern("yyyy/MM/dd")));
                        } catch (Exception e) {
                            System.err.println("Error parseando 'fecha': " + value + " - " + e.getMessage());
                        }
                    } else {
                        System.err.println("Valor inesperado para 'fecha': " + value);
                    }
                    break;
                case "hora":
                    if (value instanceof String) {
                        try {
                            tempLocalTimeRef.set(LocalTime.parse((String) value, DateTimeFormatter.ofPattern("HH:mm:ss")));
                        } catch (Exception e) {
                            System.err.println("Error parseando 'hora': " + value + " - " + e.getMessage());
                        }
                    } else {
                        System.err.println("Valor inesperado para 'hora': " + value);
                    }
                    break;
                case "state":
                    if (value instanceof String) {
                        app.setStatus(AppointmentStatus.valueOf((String) value));
                    } else {
                        System.err.println("Valor inesperado para 'state': " + value);
                    }
                    break;
                case "sessionNotes":
                    if (value instanceof String) {
                        app.setSessionNotes((String) value);
                    } else {
                        System.err.println("Valor inesperado para 'sessionNotes': " + value);
                    }
                    break;
                case "patient":
                    if (value instanceof Map) {
                        try {
                            PatientDto patientDto = objectMapper.convertValue(value, PatientDto.class);

                            // --- LÓGICA CLAVE: SOLO CAMBIAR EL PACIENTE ASOCIADO (DEBE EXISTIR) ---
                            // Si el PatientDto tiene un ID, busca el paciente existente
                            if (patientDto.id() != null) { // Ahora patientDto.id() es Integer, puede ser null
                                Patient managedPatient = patientRepository.findById(patientDto.id())
                                        .orElseThrow(() -> new IllegalArgumentException("Paciente asociado no encontrado con ID: " + patientDto.id()));
                                app.setPatient(managedPatient); // Asigna la entidad Patient manejada
                                System.out.println("Cambiando el paciente asociado al turno a ID: " + managedPatient.getId());
                            } else {
                                // Si no hay ID en el PatientDto, es un error en este contexto (no se permite crear nuevos pacientes aquí)
                                throw new IllegalArgumentException("Para cambiar el paciente de un turno, debe proporcionar el ID de un paciente existente.");
                            }
                        } catch (IllegalArgumentException e) {
                            System.err.println("Error al procesar el paciente en PATCH: " + e.getMessage());
                            // Re-lanzar para que la transacción falle y el controlador lo maneje
                            throw e;
                        }
                    } else {
                        System.err.println("Valor inesperado para 'patient': " + value);
                        throw new IllegalArgumentException("Formato de datos de paciente inesperado.");
                    }
                    break;
                default:
                    System.out.println("Campo no reconocido o no manejado en PATCH: " + key);
                    break;
            }
        });

        LocalDateTime newDateTime = LocalDateTime.of(tempLocalDateRef.get(), tempLocalTimeRef.get());
        if (!app.getDate().equals(newDateTime)) {
            Optional<Appointment> conflictingAppointment = appRepository.findByDateAndIdIsNotAndStatus(
                    newDateTime,
                    app.getId(),
                    AppointmentStatus.CONFIRMADO
            );

            if (conflictingAppointment.isPresent()) {
                System.err.println("Conflicto de turno detectado: La fecha y hora " + newDateTime + " ya están ocupadas.");
                throw new AppointmentConflictException("La fecha y hora seleccionadas ya están ocupadas por otro turno confirmado.");
            }
            app.setDate(newDateTime);
            System.out.println("LocalDateTime del turno actualizado a: " + newDateTime);
        } else {
            System.out.println("LocalDateTime del turno no cambió.");
        }


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
                    // Validación de estado: Solo se puede cancelar un turno CONFIRMADO
                    if (appointment.getStatus() != AppointmentStatus.CONFIRMADO) {
                        return "No se puede cancelar un turno con estado: " + appointment.getStatus().name();
                    }

                    // Validación de fecha: No se puede cancelar un turno pasado
                    if (appointment.getDate().isBefore(LocalDateTime.now())) {
                        return "No se puede cancelar un turno pasado";
                    }

                    // --- LÓGICA DE CANCELACIÓN CONDICIONAL ---
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime appointmentTime = appointment.getDate();
                    LocalDateTime cancellationThreshold = appointmentTime.minusHours(48); // 48 horas antes del turno

                    if (now.isBefore(cancellationThreshold)) {
                        // Si se cancela con más de 48 horas de antelación: LIBERAR EL TURNO
                        appointment.setStatus(AppointmentStatus.DISPONIBLE);
                        // Limpiar datos del paciente para que el slot esté completamente disponible
                        appointment.setPatient(null);
                        appointment.setSessionNotes(null); // Limpiar observaciones también si se libera
                        System.out.println("Turno ID " + id + " cancelado con más de 48h de antelación. Estado: DISPONIBLE.");
                        appRepository.save(appointment);
                        return "Turno cancelado y liberado exitosamente.";
                    } else {
                        // Si se cancela con menos de 48 horas de antelación: QUEDA CANCELADO
                        appointment.setStatus(AppointmentStatus.CANCELADO);
                        // Los datos del paciente y observaciones se mantienen para el registro de "cancelado"
                        System.out.println("Turno ID " + id + " cancelado con menos de 48h de antelación. Estado: CANCELADO.");
                        appRepository.save(appointment);
                        return "Turno cancelado exitosamente (quedó en estado CANCELADO).";
                    }
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
