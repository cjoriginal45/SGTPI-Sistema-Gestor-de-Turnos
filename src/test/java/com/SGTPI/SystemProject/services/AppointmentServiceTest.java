package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.exceptions.AppointmentConflictException;
import com.SGTPI.SystemProject.mappers.AppointmentMapper;
import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.repositories.AppointmentRepository;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.internal.verification.VerificationModeFactory.times;

@ExtendWith(MockitoExtension.class)
public class AppointmentServiceTest {

    @InjectMocks
    private AppointmentService appointmentService;

    // Repositorios y mappers que el servicio utiliza.
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private ProfessionalRepository professionalRepository;
    @Mock
    private AppointmentMapper appointmentMapper;

    private Patient patient;
    private Professional professional;
    private Appointment appointment;
    private AppointmentRequestDto requestDto;
    private AppointmentResponseDto responseDto;
    private PatientDto patientDto;

    @BeforeEach
    void setup() {
        // Datos de prueba comunes
        patient = Patient.builder()
                .id(1)
                .firstName("Jorge")
                .lastName("Diaz")
                .email("jdiaz@hotmail.com")
                .phoneNumber("122233344123")
                .build();

        professional = Professional.builder()
                .id(1)
                .email("joaquinribarola45@gmail.com")
                .password("1234")
                .build();

        // Entidad de turno
        appointment = Appointment.builder()
                .id(1)
                .duration(30)
                .patient(patient)
                .professional(professional)
                .status(AppointmentStatus.CONFIRMADO)
                .date(LocalDateTime.of(2025, 11, 2, 10, 0))
                .build();

        // DTO de solicitud
        patientDto = new PatientDto(
                patient.getId(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getEmail(),
                patient.getPhoneNumber()
        );

        requestDto = new AppointmentRequestDto(
                appointment.getDuration(),
                appointment.getDate().toLocalDate(),
                appointment.getDate().toLocalTime(),
                patientDto,
                appointment.getSessionNotes()
        );

        // DTO de respuesta esperado
        responseDto = new AppointmentResponseDto(
                appointment.getId(),
                appointment.getPatient().getId(),
                appointment.getPatient().getFirstName(),
                appointment.getPatient().getLastName(),
                appointment.getPatient().getPhoneNumber(),
                appointment.getPatient().getEmail(),
                appointment.getDate().toLocalDate().toString(),
                appointment.getDate().toLocalTime().toString(),
                appointment.getStatus().toString(),
                appointment.getDuration(),
                appointment.getSessionNotes()
        );
    }

    @Test
    @DisplayName("Crear un turno con éxito sin conflictos")
    void testCreateAppointment_withNoConflicts_success() {
        // Given (Dado que)
        // El mapper convierte el DTO a la entidad
        given(appointmentMapper.requestToAppointment(requestDto)).willReturn(appointment);
        // No hay turnos confirmados, bloqueados o cancelados para la fecha
        given(appointmentRepository.findByDateAndStatus(any(), any())).willReturn(Optional.empty());
        // El paciente y el profesional existen en la base de datos
        given(patientRepository.findById(patient.getId())).willReturn(Optional.of(patient));
        given(professionalRepository.findById(professional.getId())).willReturn(professional);
        // El repositorio guarda el turno y devuelve la entidad guardada
        given(appointmentRepository.save(any(Appointment.class))).willReturn(appointment);
        // El mapper convierte la entidad guardada al DTO de respuesta
        given(appointmentMapper.entityToResponse(appointment)).willReturn(responseDto);

        // When (Cuando)
        // Llamamos al método a probar
        AppointmentResponseDto result = appointmentService.createAppointment(requestDto);

        // Then (Entonces)
        // Verificamos que el resultado no sea nulo y que sus datos coincidan
        assertThat(result).isNotNull();
        assertThat(result.patientEmail()).isEqualTo(responseDto.patientEmail());

        // Verificamos las interacciones con los mocks
        verify(appointmentMapper, times(1)).requestToAppointment(requestDto);
        verify(appointmentRepository, times(1)).findByDateAndStatus(appointment.getDate(), AppointmentStatus.CONFIRMADO);
        verify(appointmentRepository, times(1)).findByDateAndStatus(appointment.getDate(), AppointmentStatus.BLOQUEADO);
        verify(appointmentRepository, times(1)).findByDateAndStatus(appointment.getDate(), AppointmentStatus.CANCELADO);
        verify(patientRepository, times(1)).findById(patient.getId());
        verify(professionalRepository, times(1)).findById(professional.getId());
        verify(appointmentRepository, times(1)).save(any(Appointment.class));
        verify(appointmentMapper, times(1)).entityToResponse(appointment);
    }

    @Test
    @DisplayName("Lanzar AppointmentConflictException si ya hay un turno confirmado")
    void testCreateAppointment_throwsConflictException_ifConfirmed() {
        // Given (Dado que)
        given(appointmentMapper.requestToAppointment(requestDto)).willReturn(appointment);
        // Simulamos que ya existe un turno confirmado
        given(appointmentRepository.findByDateAndStatus(any(), eq(AppointmentStatus.CONFIRMADO)))
                .willReturn(Optional.of(appointment));

        // When & Then (Cuando & Entonces)
        // Verificamos que se lance la excepción correcta
        assertThrows(AppointmentConflictException.class, () -> {
            appointmentService.createAppointment(requestDto);
        });

        // Verificamos que el método save nunca se haya llamado
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }


}
