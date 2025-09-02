package com.SGTPI.SystemProject.models;

import jakarta.persistence.*;

import java.util.List;
import java.util.Objects;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.validator.EmailValidator;

//clase Entity Patient
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "patient_tbl")
public class Patient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(nullable=false)
    private String firstName;
    @Column(nullable=false)
    private String lastName;
    
    @Column(nullable = true)
    private String email;
    
    @Column(nullable=false)
    private String phoneNumber;
    
    @Column(nullable = true)
    private String firstConsultation;
    @Column(nullable = true)
    private String observations;
    @Column(nullable = true)
    private String usualSchedule;

    @OneToMany(mappedBy="patient")
    private List<Appointment> appointment;

    public Patient(String firstName, String lastName, String email, String phoneNumber) {
        this.firstName = Objects.requireNonNull(firstName, "First name cannot be null");
        this.lastName = Objects.requireNonNull(lastName, "Last name cannot be null");
        this.email = validateEmail(email);
        this.phoneNumber = Objects.requireNonNull(phoneNumber, "Phone number cannot be null");
    }

    public Patient(String firstName, String lastName, String phoneNumber) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.phoneNumber = phoneNumber;
    }

    //validar email
    private String validateEmail(String email) {
        if (!EmailValidator.getInstance().isValid(email)) {
            throw new IllegalArgumentException("Invalid email address: " + email);
        }
        return email;
    }

    //validar numero de telefono
    private String validatePhoneNumber(String phoneNumber){
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            throw new IllegalArgumentException();
        }
        // Solo permite dígitos numéricos
        if (phoneNumber.matches("\\d+") && phoneNumber.length()==10) return phoneNumber;

        return "";
    }
}
