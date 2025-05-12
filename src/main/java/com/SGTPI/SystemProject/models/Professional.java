
package com.SGTPI.SystemProject.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Entity
@Table(name="professional_tbl")
public class Professional {
    
    @Id
    @GeneratedValue
    private Integer id;
    
    @Column(nullable=false)
    private String email;
    
    @Column(nullable=false)
    private String password;
    
    @OneToMany(mappedBy="professional")
    private List<Appointment> appointments;
    
    @OneToMany(mappedBy="professional")
    private List<Notification> notifications;
    
    @OneToMany(mappedBy="professional")
    private List<Report> reports;
    
    @OneToOne()
    @JoinColumn(name = "schedule_id")
    private Schedule schedule;
}
