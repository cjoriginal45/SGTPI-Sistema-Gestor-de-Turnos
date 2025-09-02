package com.SGTPI.SystemProject.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

//DTO de paciente
public record PatientDto(
        @JsonProperty("id")
        Integer id,
        @JsonProperty("firstName")
        @NotBlank(message = "El nombre es obligatorio")
        String firstName,
        @JsonProperty("lastName")
        @NotBlank(message = "El apellido es obligatorio")
        String lastName,
        @Email(message = "Debe ser un email válido")
        String email,
        @JsonProperty("phoneNumber")
        @NotBlank(message = "El telefono es obligatorio")
        String phoneNumber) {

}
