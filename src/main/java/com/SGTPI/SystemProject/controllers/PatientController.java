package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.services.PatientService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    //crear paciente
    @PostMapping("/patient")
    public ResponseEntity<?> postPatient(@RequestBody PatientDto patient) {
        try {
            PatientDto createdPatient = patientService.createPatient(patient);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdPatient);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al crear el paciente");
        }

    }

//traer un paciente de la BD por id
    @GetMapping("/patient/{id}")
    public ResponseEntity<?> getPatient(@PathVariable int id) {
        PatientDto dto = patientService.findPatientById(id);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    //traer lista de paciente de la BD
    @GetMapping("/patients")
    public ResponseEntity<?> getAllPatients() {
        List<PatientDto> patients = patientService.getPatients();
        return patients.isEmpty()
                ? ResponseEntity.noContent().build() // 204 si la lista está vacía
                : ResponseEntity.ok(patients);        // 200 con los datos
    }

}
