
package com.SGTPI.SystemProject.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Entity
@Table(name = "schedule_tbl")
public class Schedule {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    private String morningOpeningHours;
    private String morningClosingHours;
    private String afternoonOpeningHours;
    private String afternoonClosingHours;
    
    @OneToOne()
    @JoinColumn(name = "professional_id")
    private Professional professional;
}
