package com.SGTPI.SystemProject.dto;

import java.time.LocalDate;
import java.time.LocalTime;
//DTO de respuesta para Reportes
public record ReportResponseDto(
        String message,
        Integer reportId,
        String downloadUrl,
        LocalDate date,
        LocalTime time
) {
}
