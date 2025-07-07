package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.exceptions.AppointmentConflictException;
import com.SGTPI.SystemProject.services.AppointmentService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
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
        List<AppointmentResponseDto> dto = appService.getAppointmentsById(id);

        if (dto.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(appService.getAppointmentsById(id));
    }

    //modificar turno
    @PatchMapping("/patch-appointment/{id}")
    public ResponseEntity<?> patchMapping(@PathVariable int id,
            @RequestBody Map<String, Object> updates) {
        AppointmentResponseDto updated = appService.patchAppointment(id, updates);
        return ResponseEntity.ok().body(updated);
    }

    //bloquear turno
    //cancelar turno
    @PutMapping("/appointment/cancel/{id}")
    public ResponseEntity<?> cancelAppointment(@PathVariable int id) {
        try {
            String result = appService.cancelAppointment(id);

            if (result.equals("Turno cancelado exitosamente")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error al procesar la cancelación: " + e.getMessage());
        }
    }

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


    @ExceptionHandler(AppointmentConflictException.class)
    public ResponseEntity<String> handleAppointmentConflictException(AppointmentConflictException ex) {
        System.err.println("Manejando excepción de conflicto de turno: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
