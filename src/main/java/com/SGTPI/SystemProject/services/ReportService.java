package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.dto.ReportMetaDataDto;
import com.SGTPI.SystemProject.dto.ReportRequestDateDto;
import com.SGTPI.SystemProject.dto.ReportResponseDto;
import com.SGTPI.SystemProject.mappers.ReportMapper;
import com.SGTPI.SystemProject.models.*;
import com.SGTPI.SystemProject.repositories.AppointmentRepository;
import com.SGTPI.SystemProject.repositories.PatientRepository;
import com.SGTPI.SystemProject.repositories.ProfessionalRepository;
import com.SGTPI.SystemProject.repositories.ReportRepository;
import com.lowagie.text.DocumentException;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.annotation.ReadOnlyProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static com.SGTPI.SystemProject.models.ReportType.*;

@Service
public class ReportService {

    private final AppointmentRepository appointmentRepository;

    private final PatientRepository patientRepository;

    private final ProfessionalRepository professionalRepository;

    private final ReportRepository reportRepository;

    private final ReportMapper reportMapper;

    private final ReportGenerator reportGenerator;

    @Value("${report.storage.path:./generated-reports}")
    private String reportStoragePath;

    public ReportService(ReportRepository reportRepository, ProfessionalRepository professionalRepository,
                         PatientRepository patientRepository, AppointmentRepository appointmentRepository,
                         ReportGenerator reportGenerator,ReportMapper reportMapper) {
        this.reportRepository = reportRepository;
        this.professionalRepository = professionalRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.reportGenerator = reportGenerator;
        this.reportMapper=reportMapper;
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(reportStoragePath));
        } catch (IOException e) {
            System.err.println("Error creating report storage directory: " + e.getMessage());
        }
    }




    @Transactional
    public ReportResponseDto generateReport(ReportRequestDateDto request) throws IOException, DocumentException {
        // 1. Validate professional
        Professional professional = professionalRepository.findById(request.professionalId());

        // 2. Prepare data for the report based on ReportType
        Map<String, Object> reportData = fetchDataForReport(request);

        // 3. Generate the report file (PDF or Excel)
        byte[] fileBytes;
        String fileName = generateUniqueFileName(request.reportType(), request.reportFormat());
        Path filePath = Paths.get(reportStoragePath, fileName);

        String message = "";

        if (request.reportFormat() == ReportFormat.PDF) {
            fileBytes = reportGenerator.generatePdf(request.reportType(), reportData);
            message = "generando pdf";
        } else if (request.reportFormat() == ReportFormat.EXCEL) {
            fileBytes = reportGenerator.generateExcel(request.reportType(), reportData);
            message = "generando excel";
        } else {
            throw new IllegalArgumentException("Unsupported report format: " + request.reportFormat());
        }

        // 4. Save the generated file to disk
        Files.write(filePath, fileBytes);

        // 5. Save report metadata to the database
        Report savedReport = reportMapper.requestToEntity(request,filePath);


        // 6. Return response with download URL
        String downloadUrl = "/api/reports/download/" + savedReport.getId();
        return reportMapper.entityToResponse(savedReport,message,downloadUrl);
    }

    @Transactional
    public List<ReportMetaDataDto> getAllReportMetadata() {
        return reportRepository.findAll().stream()
                .map(report -> ReportMetaDataDto.builder()
                        .id(report.getId())
                        .type(report.getType())
                        .date(report.getDate())
                        .format(report.getFormat())
                        .professionalEmail(report.getProfessional() != null ? report.getProfessional().getEmail() : "N/A")
                        .downloadUrl("/api/reports/download/" + report.getId())
                        .build())
                .collect(Collectors.toList());
    }


    @Transactional
    public Resource downloadReport(Integer reportId) throws IOException {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found with ID: " + reportId));

        Path filePath = Paths.get(report.getContent());
        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            throw new IOException("Report file not found or not readable: " + filePath.toAbsolutePath());
        }

        return new UrlResource(filePath.toUri());
    }

    //logica de los reportes
    private Map<String, Object> fetchDataForReport(ReportRequestDateDto request) {
        Map<String, Object> data = new HashMap<>();

        switch (request.reportType()) {
            case PACIENTES_TOTAL:
                List<Patient> allPatients = patientRepository.findAll();
                data.put("patients", allPatients);
                break;
            case PACIENTE_MAS_TURNOS:
                Optional<Patient> patient = patientRepository.findAll().stream()
                        .max(Comparator.comparingInt(p -> p.getAppointment().size()));
                data.put("patient",patient);
                break;
            case PACIENTE_MAS_TURNOS_MES:
                if (request.startDate() == null || request.endDate() == null) {
                    throw new IllegalArgumentException("Month and Year parameters are required for CANT_TURNOS_MES report.");
                }

                YearMonth targetYearMonth = YearMonth.of(
                        request.startDate().get().getYear(),
                        request.startDate().get().getMonth()
                );
                LocalDate start = targetYearMonth.atDay(1);
                LocalDate end = targetYearMonth.atEndOfMonth();

                List<Appointment> appointmentList = appointmentRepository.findAll();

                Map<Patient, Long> cancelCountByPatient = appointmentList.stream()
                        .filter(app -> {
                            LocalDate date = app.getDate().toLocalDate();
                            return !date.isBefore(start) && !date.isAfter(end)
                                    && ((app.getStatus().equals(AppointmentStatus.CANCELADO))
                                    || (app.getStatus().equals(AppointmentStatus.CONFIRMADO)))
                                    && app.getPatient() != null;
                        })
                        .collect(Collectors.groupingBy(Appointment::getPatient, Collectors.counting()));


                Optional<Map.Entry<Patient, Long>> maxEntry = cancelCountByPatient.entrySet().stream()
                        .max(Map.Entry.comparingByValue());

                Patient pat = maxEntry.map(Map.Entry::getKey).orElse(null);
                long cont = maxEntry.map(Map.Entry::getValue).orElse(0L);
                ArrayList lista = new ArrayList<>();

                if (maxEntry.isPresent()) {
                    Map.Entry<Patient, Long> entry = maxEntry.get();
                    lista.add(entry.getKey());
                    lista.add(entry.getValue());
                } else {
                    lista.add(null);
                    lista.add(0L);
                }

                // El mes se añade siempre, ya que siempre existe
                lista.add(start.getMonth().toString());

                data.put("patientMonth", lista);
                break;
            case TURNOS_MES_ACTUAL:
                LocalDate hoy = LocalDate.now();
                LocalDate inicioMes = hoy.withDayOfMonth(1);

                List<Appointment> appointmentList1 = appointmentRepository.findAll();

                Set<Appointment> turnos = appointmentList1.stream()
                        .filter(a -> {
                            LocalDate fecha = a.getDate().toLocalDate();
                            return !fecha.isBefore(inicioMes)
                                    && !fecha.isAfter(hoy)
                                    && a.getStatus() == AppointmentStatus.CONFIRMADO;
                        })
                        .collect(Collectors.toSet());

                data.put("Month", turnos);
                break;
            case TURNOS_DIA_DADO:
                LocalDate fecha = request.startDate().get();

                List<Appointment> appointments1 = appointmentRepository.findAll()
                                .stream()
                                .filter(a -> {
                                    LocalDate fechaTurno = a.getDate().toLocalDate();
                                    return fecha.equals(fechaTurno)
                                            && a.getStatus() == AppointmentStatus.CONFIRMADO;
                                })
                                .collect(Collectors.toList());

                data.put("appointmentsDay",appointments1);
                break;
            case TURNOS_CANCELADOS_TOTAL:
                List<Appointment> appointments2 = appointmentRepository.findAll()
                        .stream()
                        .filter(a -> {
                            return a.getStatus() == AppointmentStatus.CANCELADO;
                        })
                        .collect(Collectors.toList());
                data.put("canceledTotal",appointments2);
                break;
            case TURNOS_REALIZADOS_TOTAL:
                List<Appointment> appointments3 = appointmentRepository.findAll()
                        .stream()
                        .filter(a -> {
                            LocalDate fechaActual = LocalDate.now();
                            return  a.getDate().toLocalDate().isBefore(fechaActual)
                                    && a.getStatus() == AppointmentStatus.CONFIRMADO;
                        })
                        .collect(Collectors.toList());

                data.put("takenAppointments",appointments3);
                break;
            case PROMEDIO_DURACION_TURNOS:
                double promedio = appointmentRepository.findAll()
                        .stream()
                        .mapToInt(Appointment::getDuration) // usamos referencia a método
                        .average()                           // devuelve OptionalDouble
                        .orElse(0);

                data.put("averageDuration", promedio);
                break;
            case CANT_TURNOS_MES:
                LocalDate today = LocalDate.now();
                LocalDate primerDiaMes = today.withDayOfMonth(1);

                List<Appointment> turnosDelMes = appointmentRepository.findAll()
                        .stream()
                        .filter(app -> {
                            LocalDate fechaTurno = app.getDate().toLocalDate();
                            return ( !fechaTurno.isBefore(primerDiaMes) && !fechaTurno.isAfter(today) )
                                    && app.getStatus() == AppointmentStatus.CONFIRMADO;
                        })
                        .collect(Collectors.toList());

                data.put("MonthAppointments", turnosDelMes);
                break;
            case TURNOS_RANGO_FECHAS:
                LocalDate startDate = request.startDate().get();
                LocalDate endDate = request.endDate().get();

                if (startDate.isAfter(endDate)) {
                    throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha de fin.");
                }

                List<Appointment> turnosRango = appointmentRepository.findAll()
                        .stream()
                        .filter(app -> {
                            LocalDate date = app.getDate().toLocalDate();
                            return (!date.isBefore(startDate) && !date.isAfter(endDate))
                                    && app.getStatus() == AppointmentStatus.CONFIRMADO;
                        })
                        .collect(Collectors.toList());

                data.put("appointmentsRange",turnosRango);
                break;
            case DIA_MAYOR_CANT_TURNOS:
                Map<LocalDate, Long> cantidadPorDia = appointmentRepository.findAll()
                        .stream()
                        .filter(app -> app.getStatus() == AppointmentStatus.CONFIRMADO)
                        .collect(Collectors.groupingBy(
                                app -> app.getDate().toLocalDate(),
                                Collectors.counting()
                        ));

                Optional<Map.Entry<LocalDate, Long>> max = cantidadPorDia.entrySet()
                        .stream()
                        .max(Map.Entry.comparingByValue());

                max.ifPresent(entry -> {
                    List<Object> resultado = new ArrayList<>();
                    resultado.add(entry.getKey());     // fecha
                    resultado.add(entry.getValue());   // cantidad
                    data.put("diaMayorCantidadTurnos", resultado);
                });
                break;
            default:
                // For reports that don't need specific data or are not yet implemented
                break;
        }
        return data;
    }

    private String generateUniqueFileName(ReportType type, ReportFormat format) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String typeName = type.name().toLowerCase().replace("_", "-");
        String formatExtension;

        if (format == ReportFormat.EXCEL) {
            // La extensión correcta para Excel es "xlsx"
            formatExtension = "xlsx";
        } else if (format == ReportFormat.PDF) {
            formatExtension = "pdf";
        } else {
            throw new IllegalArgumentException("Unsupported report format");
        }

        return String.format("%s_%s.%s", typeName, timestamp, formatExtension);
    }


}
