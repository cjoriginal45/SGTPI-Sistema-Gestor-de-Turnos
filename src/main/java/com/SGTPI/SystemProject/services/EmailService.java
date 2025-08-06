package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.utils.EmailEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;
    // Define un formateador de fecha para los correos
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    private static final String SENDER_EMAIL = "sgtpiofficial@gmail.com";

   /*
    public void sendConfirmationEmail(Appointment appointment) {
        String recipientEmail = appointment.getPatient().getEmail();
        String subject = "Confirmación de Turno #" + appointment.getId();

        // Construcción robusta del cuerpo del correo sin usar String.format()
        StringBuilder body = new StringBuilder();
        body.append("<h1>¡Hola, ").append(appointment.getPatient().getFirstName()).append("!</h1>");
        body.append("<p>Tu turno ha sido <strong>confirmado</strong> con éxito.</p>");
        body.append("<ul>");
        body.append("<li><strong>Fecha y Hora:</strong> ").append(appointment.getDate().format(FORMATTER)).append("</li>");
        body.append("</ul>");
        body.append("<p>Gracias por confiar en nosotros. Atte, Equipo Médico</p>");

        sendEmail(recipientEmail, subject, body.toString());
    }


    public void sendCancellationEmail(Appointment appointment) {
        String recipientEmail = appointment.getPatient().getEmail();
        String subject = "Cancelación de Turno #" + appointment.getId();

        StringBuilder body = new StringBuilder();
        body.append("<h1>¡Hola, ").append(appointment.getPatient().getFirstName()).append("!</h1>");
        body.append("<p>Tu turno ha sido <strong>cancelado</strong></p>");
        body.append("<ul>");
        body.append("<li><strong>Fecha y Hora:</strong> ").append(appointment.getDate().format(FORMATTER)).append("</li>");
        body.append("</ul>");
        body.append("<p>Atentamente, Equipo Médico.</p>");

        sendEmail(recipientEmail, subject, body.toString());
    }


    public void sendModificationEmail(Appointment appointment) {
        String recipientEmail = appointment.getPatient().getEmail();
        String subject = "Modificación de Turno #" + appointment.getId();

        StringBuilder body = new StringBuilder();
        body.append("<h1>¡Hola, ").append(appointment.getPatient().getFirstName()).append("!</h1>");
        body.append("<p>Tu turno ha sido <strong>modificado</strong>.</p>");
        body.append("<ul>");
        body.append("<li><strong>Nueva Fecha y Hora:</strong> ").append(appointment.getDate().format(FORMATTER)).append("</li>");
        body.append("<li><strong>Estado Actual:</strong> ").append(appointment.getStatus().name()).append("</li>");
        body.append("</ul>");
        body.append("<p>Atentamente, Equipo Médico.</p>");

        sendEmail(recipientEmail, subject, body.toString());
    }
    */


    @Async("emailExecutor")
    @EventListener
    public void handleEmailEvent(EmailEvent event) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "utf-8");

            helper.setFrom(SENDER_EMAIL);
            helper.setTo(event.getTo());
            helper.setSubject(event.getSubject());
            helper.setText(event.getBody(), true);

            mailSender.send(message);

            System.out.println("Correo enviado con éxito a: " + event.getTo());
        } catch (MailException | MessagingException e) {
            System.err.println("Error al enviar el correo electrónico:");
            System.err.println("Mensaje de error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
