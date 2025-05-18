package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.services.AppointmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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

    //obtener turno
    //obtener lista de turnos total
    @GetMapping("/appointments")
    public ResponseEntity<?> getAppointments() {
        return ResponseEntity.ok(appService.getAppointments());
    }

    //lista de turnos por paciente
    //modificar turno
}
