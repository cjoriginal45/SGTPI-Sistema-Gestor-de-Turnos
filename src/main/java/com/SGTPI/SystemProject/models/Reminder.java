
package com.SGTPI.SystemProject.models;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Entity
@Table(name="reminder_tbl")
public class Reminder {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    private LocalDateTime sendTime;
    
    @Enumerated(EnumType.STRING)
    private sendMethod method;
    
    private boolean isConfirmed;
    
    @OneToOne
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;
}
