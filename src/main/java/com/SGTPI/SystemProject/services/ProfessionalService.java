
package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalService {
    
    private final ProfessionalRepository professionalRepository;

    public ProfessionalService(ProfessionalRepository professionalRepository) {
        this.professionalRepository = professionalRepository;
    }

    public Professional findProfessional(){
         return professionalRepository.findById(1);
    }
    
    
    public Professional createProfessional(Professional professional){
        String email = professional.getEmail();
        String password = professional.getPassword();
        return professionalRepository.save(new Professional(email,password));
    }
    
}
