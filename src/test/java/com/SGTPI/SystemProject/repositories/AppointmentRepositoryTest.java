package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.models.Professional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EntityScan(basePackages = "com.SGTPI.SystemProject.models")
@Transactional
public class AppointmentRepositoryTest {
    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ProfessionalRepository professionalRepository;
    private Appointment appointment;
    private Patient patient;
    private Professional professional;

    @BeforeEach
    void setup(){
         patient = Patient.builder()
                .firstName("Jorge")
                .lastName("Diaz")
                .email("jdiaz@hotmail.com")
                .phoneNumber("122233344123")
                .build();
        patientRepository.save(patient);

         professional = Professional.builder()
                .email("joaquinribarola45@gmail.com")
                .password("1234")
                .build();
        professionalRepository.save(professional);
    }

    @Test
    @DisplayName("Guardar y verificar Appointment")
    void testGuardarTurno() {

        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        assertThat(saved.getPatient()).isEqualTo(patient);
        assertThat(saved.getProfessional()).isEqualTo(professional);
        assertThat(saved.getStatus()).isEqualTo(AppointmentStatus.CONFIRMADO);
    }


    @Test
    @DisplayName("test listar turnos")
    void testListarTurnos(){
        //given
        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment);

        Appointment appointment2 = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 10, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment2);

        //when
        List<Appointment> appointments = appointmentRepository.findAll();

        //then
        assertThat(appointments.size()).isEqualTo(2);
        assertThat(appointments).isNotEmpty();
    }


    @Test
    @DisplayName("test findByDate")
    void testFindByDate(){
        //given
        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment);

        LocalDate date = LocalDate.from(LocalDateTime.of(2025, 9, 2, 10, 0));

        //when
        List<Appointment> appointmentList = appointmentRepository.findByDate(date);

        //then
        assertThat(appointmentList).isNotNull();
        assertThat(appointmentList.size()).isEqualTo(1);
        assertThat(appointmentList.get(0)).isEqualTo(appointment);
    }

    @Test
    @DisplayName("test existsByDate")
    void testExistsByDate(){
        //given
        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment);

        LocalDateTime date = LocalDateTime.of(2025, 9, 2, 10, 0);

        //when
        boolean response = appointmentRepository.existsByDate(date);

        //then
        assertThat(response).isEqualTo(true);
    }

    @Test
    @DisplayName("test findByDateAndStatus")
    void testFindByDateAndStatus(){
        //given
        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment);

        LocalDateTime date = LocalDateTime.of(2025, 9, 2, 10, 0);

        //when
        Optional<Appointment> appointmentResponse = appointmentRepository
                .findByDateAndStatus(date,AppointmentStatus.CONFIRMADO);

        //then
        assertThat(appointmentResponse).isNotNull();
        assertThat(appointmentResponse.get()).isEqualTo(appointment);
    }

    @Test
    @DisplayName("test deleteByDateAndStatus")
    void testDeleteByDateAndStatus(){
        //given
        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CONFIRMADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment);

        LocalDateTime date = LocalDateTime.of(2025, 9, 2, 10, 0);

        //when
        appointmentRepository.deleteByDateAndStatus(date,AppointmentStatus.CONFIRMADO);

        //then
        assertThat(appointmentRepository.findAll()).isEmpty();

    }


    @Test
    @DisplayName("test findByStatusCanceled")
    void testFindByStatusCanceled(){
        //given
        appointment = Appointment.builder()
                .duration(30)
                .date(LocalDateTime.of(2025, 9, 2, 10, 0))
                .status(AppointmentStatus.CANCELADO)
                .patient(patient)
                .professional(professional)
                .build();
        appointmentRepository.save(appointment);

        //when
        List<Appointment> appointments = appointmentRepository.findByStatusCanceled();

        //then
        assertThat(appointments).isNotEmpty();
        assertThat(appointments.size()).isEqualTo(1);
        assertThat(appointments.get(0)).isEqualTo(appointment);
    }

}
