package com.SGTPI.SystemProject.utils;

import org.springframework.context.ApplicationEvent;

public class EmailEvent extends ApplicationEvent {
    private String to;
    private String subject;
    private String body;

    public EmailEvent(Object source, String to, String subject, String body) {
        super(source);
        this.to = to;
        this.subject = subject;
        this.body = body;
    }

    // Getters para los campos
    public String getTo() {
        return to;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }
}
