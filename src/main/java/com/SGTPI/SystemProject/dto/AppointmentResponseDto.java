
package com.SGTPI.SystemProject.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;


public record AppointmentResponseDto(
        @JsonProperty("id")
        int id,
        @JsonProperty("patientId")
        Integer patientId,
        @JsonProperty("patientName")
        String patientName,
        @JsonProperty("patientLastName")
        String patientLastName,
        @JsonProperty("patientPhoneNumber")
        String patientPhoneNumber,
        @JsonProperty("patientEmail")
        @Email(message = "Debe ser un email válido")
        String patientEmail,
        @JsonProperty("fecha")
        String fecha,
        @JsonProperty("hora")
        String hora,
        @JsonProperty("state")
        String state,
        @JsonProperty("duration")
        Integer duration,
        @JsonProperty("notes")
        String notes
        ) {
}
