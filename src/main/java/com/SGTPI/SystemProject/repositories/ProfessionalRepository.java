
package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Professional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

//Repository de profesional
public interface ProfessionalRepository extends JpaRepository<Professional,Long>{

    //obtener profesional por id
    @Query("SELECT p FROM Professional p WHERE p.id = :id")
    public Professional findById(@Param("id") int id);
    
}
