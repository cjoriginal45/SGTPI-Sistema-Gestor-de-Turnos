package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.SGTPIApplication;
import com.SGTPI.SystemProject.models.Patient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
@ActiveProfiles("test")
@SpringBootTest(classes = SGTPIApplication.class)
@Transactional
public class PatientRepositoryTest {

    @Autowired
    private PatientRepository patientRepository;



    @Test
    @DisplayName("Guardar y verificar que la tabla Patient se crea correctamente")
    void testSavePatient() {
        // Creamos un objeto Patient
        Patient patient = Patient.builder()
                .firstName("Ana")
                .lastName("Perez")
                .email("aperez@mail.com")
                .phoneNumber("987654321")
                .build();

        // Intentamos guardarlo en la base de datos
        Patient savedPatient = patientRepository.save(patient);

        // Verificamos que el objeto guardado no sea nulo y que tenga un ID
        assertThat(savedPatient).isNotNull();
        assertThat(savedPatient.getId()).isNotNull();
        System.out.println("Test exitoso: El paciente fue guardado con el ID " + savedPatient.getId());
    }

    @Test
    @DisplayName("Test lista de pacientes")
    void testListarPacientes(){
        //given
        Patient patient = Patient.builder()
                .firstName("Ana")
                .lastName("Perez")
                .email("aperez@mail.com")
                .phoneNumber("987654321")
                .build();

        patientRepository.save(patient);

        Patient patient2 = Patient.builder()
                .firstName("Juan")
                .lastName("Diaz")
                .email("diaz@mail.com")
                .phoneNumber("987123321")
                .build();
        patientRepository.save(patient2);

        //when
        List<Patient> patientList = patientRepository.findAll();

        //then
        assertThat(patientList).isNotEmpty();
        assertThat(patientList).size().isEqualTo(2);

    }

    @Test
    @DisplayName("test FindBy Phone number")
    void testFindByPhoneNumber(){
        //given
        Patient patient = Patient.builder()
                .firstName("Ana")
                .lastName("Perez")
                .email("aperez@mail.com")
                .phoneNumber("987654321")
                .build();

        patientRepository.save(patient);

        //when
        Optional<Patient> patient1 = patientRepository.findByPhoneNumber(patient.getPhoneNumber());

        //then
        assertThat(patient1).isNotNull();
        assertThat(patient1.get()).isEqualTo(patient);
    }

    @Test
    @DisplayName("test Observations")
    void testObservations(){
        Patient patient = Patient.builder()
                .firstName("Ana")
                .lastName("Perez")
                .email("aperez@mail.com")
                .phoneNumber("987654321")
                .build();

        patientRepository.save(patient);

        //when
        patientRepository.updateObservations(patient.getPhoneNumber(), "test");

        Optional<String> observation = patientRepository.getObservations(patient.getPhoneNumber());

        //then
        assertThat(observation.get()).isNotNull();
        assertThat(observation.get()).isEqualTo("test");
    }

}
