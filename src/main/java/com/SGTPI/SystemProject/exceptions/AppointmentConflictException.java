package com.SGTPI.SystemProject.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
    @ResponseStatus(HttpStatus.CONFLICT) // Esto hará que Spring devuelva un 409 Conflict
    public class AppointmentConflictException extends RuntimeException {
        public AppointmentConflictException(String message) {
            super(message);
        }
    }

