package com.SGTPI.SystemProject.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
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
    @GeneratedValue
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
