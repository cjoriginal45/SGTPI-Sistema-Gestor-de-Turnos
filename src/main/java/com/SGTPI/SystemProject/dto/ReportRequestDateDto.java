package com.SGTPI.SystemProject.dto;

import com.SGTPI.SystemProject.models.ReportFormat;
import com.SGTPI.SystemProject.models.ReportType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

//DTO de solicitud para los reportes
public record ReportRequestDateDto(
        ReportType reportType,
        ReportFormat reportFormat,
        Integer professionalId,
        Optional<LocalDate> startDate,
        Optional<LocalDate> endDate
) {
    public ReportRequestDateDto(ReportType reportType, ReportFormat reportFormat,Integer professionalId){
    this(reportType,reportFormat,professionalId,Optional.empty(),Optional.empty());
    }
}
