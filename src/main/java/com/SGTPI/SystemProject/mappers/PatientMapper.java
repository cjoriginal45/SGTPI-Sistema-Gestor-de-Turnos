package com.SGTPI.SystemProject.mappers;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.models.Patient;
import org.springframework.stereotype.Service;

@Service
public class PatientMapper {

    //mapper de dto a paciente
    public Patient dtoToPatient(PatientDto dto) {

        return new Patient(
                dto.firstName(),
                dto.lastName(),
                dto.email(),
                dto.phoneNumber()
        );

    }

    //mapper de paciente a dto
    public PatientDto patientToDto(Patient patient) {
        return new PatientDto(
                patient.getFirstName(),
                patient.getLastName(),
                patient.getEmail(),
                patient.getPhoneNumber()
        );
    }

}
