package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.AppointmentStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    @Query("SELECT a FROM Appointment a WHERE FUNCTION('DATE', a.date) = :date")
    List<Appointment> findByDate(@Param("date") LocalDate date);

    @Query(value = "SELECT * FROM appointment_tbl WHERE DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s.%f') = DATE_FORMAT(:dateTime, '%Y-%m-%d %H:%i:%s')",
            nativeQuery = true)
    Optional<Appointment> findByDateTimeNative(@Param("dateTime") LocalDateTime dateTime);

    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END "
            + "FROM Appointment a WHERE a.date = :date")
    boolean existsByDate(@Param("date") LocalDateTime date);

    @Modifying
    @Query("DELETE FROM Appointment a WHERE a.date = :date AND a.status = :status")
    int deleteByDateAndStatus(@Param("date") LocalDateTime date, @Param("status") AppointmentStatus status);

    @Query("SELECT a FROM Appointment a WHERE a.date = :date AND a.status = :status")
    Optional<Appointment> findByDateAndStatus(@Param("date") LocalDateTime date,
                                              @Param("status") AppointmentStatus status);

    @Query("SELECT a FROM Appointment a WHERE a.date = :date AND a.id != :excludeId AND a.status = :status")
    Optional<Appointment> findByDateAndIdIsNotAndStatus(
            @Param("date") LocalDateTime date,
            @Param("excludeId") int excludeId,
            @Param("status") AppointmentStatus status // <--- ¡CAMBIO CLAVE AQUÍ!
    );
}
