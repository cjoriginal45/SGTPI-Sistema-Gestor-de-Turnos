package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Patient;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

//Repository de paciente
public interface PatientRepository extends JpaRepository<Patient, Integer> {

    //metodo para setear/actualizar observaciones
    @Modifying
    @Query("UPDATE Patient p SET p.observations = :observations WHERE p.phoneNumber = :phoneNumber")
    int updateObservations(
            @Param("phoneNumber")String phoneNumber,
            @Param("observations") String observations);
    
    //obtener las observaciones
    @Query("SELECT p.observations FROM Patient p WHERE p.phoneNumber = :phoneNumber")
    Optional<String> getObservations(
            @Param("phoneNumber")String phoneNumber);

    //obtener paciente por numero de telefono
    @Query("SELECT p FROM Patient p WHERE p.phoneNumber = :phoneNumber")
    Optional<Patient> findByPhoneNumber(@Param("phoneNumber") String phoneNumber);

}
