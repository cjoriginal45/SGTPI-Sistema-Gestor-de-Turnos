package com.SGTPI.SystemProject.controllers;

import com.SGTPI.SystemProject.dto.ReportMetaDataDto;
import com.SGTPI.SystemProject.dto.ReportRequestDateDto;
import com.SGTPI.SystemProject.dto.ReportResponseDto;
import com.SGTPI.SystemProject.services.ReportService;
import com.lowagie.text.DocumentException;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reports")
@CrossOrigin(origins = "http://localhost:4200")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateReport(@RequestBody ReportRequestDateDto request) {
        ReportResponseDto response = null;
        try {
            response = reportService.generateReport(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException | DocumentException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<List<ReportMetaDataDto>> getAllReportMetadata() {
        List<ReportMetaDataDto> reports = reportService.getAllReportMetadata();
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/download/{reportId}")
    public ResponseEntity<Resource> downloadReport(@PathVariable Integer reportId) {
        try {
            Resource fileResource = reportService.downloadReport(reportId);
            String contentType = "application/octet-stream"; // Default
            String filename = fileResource.getFilename();

            // Determine content type based on file extension
            if (filename != null) {
                if (filename.endsWith(".pdf")) {
                    contentType = MediaType.APPLICATION_PDF_VALUE;
                } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                }
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(fileResource);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }



}
