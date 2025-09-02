package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.ReminderDto;
import com.SGTPI.SystemProject.exceptions.AppointmentCancellationException;
import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import com.SGTPI.SystemProject.models.Reminder;
import com.SGTPI.SystemProject.repositories.ReminderRepository;
import com.SGTPI.SystemProject.utils.EmailEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

//logica de negocio de los recordatorios
@Service
public class ReminderService {

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private AppointmentService appointmentService;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");



     // Tarea programada que se ejecuta cada 15 minutos.
     // Busca recordatorios pendientes de enviar.

    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void sendPendingReminders() {
        // Busca todos los recordatorios que no se han enviado
        List<Reminder> pendingReminders = reminderRepository.findAllByIsSentFalse();

        for (Reminder reminder : pendingReminders) {
            Appointment appointment = reminder.getAppointment();
            LocalDateTime now = LocalDateTime.now();

            // Condición para enviar: El tiempo de envío ya pasó y el turno no está cancelado.
            // También verifica que el turno esté a más de 48 horas de distancia para cumplir con la lógica de recuperación
            if (now.isAfter(reminder.getSendTime()) && now.isBefore(appointment.getDate().minusHours(48)) &&
                    appointment.getStatus() != AppointmentStatus.CANCELADO) {

                // Lógica para enviar el correo
                String to = appointment.getPatient().getEmail();
                String subject = "Recordatorio de Turno Próximo #" + appointment.getId();
                StringBuilder body = new StringBuilder();
                body.append("<h1>¡Hola, ").append(appointment.getPatient().getFirstName()).append("!</h1>");
                body.append("<p>Este es un recordatorio para tu próximo turno. Por favor, confirma o cancela tu asistencia.</p>");
                body.append("<ul>");
                body.append("<li><strong>Fecha y Hora:</strong> ").append(appointment.getDate().format(FORMATTER)).append("</li>");
                body.append("</ul>");

                body.append("<p>Tiene hasta 48hs antes de la cita para cancelar</p>");

                body.append("<p>¿Desea canelar su turno?</p>");
                // --- Botón de Cancelar ---
                body.append("<a href=\"http://localhost:4200/cancel/").append(reminder.getId()).append("\" ");                body.append("style=\"");
                body.append("display: inline-block; padding: 10px 20px; font-size: 16px; color: #FFFFFF; ");
                body.append("background-color: #EF4444; text-decoration: none; border-radius: 5px; ");
                body.append("font-weight: bold;");
                body.append("\">");
                body.append("Cancelar Turno");
                body.append("</a>");

                body.append("<p>Atentamente, Equipo Médico.</p>");

                // Publicamos el evento para el envío asíncrono
                eventPublisher.publishEvent(new EmailEvent(this, to, subject, body.toString()));

                // Marcar el recordatorio como enviado para evitar que se envíe de nuevo
                reminder.setSent(true);
                reminderRepository.save(reminder);
            }
        }
    }

    //metodo para cancelar un turno desde un recordatorio
    @Transactional
    public ReminderDto cancelAppointmentFromReminder(Integer reminderId) {
        try {
            // Busca el recordatorio por ID
            Reminder reminder = reminderRepository.findById(reminderId)
                    .orElseThrow(() -> new IllegalArgumentException("Recordatorio no encontrado con ID: " + reminderId));

            //  Obtiene el turno asociado al recordatorio
            Appointment appointment = reminder.getAppointment();
            if (appointment == null) {
                throw new IllegalArgumentException("El recordatorio no está asociado a ningún turno.");
            }

            String cancellationMessage = appointmentService.cancelAppointment(appointment.getId());

            // Después de que el turno ha sido procesado por AppointmentService,
            // marca el recordatorio como enviado (para no procesarlo de nuevo).
            reminder.setSent(true);
            reminderRepository.save(reminder);

            return new ReminderDto("success", cancellationMessage);

        } catch (IllegalArgumentException e) {
            // Captura errores como "Recordatorio no encontrado" o "Turno no asociado"
            return new ReminderDto("error", e.getMessage());
        } catch (AppointmentCancellationException e) {
            // Captura errores específicos de tu lógica de negocio en AppointmentService
            return new ReminderDto("error", e.getMessage());
        } catch (Exception e) {
            // Captura cualquier otro error inesperado
            e.printStackTrace(); // Imprime la traza para depuración
            return new ReminderDto("error", "Ocurrió un error inesperado al procesar la cancelación: " + e.getMessage());
        }
    }
}
