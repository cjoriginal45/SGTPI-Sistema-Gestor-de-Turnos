
package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import org.springframework.stereotype.Service;

//logica de negocio de professional
@Service
public class ProfessionalService {
    
    private final ProfessionalRepository professionalRepository;

    public ProfessionalService(ProfessionalRepository professionalRepository) {
        this.professionalRepository = professionalRepository;
    }

    //obtener paciente (solo puede haber uno)
    public Professional findProfessional(){
         return professionalRepository.findById(1);
    }
    
    //crear professional
    public Professional createProfessional(Professional professional){
        String email = professional.getEmail();
        String password = professional.getPassword();
        return professionalRepository.save(new Professional(email,password));
    }
    
}
