
package com.SGTPI.SystemProject.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;



@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name="appointment_tbl")
public class Appointment {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    @Column(nullable=false)
    private Integer duration;
    
    @Column(name = "fecha_hora", nullable=false)
    private LocalDateTime date;
    
    @Column(length=255)
    private String sessionNotes;
    
    @Enumerated(EnumType.STRING)
    private AppointmentStatus status;
    
    private boolean isUrgent;
    
    @ManyToOne
    @JoinColumn(name="patient_id")
    private Patient patient;
    
    @OneToOne
    @JoinColumn(name = "reminder_id")
    private Reminder reminder;
    
    @ManyToOne
    @JoinColumn(name="professional_id")
    private Professional professional;

    public Appointment(Integer duration, LocalDateTime date,
            AppointmentStatus status, Patient patient,Professional professional) {
        this.duration = duration;
        this.date = date;
        this.status = status;
        this.patient = patient;
        this.professional=professional;
    }

}
