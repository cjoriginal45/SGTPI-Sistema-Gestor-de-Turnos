package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.services.AppointmentService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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
    @GetMapping("/appointments/{id}")
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
}
