package com.SGTPI.SystemProject.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

//Exception conflicto de turnos (ocupado)
    @ResponseStatus(HttpStatus.CONFLICT) // Esto hara que Spring devuelva un 409 Conflict
    public class AppointmentConflictException extends RuntimeException {
        public AppointmentConflictException(String message) {
            super(message);
        }
    }

