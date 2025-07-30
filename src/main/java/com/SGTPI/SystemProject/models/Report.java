
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

import lombok.*;

@Data
@Builder
@Entity
@AllArgsConstructor
@RequiredArgsConstructor
@Table(name = "report_tbl")
public class Report {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ReportType type;
    
    private LocalDateTime date;
    
    @Column(length=1000)
    private String content;
    
    @Enumerated(EnumType.STRING)
    private ReportFormat format;
    
    @ManyToOne
    @JoinColumn(name="professional_id")
    private Professional professional;
}
