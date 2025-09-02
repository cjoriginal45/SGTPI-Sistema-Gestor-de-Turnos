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

//logica de negocio para enviar emails
@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;
    // Define un formateador de fecha para los correos
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
    //correo de al app
    private static final String SENDER_EMAIL = "sgtpiofficial@gmail.com";


    //metodo asincrono para enviar email
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
