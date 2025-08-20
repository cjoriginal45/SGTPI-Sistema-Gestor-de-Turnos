package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.PatientDto;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.services.PatientService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.*;

import static org.assertj.core.api.Assertions.in;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.internal.verification.VerificationModeFactory.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PatientController.class)
public class PatientControllerTest {
    @Autowired
    private MockMvc mockMvc;
    @MockBean
    private PatientService patientService;
    @Autowired
    private ObjectMapper objectMapper;

    private PatientDto patientDto;

    private List<PatientDto> patientDtoList;

    @BeforeEach
    void setup(){
        patientDto = new PatientDto(1,
                "Ana",
                "Perez",
                "akff@email.com",
                "31232131231");
    }

    @Test
    @DisplayName("test post patient")
    void testPostPatient() throws Exception {
        // given
        given(patientService.createPatient(any(PatientDto.class))).willReturn(patientDto);

        // when
        ResultActions response = mockMvc.perform(post("/patient")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(patientDto)));

        // then
        response.andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName", is(patientDto.firstName())))
                .andExpect(jsonPath("$.lastName", is(patientDto.lastName())))
                .andExpect(jsonPath("$.email", is(patientDto.email())));
    }

    @Test
    @DisplayName("test get all patients")
    void testGetAllPatients() throws Exception {
        //given
        PatientDto patientDto2 = new PatientDto(1,
                "Any",
                "Diaz",
                "ccc@email.com",
                "12332131231");

        patientDtoList = Arrays.asList(patientDto, patientDto2);
        given(patientService.getPatients()).willReturn(patientDtoList);

        // When
        ResultActions response = mockMvc.perform(get("/patients")
                .contentType(MediaType.APPLICATION_JSON));

        // Then
        response.andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(patientDtoList.size()))
                .andExpect(jsonPath("$[0].firstName", is("Ana")))
                .andExpect(jsonPath("$[1].firstName", is("Any")));

    }


    @Test
    @DisplayName("test get patient by id")
    void testGetPatientPorId() throws Exception {
        //given

        given(patientService.findPatientById(patientDto.id()))
                .willReturn(patientDto);

        //when
        ResultActions response = mockMvc.perform(get("/patient/{id}",patientDto.id()));

        //then
        response.andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is(patientDto.firstName())))
                .andExpect(jsonPath("$.lastName", is(patientDto.lastName())))
                .andExpect(jsonPath("$.email", is(patientDto.email())));
    }


    @Test
    @DisplayName("test update patient")
    void testPatchPatient() throws Exception {
        //given
        PatientDto patientDtoUpdated = new PatientDto(1,
                "Ana",
                "Dominguez",
                "doming@email.com",
                "31232131231");

        Map<String, Object> updates = new HashMap<>();

        updates.put("lastname","Dominguez");
        updates.put("email","doming@email.com");

        given(patientService.partialUpdate(any(Integer.class), any(Map.class)))
                .willReturn(patientDtoUpdated);

        //when
        ResultActions result = mockMvc.perform(patch("/patch-patient/{id}",patientDto.id())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(patientDtoUpdated)));

        //then
        result.andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is(patientDtoUpdated.firstName())))
                .andExpect(jsonPath("$.lastName", is(patientDtoUpdated.lastName())))
                .andExpect(jsonPath("$.email", is(patientDtoUpdated.email())));
    }

    @Test
    @DisplayName("test post observations")
    void testSetObservations() throws Exception {
        // Given
        PatientService.Observations observations = new PatientService.Observations("13441223214143",
                "Paciente en buen estado.");

        given(patientService.setObservations(any(PatientService.Observations.class)))
                .willReturn(observations.getObservations());

        // When
        ResultActions response = mockMvc.perform(post("/patient-observations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(observations)));

        // Then
        response.andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", is(observations.getObservations())));
    }

    @Test
    @DisplayName("test get observations")
    void testGetObservations() throws Exception {
        // Given
        PatientService.Observations observations = new PatientService.Observations("13441223214143",
                "Paciente en buen estado.");
        String mockObservations = "Paciente recuperado y sin síntomas.";
        given(patientService.getObservations(eq(observations.getPhoneNumber())))
                .willReturn(Optional.of(mockObservations));

        // When
        ResultActions response = mockMvc.perform(get("/patient-observations/{phoneNumber}",
                observations.getPhoneNumber()));

        // Then
        response.andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", is(mockObservations)));
    }
}
