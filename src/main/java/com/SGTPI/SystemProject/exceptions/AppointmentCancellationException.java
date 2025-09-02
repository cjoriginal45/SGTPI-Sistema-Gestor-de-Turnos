package com.SGTPI.SystemProject.exceptions;

//Exception appointment cancelado
public class AppointmentCancellationException extends RuntimeException {
    public AppointmentCancellationException(String message) {
        super(message);
    }
}
