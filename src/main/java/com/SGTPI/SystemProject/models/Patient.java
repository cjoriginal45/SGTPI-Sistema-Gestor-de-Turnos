package com.SGTPI.SystemProject.models;

import jakarta.persistence.*;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


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
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
    }

    public Patient(String firstName, String lastName, String phoneNumber) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.phoneNumber = phoneNumber;
    }
}
