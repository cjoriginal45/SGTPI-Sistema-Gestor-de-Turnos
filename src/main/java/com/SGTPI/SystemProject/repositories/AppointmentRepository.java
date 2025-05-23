package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Appointment;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    @Query("SELECT a FROM Appointment a WHERE FUNCTION('DATE', a.date) = :date")
    List<Appointment> findByDate(@Param("date") LocalDate date);

}
