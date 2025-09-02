package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.exceptions.AppointmentBlockedException;
import com.SGTPI.SystemProject.exceptions.AppointmentCancellationException;
import com.SGTPI.SystemProject.exceptions.AppointmentConflictException;
import com.SGTPI.SystemProject.services.AppointmentService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.SGTPI.SystemProject.services.PatientService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

//controller de appointments
@RestController
@CrossOrigin(origins = "http://localhost:4200")
public class AppointmentController {

    private final AppointmentService appService;

    public AppointmentController(AppointmentService appService) {
        this.appService = appService;
    }

    //crear turno
    @PostMapping("/appointment")
    public ResponseEntity<?> createAppointment(@RequestBody AppointmentRequestDto dto) {
        AppointmentResponseDto createAppointment = appService.createAppointment(dto);

        if (createAppointment != null) {
            try {
                return ResponseEntity.status(HttpStatus.CREATED).body(createAppointment);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(e.getMessage());
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Error al crear el turno");
            }
        }
        return ResponseEntity.badRequest().body("Paciente no existe");
    }

    //obtener turnos por fecha formato iso= yyyy-mm-dd
    @GetMapping("/appointments/{date}")
    public ResponseEntity<?> getAppointmentsByDate(@PathVariable
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(appService.getAppointmentsByDate(date));
    }

    //obtener lista de turnos total
    @GetMapping("/appointments")
    public ResponseEntity<?> getAppointments() {
        return ResponseEntity.ok(appService.getAppointments());
    }

    //lista de turnos por paciente
    @GetMapping("/appointments/patient/{id}")
    public ResponseEntity<?> getAppointments(@PathVariable int id) {
        try {
            List<AppointmentResponseDto> dto = appService.getAppointmentsById(id);

            if (dto.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

             return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null); // O un mensaje de error más específico
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    //modificar turno
    @PatchMapping("/patch-appointment/{id}")
    public ResponseEntity<?> patchMapping(@PathVariable int id,
            @RequestBody Map<String, Object> updates) {
        AppointmentResponseDto updated = appService.patchAppointment(id, updates);
        return ResponseEntity.ok().body(updated);
    }



    //cancelar turno
    @PutMapping("/appointment/cancel/{id}")
    public ResponseEntity<?> cancelAppointment(@PathVariable int id) {
        try {
            String message = appService.cancelAppointment(id); // El servicio devuelve el mensaje de éxito
            return ResponseEntity.ok(message); // <--- ¡Devuelve 200 OK con el mensaje!
        } catch (AppointmentCancellationException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage()); // 400 Bad Request
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage()); // 404 Not Found si el ID no existe
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error interno del servidor al cancelar el turno."); // 500 Internal Server Error
        }
    }

    //bloquear slot horario
    @PutMapping("/appointments/{slotTime}/{block}")
    public ResponseEntity<?> handleBlockRequest(
            @PathVariable
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime slotTime,
            @PathVariable boolean block) {

        String result = appService.toggleBlock(slotTime, block);

        if (result.startsWith("Error") || result.startsWith("No existe")) {
            return ResponseEntity.badRequest().body(result); // 400 para casos esperados
        }

        return ResponseEntity.ok(result);
    }

    //set oberservations
    @PatchMapping("/session-notes/{id}")
    public ResponseEntity<?> setObservations(@RequestBody String notes,@PathVariable int id){
        return ResponseEntity.ok(appService.setSessionNotes(notes,id));
    }

    //get observations
    @GetMapping("/get-notes/{id}")
    public ResponseEntity<?> getObservations(@PathVariable int id){
        String notes = appService.getSessionNotes(id);
        if(notes != null){
            return ResponseEntity.ok().body(notes);
        }
        return ResponseEntity.notFound().build();
    }


    // --- MANEJADORES DE EXCEPCIONES GENERALES ---
    @ExceptionHandler(AppointmentConflictException.class)
    public ResponseEntity<String> handleAppointmentConflictException(AppointmentConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    @ExceptionHandler(AppointmentBlockedException.class)
    public ResponseEntity<String> handleAppointmentBlockedException(AppointmentBlockedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}
