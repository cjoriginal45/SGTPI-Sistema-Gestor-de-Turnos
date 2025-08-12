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
@Table(name = "professional_tbl")
public class Professional {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @OneToMany(mappedBy = "professional")
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "professional")
    private List<Notification> notifications;

    @OneToMany(mappedBy = "professional")
    private List<Report> reports;

    @Column(nullable = true)
    private String morningOpeningHours;
    @Column(nullable = true)
    private String morningClosingHours;
    @Column(nullable = true)
    private String afternoonOpeningHours;
    @Column(nullable = true)
    private String afternoonClosingHours;

    public Professional(String email, String password) {
        this.id = 1;
        this.email = email;
        this.password = password;
    }

}
