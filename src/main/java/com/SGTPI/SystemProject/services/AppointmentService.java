package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.AppointmentRequestDto;
import com.SGTPI.SystemProject.dto.AppointmentResponseDto;
import com.SGTPI.SystemProject.mappers.AppointmentMapper;
import com.SGTPI.SystemProject.repositories.AppointmentRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private final AppointmentMapper appMapper;
    private final AppointmentRepository appRepository;

    public AppointmentService(AppointmentMapper appMapper, AppointmentRepository appRepository) {
        this.appMapper = appMapper;
        this.appRepository = appRepository;
    }

    //crear turno
    @Transactional
    public AppointmentResponseDto createAppointment(AppointmentRequestDto dto) {
        if (dto != null) {

            appRepository.save(appMapper.requestToAppointment(dto));
        }

        return appMapper.requestToResponse(dto);
    }
    
    //lista de turnos
    public List<AppointmentResponseDto> getAppointments(){
        return appRepository.findAll()
                .stream()
                .map(appointment -> appMapper.entityToResponse(appointment))
                .collect(Collectors.toList());
    }
}
