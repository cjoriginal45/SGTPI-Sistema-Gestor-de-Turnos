package com.SGTPI.SystemProject.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

//Exception appointment bloqueado
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class AppointmentBlockedException extends RuntimeException {
    public AppointmentBlockedException(String message) {
        super(message);
    }
}
