package com.SGTPI.SystemProject.repositories;

import com.SGTPI.SystemProject.models.Professional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
@ActiveProfiles("test")
@SpringBootTest
@Transactional
public class ProfessionalRepositoryTest {

    @Autowired
    private ProfessionalRepository professionalRepository;

    @Test
    @DisplayName("")
    void testSaveProfessional(){
        Professional professional = Professional.builder()
                .email("jose@gmail.com")
                .password("66666")
                .build();

        //when
        Professional professionalSaved = professionalRepository.save(professional);

        //then
        assertThat(professionalSaved).isNotNull();
        assertThat(professionalSaved.getId()).isEqualTo(1);
    }

    @Test
    @DisplayName("test findById")
    void testFindById(){
        //given
        Professional professional = Professional.builder()
                .email("jose@gmail.com")
                .password("66666")
                .build();
        professionalRepository.save(professional);

        //when
        Professional professionalId = professionalRepository.findById(professional.getId());
        System.out.println(professional.getId());

        //then
        assertThat(professionalId).isNotNull();
        assertThat(professionalId).isEqualTo(professional);

    }

}
