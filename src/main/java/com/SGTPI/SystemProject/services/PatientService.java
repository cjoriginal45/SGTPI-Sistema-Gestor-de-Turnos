package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.mappers.PatientMapper;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

//logica de negocio de paciente
@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    public PatientService(PatientRepository patientRepository,
            PatientMapper patientMapper) {
        this.patientRepository = patientRepository;
        this.patientMapper = patientMapper;
    }

    //crear paciente
    public PatientDto createPatient(PatientDto patientDto) {
        // Validación básica
        if (patientDto == null) {
            throw new IllegalArgumentException("Los datos del paciente no pueden ser nulos");
        }

        // Validación de campos obligatorios
        if (patientDto.firstName() == null || patientDto.firstName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }

        if (patientDto.lastName() == null || patientDto.lastName().trim().isEmpty()) {
            throw new IllegalArgumentException("El apellido es obligatorio");
        }

        // Conversión y guardado
        Patient patient = patientMapper.dtoToPatient(patientDto);
        Patient savedPatient = patientRepository.save(patient);

        return patientMapper.patientToDto(savedPatient);
    }

    //obtener paciente por Id
    public PatientDto findPatientById(int id) {
        Optional<Patient> pat = patientRepository.findById(id);
        return !pat.isEmpty()
                ? patientMapper.patientToDto(pat.get())
                : null;
    }

    //lista de pacientes
    public List<PatientDto> getPatients() {
        return patientRepository.findAll()
                .stream()
                .map(patient -> patientMapper.patientToDto(patient))
                .toList();
    }

    //actualizar las observaciones de un paciente
    @Transactional
    public String setObservations(Observations observations) {
        if (observations.getObservations() == null || observations.getPhoneNumber() == null) {
            throw new IllegalArgumentException("Observations data is invalid");
        }

        int updatedRows = patientRepository.updateObservations(
                observations.getPhoneNumber(),
                observations.getObservations()
        );

        return updatedRows > 0
                ? "Observaciones actualizadas correctamente"
                : "No se encontró el paciente con ID: " + observations.getPhoneNumber();
    }

    public Optional<String> getObservations(String phoneNumber) {
        return patientRepository.getObservations(phoneNumber);
    }

    //modificar/actualizar paciente pasando id y datos
    @Transactional
    public PatientDto partialUpdate(Integer id, Map<String, Object> updates) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));

        updates.forEach((key, value) -> {
            switch (key) {
                case "firstName":
                    patient.setFirstName((String) value);
                    break;
                case "lastName":
                    patient.setLastName((String) value);
                    break;
                case "email":
                    patient.setEmail((String) value);
                    break;
                case "phoneNumber":
                    patient.setPhoneNumber(value.toString());
                    break;
            }
        });

        Patient updated = patientRepository.save(patient);
        return patientMapper.patientToDto(updated);
    }

    //clase estatica observations
    //se utilizo una clase estatica ya que las observations son parte del objeto paciente
    @Data // Lombok
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Observations {

        private String phoneNumber;
        private String observations;
    }
}
