
package com.SGTPI.SystemProject.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;
//clase Entity Notification
@Data
@Builder
@Entity
@Table(name = "notification_tbl")
public class Notification {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    @Column(length=400)
    private String message;
    
    @Enumerated(EnumType.STRING)
    private NotificationType type;
    
    private LocalDateTime createdAt;
    
    @ManyToOne
    @JoinColumn(name="professional_id")
    private Professional professional;

}
