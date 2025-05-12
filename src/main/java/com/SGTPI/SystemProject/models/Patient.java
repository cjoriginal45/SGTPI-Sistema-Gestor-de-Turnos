package com.SGTPI.SystemProject.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.List;
import lombok.Builder;
import lombok.Data;


@Data
@Builder
@Entity
@Table(name = "patient_tbl")
public class Patient {

    @Id
    @GeneratedValue
    private Integer id;
    
    @Column(nullable=false)
    private String firstname;
    @Column(nullable=false)
    private String lastname;
    
    @Column(nullable = true)
    private String email;
    
    @Column(nullable=false)
    private Integer phoneNumber;
    
    @Column(nullable = true)
    private String firstConsultation;
    @Column(nullable = true)
    private String observations;
    @Column(nullable = true)
    private String usualSchedule;

    @OneToMany(mappedBy="patient")
    private List<Appointment> appointment;
    
}
