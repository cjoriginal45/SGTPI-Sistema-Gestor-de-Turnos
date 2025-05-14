package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PatientRepository extends JpaRepository<Patient, Integer> {

    @Modifying
    @Query("UPDATE Patient p SET p.observations = :observations WHERE p.id = :patientId")
    int updateObservations(
            @Param("patientId")int patientId,
            @Param("observations") String observations);

}
