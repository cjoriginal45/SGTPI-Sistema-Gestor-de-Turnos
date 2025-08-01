package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.exceptions.AppointmentBlockedException;
import com.SGTPI.SystemProject.exceptions.AppointmentCancellationException;
import com.SGTPI.SystemProject.exceptions.AppointmentConflictException;
import com.SGTPI.SystemProject.mappers.AppointmentMapper;
import com.SGTPI.SystemProject.mappers.PatientMapper;
import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.repositories.AppointmentRepository;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private final AppointmentMapper appMapper;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appRepository;

    private final ObjectMapper objectMapper;

    private final PatientMapper patientMapper;

    private final ProfessionalRepository professionalRepository;


    public AppointmentService(AppointmentMapper appMapper, PatientRepository patientRepository, AppointmentRepository appRepository,
                              ObjectMapper objectMapper, PatientMapper patientMapper, ProfessionalRepository professionalRepository) {
        this.appMapper = appMapper;
        this.patientRepository = patientRepository;
        this.appRepository = appRepository;
        this.objectMapper = objectMapper;
        this.patientMapper = patientMapper;
        this.professionalRepository = professionalRepository;
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
                AppointmentStatus.CONFIRMADO
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

        // 3. validar si no hay un turno cancelado
        Optional<Appointment> existingCanceledAppointment = appRepository.findByDateAndStatus(
                requestedDateTime,
                AppointmentStatus.CANCELADO
        );
        if (existingCanceledAppointment.isPresent()) {
            throw new AppointmentBlockedException("Hay un turno cancelado en este horario y no se puede asignar un turno.");
        }

        // --- Manejo del Paciente: Solo se permite asignar a pacientes existentes ---
        if (appointment.getPatient() == null || appointment.getPatient().getId() == null) {
            throw new IllegalArgumentException("Debe seleccionar un paciente existente para asignar el turno.");
        }

        Patient existingPatient = patientRepository.findById(appointment.getPatient().getId())
                .orElseThrow(() -> new IllegalArgumentException("Paciente asociado no encontrado con ID: " + appointment.getPatient().getId()));
        appointment.setPatient(existingPatient); // Asigna la instancia manejada del paciente existente

        // --- CORRECCIÓN CLAVE AQUÍ: setear al profesional ---
        // Obtener el profesional con ID 1 de la base de datos
        // findById devuelve Optional, necesitas usar .orElseThrow() o .get() (con precaución)
        Professional defaultProfessional = professionalRepository.findById(1);
        appointment.setProfessional(defaultProfessional); // Asigna el profesional existente y manejado

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
                            tempLocalDateRef.set(LocalDate.parse((String) value, DateTimeFormatter.ofPattern("yyyy-MM-dd")));
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
            // Define los estados que deben considerarse como conflicto
            List<AppointmentStatus> conflictingStatuses = Arrays.asList(
                    AppointmentStatus.CONFIRMADO,
                    AppointmentStatus.BLOQUEADO,
                    AppointmentStatus.CANCELADO // Incluido CANCELADO en la verificación
            );

            Optional<Appointment> conflictingAppointment = appRepository.findByDateAndIdIsNotAndStatusIn(
                    newDateTime,
                    app.getId(),
                    conflictingStatuses
            );

            if (conflictingAppointment.isPresent()) {
                System.err.println("Conflicto de turno detectado: La fecha y hora " + newDateTime + " ya están ocupadas por un turno " + conflictingAppointment.get().getStatus() + ".");
                throw new AppointmentConflictException("La fecha y hora seleccionadas ya están ocupadas por otro turno (confirmado, bloqueado o cancelado).");
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
    public String cancelAppointment(int id) { // El servicio devuelve un String de mensaje de éxito
        Appointment appointment = appRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró un turno con el ID especificado")); // Lanza si no lo encuentra

        // Validación de estado: Solo se puede cancelar un turno CONFIRMADO
        if (appointment.getStatus() != AppointmentStatus.CONFIRMADO) {
            throw new AppointmentCancellationException("No se puede cancelar un turno con estado: " + appointment.getStatus().name());
        }

        // Validación de fecha: No se puede cancelar un turno pasado
        if (appointment.getDate().isBefore(LocalDateTime.now())) {
            throw new AppointmentCancellationException("No se puede cancelar un turno pasado");
        }

        // --- LÓGICA DE CANCELACIÓN CONDICIONAL ---
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime appointmentTime = appointment.getDate();
        LocalDateTime cancellationThreshold = appointmentTime.minusHours(48); // 48 horas antes del turno

        String message;
        if (now.isBefore(cancellationThreshold)) {
            // Si se cancela con más de 48 horas de antelación: LIBERAR EL TURNO
            appointment.setStatus(AppointmentStatus.DISPONIBLE);
            appointment.setPatient(null); // Desvincula el paciente
            appointment.setSessionNotes(null); // Limpiar observaciones
            message = "Turno cancelado y liberado exitosamente.";
            System.out.println("Turno ID " + id + " cancelado con más de 48h de antelación. Estado: DISPONIBLE.");
        } else {
            // Si se cancela con menos de 48 horas de antelación: QUEDA CANCELADO
            appointment.setStatus(AppointmentStatus.CANCELADO);
            // Los datos del paciente y observaciones se mantienen
            message = "Turno cancelado exitosamente (quedó en estado CANCELADO).";
            System.out.println("Turno ID " + id + " cancelado con menos de 48h de antelación. Estado: CANCELADO.");
        }

        appRepository.save(appointment); // Guarda los cambios
        return message; // Devuelve el mensaje de éxito
    }



    @Transactional
    public String toggleBlock(LocalDateTime slotTime, boolean block) {
        Optional<Appointment> existingAppointmentOpt = appRepository.findByDate(slotTime);

        if (block) { // El usuario quiere BLOQUEAR el horario
            if (existingAppointmentOpt.isPresent()) {
                Appointment app = existingAppointmentOpt.get();
                // Si ya está confirmado, disponible o cancelado, actualizamos su estado a BLOQUEADO.
                if (app.getStatus() == AppointmentStatus.CONFIRMADO || app.getStatus() == AppointmentStatus.DISPONIBLE || app.getStatus() == AppointmentStatus.CANCELADO) {
                    app.setPatient(null); // Limpiar datos del paciente si estaba confirmado o disponible
                    app.setSessionNotes(null); // Limpiar observaciones
                }
                app.setStatus(AppointmentStatus.BLOQUEADO);
                appRepository.save(app);
                return "Horario bloqueado exitosamente.";
            } else {
                // No existe un turno en este horario, así que creamos uno nuevo como BLOQUEADO
                Appointment newBlockedAppointment = new Appointment();
                newBlockedAppointment.setDate(slotTime);
                newBlockedAppointment.setStatus(AppointmentStatus.BLOQUEADO);
                newBlockedAppointment.setDuration(50); // Duración por defecto, ajustar según sea necesario
                // --- Asignar profesional por defecto al bloquear un slot nuevo ---
                Professional defaultProfessional = professionalRepository.findById(1);
                newBlockedAppointment.setProfessional(defaultProfessional);

                appRepository.save(newBlockedAppointment);
                return "Horario bloqueado exitosamente (nuevo slot creado).";
            }
        } else { // El usuario quiere DESBLOQUEAR el horario
            if (existingAppointmentOpt.isPresent()) {
                Appointment app = existingAppointmentOpt.get();
                // Solo desbloquear si está BLOQUEADO o CANCELADO actualmente
                if (app.getStatus() == AppointmentStatus.BLOQUEADO || app.getStatus() == AppointmentStatus.CANCELADO) {
                    app.setStatus(AppointmentStatus.DISPONIBLE);
                    app.setPatient(null); // Limpiar datos del paciente al hacerlo disponible
                    app.setSessionNotes(null); // Limpiar observaciones
                    appRepository.save(app);
                    return "Horario desbloqueado exitosamente.";
                } else if (app.getStatus() == AppointmentStatus.CONFIRMADO) {
                    // Si está confirmado, no se puede desbloquear directamente a DISPONIBLE. Debe cancelarse primero.
                    throw new IllegalArgumentException("No se puede desbloquear un turno confirmado. Primero debe cancelarlo.");
                } else if (app.getStatus() == AppointmentStatus.DISPONIBLE) {
                    // Si ya está DISPONIBLE en la DB, no se necesita ninguna acción, pero devolver mensaje de éxito.
                    return "El horario ya está disponible en la base de datos.";
                } else {
                    // Para otros estados (REALIZADO, EN_CURSO, etc.), o estados desconocidos.
                    throw new IllegalArgumentException("No se puede desbloquear un turno en estado: " + app.getStatus().name());
                }
            } else {
                // ESTE ES EL NUEVO CASO: El frontend quiere desbloquear un slot que no existe en la BD.
                // Crear un nuevo turno DISPONIBLE para anular el bloqueo por defecto del frontend.
                Appointment newAvailableAppointment = new Appointment();
                newAvailableAppointment.setDate(slotTime);
                newAvailableAppointment.setStatus(AppointmentStatus.DISPONIBLE);
                newAvailableAppointment.setDuration(50); // Duración por defecto
                newAvailableAppointment.setPatient(null); // Sin paciente
                newAvailableAppointment.setSessionNotes(null); // Sin observaciones

                // --- CORRECCIÓN CLAVE AQUÍ: Asignar profesional por defecto al desbloquear un slot nuevo ---
                Professional defaultProfessional = professionalRepository.findById(1);
                newAvailableAppointment.setProfessional(defaultProfessional);

                appRepository.save(newAvailableAppointment);
                return "Horario desbloqueado exitosamente (slot creado como disponible para anular bloqueo de frontend).";
            }
        }
    }

    @Transactional
    public String setSessionNotes(String notes,Integer id) {
        if(notes == null){
            throw new IllegalArgumentException("No se puede ingresar un valor nulo");
        }

        if(id == null){
            throw new IllegalStateException("id nulo");
        }

        Optional<Appointment> app = appRepository.findById(id);

        if(app.isPresent()){
            app.get().setSessionNotes(notes);
            appRepository.save(app.get());
            return app.get().getSessionNotes();
        }

        return "";
    }


    public String getSessionNotes(Integer id) {

        if(id == null){
            throw new IllegalArgumentException("id nulo");
        }

        Optional<Appointment> app = appRepository.findById(id);

        if(app.isPresent()){
            return app.get().getSessionNotes().toString();
        }

        return "";
    }

    /*
    @Scheduled(cron = "0 0 0 * * ?") // Se ejecuta a medianoche todos los días
    @Transactional // Asegura que la operación de actualización sea atómica
    public void markPastAppointmentsAsCompleted() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Encontrar todos los turnos CONFIRMADOS cuya fecha y hora ya pasaron
        List<Appointment> pastConfirmedAppointments = appRepository.findByStatusAndDateBefore(
                AppointmentStatus.CONFIRMADO,
                now
        );

        if (pastConfirmedAppointments.isEmpty()) {
            return;
        }

        // 2. Iterar y actualizar el estado a REALIZADO
        for (Appointment appointment : pastConfirmedAppointments) {
            appointment.setStatus(AppointmentStatus.REALIZADO);
            // Opcional: Puedes añadir una fecha de finalización o similar si tu entidad lo soporta
            // appointment.setCompletionDate(now);
            appRepository.save(appointment); // Guarda cada turno actualizado
        }
    }
    */

}
