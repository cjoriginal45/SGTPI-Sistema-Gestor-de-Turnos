
package com.SGTPI.SystemProject.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;

import lombok.*;

@Data
@Builder
@Entity
@AllArgsConstructor
@RequiredArgsConstructor
@Table(name="reminder_tbl")
public class Reminder {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    private LocalDateTime sendTime;
    
    @Enumerated(EnumType.STRING)
    private sendMethod method;

    private boolean isConfirmed;
    @Column(name = "is_sent", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean isSent;
    
    @OneToOne
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;
}
