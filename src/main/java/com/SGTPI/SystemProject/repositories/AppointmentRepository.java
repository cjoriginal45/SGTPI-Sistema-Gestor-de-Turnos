
package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;


public interface AppointmentRepository extends JpaRepository<Appointment,Integer> {
    
    
}
