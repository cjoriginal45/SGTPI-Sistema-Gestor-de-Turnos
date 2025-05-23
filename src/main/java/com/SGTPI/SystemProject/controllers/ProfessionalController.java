
package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.services.ProfessionalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfessionalController {
    
    private final ProfessionalService professionalService;

    public ProfessionalController(ProfessionalService professionalService) {
        this.professionalService = professionalService;
    }
   
    
    @PostMapping("professional")
    public ResponseEntity<?> createProfessional(@RequestBody Professional professional){
        return ResponseEntity.ok(professionalService.createProfessional(professional));
    }
    
    @GetMapping("professional")
    public ResponseEntity<?> getProfessional(){
        return ResponseEntity.ok().body(professionalService.findProfessional());
    }
    
}
