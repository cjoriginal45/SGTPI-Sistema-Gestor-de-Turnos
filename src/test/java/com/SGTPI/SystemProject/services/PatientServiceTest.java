package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.mappers.PatientMapper;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import io.micrometer.observation.Observation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.internal.verification.VerificationModeFactory.times;

@ExtendWith(MockitoExtension.class)
public class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @InjectMocks
    private PatientService patientService;
    @Mock
    private PatientMapper patientMapper;

    private Patient patient;

    @BeforeEach
    void setup(){
        patient = Patient.builder()
                .id(1)
                .email("pepe@mail.com")
                .firstName("pepe")
                .lastName("perez")
                .phoneNumber("1234556651")
                .build();
    }

    @Test
    @DisplayName("test Guardar paciente")
    void testSavePatient(){
        //given
        PatientDto dto = new PatientDto(null, patient.getFirstName(),
                patient.getLastName(), patient.getEmail(), patient.getPhoneNumber());

        given(patientMapper.dtoToPatient(dto)).willReturn(patient);
        given(patientRepository.save(patient)).willReturn(patient);
        given(patientMapper.patientToDto(patient)).willReturn(
                new PatientDto(patient.getId(), patient.getFirstName(), patient.getLastName(), patient.getEmail(), patient.getPhoneNumber())
        );

        //when
        PatientDto patientSaved = patientService.createPatient(dto);

        //then
        assertThat(patientSaved).isNotNull();
        assertThat(patientSaved.firstName()).isEqualTo(patient.getFirstName());
        assertThat(patientSaved.email()).isEqualTo(patient.getEmail());
        verify(patientRepository).save(patient);
    }

    @Test
    @DisplayName("encontrar paciente por id")
    void testFindPatientById(){
        //given

        Integer id = patient.getId();

        given(patientRepository.findById(id)).willReturn(Optional.of(patient));
        given(patientMapper.patientToDto(patient)).willReturn(
                new PatientDto(patient.getId(), patient.getFirstName(), patient.getLastName(), patient.getEmail(), patient.getPhoneNumber())
        );
        //when
        PatientDto patientFind = patientService.findPatientById(id);

        //then
        assertThat(patientFind).isNotNull();
        assertThat(patientFind.email()).isEqualTo(patient.getEmail());
        verify(patientRepository).findById(id);
        verify(patientMapper).patientToDto(patient);
    }

    @Test
    @DisplayName("test getPatients")
    void testGetPatients(){
        //given
        Patient patient2 = Patient.builder()
                .id(2)
                .email("pep@mail.com")
                .firstName("pep")
                .lastName("guardiola")
                .phoneNumber("1233116651")
                .build();

        given(patientMapper.patientToDto(patient)).willReturn(
                new PatientDto(patient.getId(), patient.getFirstName(), patient.getLastName(), patient.getEmail(), patient.getPhoneNumber())
        );
        given(patientMapper.patientToDto(patient2)).willReturn(
                new PatientDto(patient2.getId(), patient2.getFirstName(), patient2.getLastName(), patient2.getEmail(), patient2.getPhoneNumber())
        );
        given(patientRepository.findAll()).willReturn(List.of(patient,patient2));

        //when
        List<PatientDto> patients = patientService.getPatients();

        //then
        assertThat(patients).isNotEmpty();
        assertThat(patients.size()).isEqualTo(2);
        verify(patientRepository).findAll();
    }


    @Test
    @DisplayName("test Observations")
    void testObservations(){
        //given
        PatientService.Observations observation = new PatientService.Observations(
                patient.getPhoneNumber(),"test"
        );

        given(patientRepository.updateObservations(patient.getPhoneNumber(),observation.getObservations())).willReturn(1);
        given(patientRepository.getObservations(patient.getPhoneNumber())).willReturn(observation.getObservations().describeConstable());

        //when
        String setObservation = patientService.setObservations(observation);

        Optional<String> getObservation = patientService.getObservations(patient.getPhoneNumber());

        //then
        assertThat(getObservation).isPresent();
        assertThat(setObservation).isNotNull();
        assertThat(getObservation.get()).isEqualTo("test");
        verify(patientRepository).getObservations(patient.getPhoneNumber());
    }

    @Test
    @DisplayName("test partialUpdate")
    void testPartialUpdate(){
        //given
        Integer id = patient.getId();

        Map<String, Object> updates = new HashMap<>();
        updates.put("firstName", "Juan Carlos");
        updates.put("email", "jucaperez@mail.com");

        Patient updatedPatient = Patient.builder()
                .id(id)
                .email("jucaperez@mail.com")
                .firstName("Juan Carlos")
                .lastName("perez")
                .phoneNumber("1234556651")
                .build();

        PatientDto expectedDto = new PatientDto(id, "Juan Carlos", "perez", "jucaperez@mail.com", "1234556651");


        //when
        when(patientRepository.findById(anyInt())).thenReturn(Optional.of(patient));
        when(patientRepository.save(any(Patient.class))).thenReturn(updatedPatient);
        when(patientMapper.patientToDto(any(Patient.class))).thenReturn(expectedDto);

        PatientDto result = patientService.partialUpdate(id, updates);

        //then
        assertThat(result).isEqualTo(expectedDto);
        verify(patientRepository, times(1)).findById(id);
        verify(patientRepository, times(1)).save(any(Patient.class));
        verify(patientMapper, times(1)).patientToDto(any(Patient.class));
    }
}
