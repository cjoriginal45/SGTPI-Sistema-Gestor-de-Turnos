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

//Repository de Appointmet
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    //obtener lista turnos en una fecha dada
    @Query("SELECT a FROM Appointment a WHERE FUNCTION('DATE', a.date) = :date")
    List<Appointment> findByDate(@Param("date") LocalDate date);

    @Query(value = "SELECT * FROM appointment_tbl WHERE DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s.%f') = DATE_FORMAT(:dateTime, '%Y-%m-%d %H:%i:%s')",
            nativeQuery = true)
    Optional<Appointment> findByDateTimeNative(@Param("dateTime") LocalDateTime dateTime);

    //busca en la BD si existe un turno en la fecha pasada por parametro
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END "
            + "FROM Appointment a WHERE a.date = :date")
    boolean existsByDate(@Param("date") LocalDateTime date);

    //elimina el turno con la fecha y status pasados por parametro (se usa para desbloquear slots)
    @Modifying
    @Query("DELETE FROM Appointment a WHERE a.date = :date AND a.status = :status")
    int deleteByDateAndStatus(@Param("date") LocalDateTime date, @Param("status") AppointmentStatus status);

    //obtiene el turno con la fecha y status pasados por parametro
    @Query("SELECT a FROM Appointment a WHERE a.date = :date AND a.status = :status")
    Optional<Appointment> findByDateAndStatus(@Param("date") LocalDateTime date,
                                              @Param("status") AppointmentStatus status);

    //verifica que no haya otro turno en el mismo horario que el turno que se esta asignando (excludedId)
    @Query("SELECT a FROM Appointment a WHERE a.date = :date AND a.id != :excludeId AND a.status = :status")
    Optional<Appointment> findByDateAndIdIsNotAndStatus(
            @Param("date") LocalDateTime date,
            @Param("excludeId") int excludeId,
            @Param("status") AppointmentStatus status
    );

    //obtiene el turno en la fecha dada
    @Query("SELECT a FROM Appointment a WHERE a.date = :date")
    Optional<Appointment> findByDate(@Param("date") LocalDateTime date);

    @Query("SELECT a FROM Appointment a WHERE a.status = :status AND a.date = :date")
    List<Appointment> findByStatusAndDateBefore(@Param("status")AppointmentStatus status, @Param("date") LocalDateTime date);


    Optional<Appointment> findByDateAndIdIsNotAndStatusIn(LocalDateTime date, int id, List<AppointmentStatus> statuses);

    //obtener lista de turnos cancelados
    @Query("SELECT a FROM Appointment a WHERE a.status = CANCELADO")
    List<Appointment> findByStatusCanceled();

}
