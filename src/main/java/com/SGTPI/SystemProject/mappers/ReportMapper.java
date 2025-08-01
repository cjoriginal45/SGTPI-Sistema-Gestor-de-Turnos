package com.SGTPI.SystemProject.mappers;

import com.SGTPI.SystemProject.dto.ReportRequestDateDto;
import com.SGTPI.SystemProject.dto.ReportResponseDto;
import com.SGTPI.SystemProject.models.Report;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import com.SGTPI.SystemProject.repositories.ReportRepository;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.time.LocalDateTime;

@Service
public class ReportMapper {

    private final ReportRepository reportRepository;
    private final ProfessionalRepository professionalRepository;

    public ReportMapper(ReportRepository reportRepository, ProfessionalRepository professionalRepository) {
        this.reportRepository = reportRepository;
        this.professionalRepository = professionalRepository;
    }

    public Report requestToEntity(ReportRequestDateDto request, Path filePath){
        Report report = Report.builder()
                .type(request.reportType())
                .format(request.reportFormat())
                .date(LocalDateTime.now())
                .content(filePath.toString()) // Store the file path
                .professional(professionalRepository.findById(request.professionalId()))
                .build();
        Report savedReport = reportRepository.save(report);

        return report;
    }

    public ReportResponseDto entityToResponse(Report report,String message,String url){
        ReportResponseDto rep = new ReportResponseDto(
                message,
                report.getId(),
                url,
                report.getDate().toLocalDate(),
                report.getDate().toLocalTime()
        );

        return rep;
    }
}
