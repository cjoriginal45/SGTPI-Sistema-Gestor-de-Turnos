package com.SGTPI.SystemProject.dto;

import com.SGTPI.SystemProject.models.ReportFormat;
import com.SGTPI.SystemProject.models.ReportType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

//DTO para la lista de reportes
@Data
@Builder
public class ReportMetaDataDto {
    private Integer id;
    private ReportType type;
    private LocalDateTime date;
    private ReportFormat format;
    private String professionalEmail;
    private String downloadUrl; // Frontend will use this to download
}
