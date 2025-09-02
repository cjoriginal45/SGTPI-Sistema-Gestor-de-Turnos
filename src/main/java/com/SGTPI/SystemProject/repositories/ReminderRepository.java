package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
//Repository de recordatorio
@Repository
public interface ReminderRepository extends JpaRepository<Reminder, Integer> {
    //obtener lista de recordatorios que no hayan sido enviados
    List<Reminder> findAllByIsSentFalse();
}
