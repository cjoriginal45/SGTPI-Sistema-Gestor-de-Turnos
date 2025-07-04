package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.services.PatientService;
import com.SGTPI.SystemProject.services.PatientService.Observations;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "http://localhost:4200")
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
        return ResponseEntity.ok(patients);        // 200 con los datos
    }

    //modificar paciente
    @PatchMapping("/patch-patient/{id}")
    public ResponseEntity<?> patchPatient(@PathVariable Integer id,
            @RequestBody Map<String, Object> updates) {

        PatientDto updatedPatient = patientService.partialUpdate(id, updates);
        return ResponseEntity.ok(updatedPatient);
    }

    @PostMapping("/patient-observations")
    public ResponseEntity<?> setObservations(@RequestBody Observations observations){
        return ResponseEntity.ok(patientService.setObservations(observations));
    }
    
    @GetMapping("/patient-observations/{phoneNumber}")
    public ResponseEntity<?> getObservations(@PathVariable String phoneNumber){
        Optional<String> obser = patientService.getObservations(phoneNumber);
        if(!obser.isEmpty()){
        return ResponseEntity.ok().body(obser);
        }
        return ResponseEntity.notFound().build();
    }
    //set y get observations
    //set horario preferido
  
}
