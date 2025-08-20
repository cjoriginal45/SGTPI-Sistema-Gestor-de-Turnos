package com.SGTPI.SystemProject.services;


import com.SGTPI.SystemProject.models.Professional;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.internal.verification.VerificationModeFactory.times;

@ExtendWith(MockitoExtension.class)
public class ProfessionalServiceTest {
    @Mock
    private ProfessionalRepository professionalRepository;
    @InjectMocks
    private ProfessionalService professionalService;


    @Test
    @DisplayName("test crear Profesional")
    void testCreateProfessional(){
        //given
        Professional professional = Professional.builder()
                .id(1)
                .email("lolo@mail.com")
                .password("5543454432")
                .build();

        given(professionalRepository.save(professional)).willReturn(professional);

        //when
        Professional professionalSaved = professionalService.createProfessional(professional);

        //then
        assertThat(professionalSaved).isNotNull();
        assertThat(professionalSaved).isEqualTo(professional);
        verify(professionalRepository).save(professional);
    }

    @Test
    @DisplayName("test find Profesional")
    void testFindProfessional(){
        //given
        Professional professional = Professional.builder()
                .id(1)
                .email("lolo@mail.com")
                .password("5543454432")
                .build();

        given(professionalRepository.findById(1)).willReturn(professional);

        //when
        Professional professional1 = professionalService.findProfessional();

        //then
        assertThat(professional1).isNotNull();
        assertThat(professional1).isEqualTo(professional);
    }
}
