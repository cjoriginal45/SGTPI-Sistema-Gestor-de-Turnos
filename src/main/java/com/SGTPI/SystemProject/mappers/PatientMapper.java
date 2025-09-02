package com.SGTPI.SystemProject.mappers;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.models.Patient;
import org.springframework.stereotype.Service;

//clase Mapper de paciente
@Service
public class PatientMapper {

    //mapper de PatientDto a Patient entity
    public Patient dtoToPatient(PatientDto dto) {

        return new Patient(
                dto.firstName(),
                dto.lastName(),
                dto.email(),
                dto.phoneNumber()
        );

    }

    //mapper de Patient a PatientDto
    public PatientDto patientToDto(Patient patient) {
        return new PatientDto(
                patient.getId(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getEmail(),
                patient.getPhoneNumber()
        );
    }

}
