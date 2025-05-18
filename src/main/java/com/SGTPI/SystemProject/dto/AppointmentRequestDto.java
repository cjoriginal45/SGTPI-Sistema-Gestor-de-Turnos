
package com.SGTPI.SystemProject.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalTime;


public record AppointmentRequestDto(
        @JsonProperty("duration")
        int duration,
        @JsonProperty("fecha")
        @JsonFormat(pattern = "yyyy/MM/dd")
        @Future(message = "La fecha debe ser futura")        
        LocalDate  fecha,
        @JsonProperty("hora")
        @JsonFormat(pattern = "HH:mm:ss")
        LocalTime  hora,
        @JsonProperty("patient")
        @Valid
        @NotBlank(message = "El paciente es obligatorio")
        PatientDto patient
        ) {
    
}
