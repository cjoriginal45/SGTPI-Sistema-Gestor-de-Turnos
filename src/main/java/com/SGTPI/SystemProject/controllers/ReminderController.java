package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.ReminderDto;
import com.SGTPI.SystemProject.services.AppointmentService;
import com.SGTPI.SystemProject.services.ReminderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/reminders")
public class ReminderController {

    private final AppointmentService appointmentService;

    private final ReminderService reminderService;

    public ReminderController(AppointmentService appointmentService, ReminderService reminderService) {
        this.appointmentService = appointmentService;
        this.reminderService = reminderService;
    }

    @GetMapping("/cancel/{reminderId}")
    public ResponseEntity<?> cancelAppointment(@PathVariable Integer reminderId) {
        ReminderDto response = reminderService.cancelAppointmentFromReminder(reminderId);

        if ("success".equals(response.status())) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

}
