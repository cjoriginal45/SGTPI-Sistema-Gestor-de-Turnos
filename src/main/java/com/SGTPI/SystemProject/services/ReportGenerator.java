package com.SGTPI.SystemProject.services;

import com.SGTPI.SystemProject.models.Appointment;
import com.SGTPI.SystemProject.models.Patient;
import com.SGTPI.SystemProject.models.ReportType;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;

@Component
public class ReportGenerator {



    /**
     * Generates a PDF report based on type and data.
     * @param reportType The type of report.
     * @param reportData A map containing data for the report (e.g., "patients", "appointments", "totalCount").
     * @return Byte array of the generated PDF.
     * @throws DocumentException if there's an issue with PDF generation.
     */
    public byte[] generatePdf(ReportType reportType, Map<String, Object> reportData) throws DocumentException, IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter.getInstance(document, baos);

        document.open();
        document.add(new Paragraph("Reporte de " + formatReportTypeName(reportType)));
        document.add(new Paragraph("Fecha de Generación: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
        document.add(Chunk.NEWLINE);

        switch (reportType) {
            case PACIENTES_TOTAL:
                generateTotalPatientsPdf(document, (List<Patient>) reportData.get("patients"));
                break;
            case PACIENTE_MAS_TURNOS:
                generatePatientMoreAppointmentsPdf(document, (Optional<Patient>) reportData.get("patient"));
                break;
            case TURNOS_CANCELADOS_TOTAL:
                generateTotalCancelledAppointmentsPdf(document, (List<Appointment>) reportData.get("canceledTotal"));
                break;
            case PACIENTE_MAS_TURNOS_MES:
                generatePatientMoreAppointmentsMonthPdf(document, (ArrayList<Object>) reportData.get("patientMonth"));
                break;
            case TURNOS_MES_ACTUAL:
                generateCantAppointmentsMonthPdf(document,(Set<Appointment>) reportData.get("Month"));
                break;
            case TURNOS_DIA_DADO:
                generateAppointmentsDayPdf(document,(List<Appointment>) reportData.get("appointmentsDay"));
                break;
            case TURNOS_REALIZADOS_TOTAL:
                generateAppointmentsDonePdf(document,(List<Appointment>) reportData.get("takenAppointments"));
                break;
            case PROMEDIO_DURACION_TURNOS:
                generateAppointmentsMeanDurationPdf(document,(Double) reportData.get("averageDuration"));
                break;
            case CANT_TURNOS_MES:
                generateAppointmentsMonthSelectedPdf(document,(List<Appointment>) reportData.get("MonthAppointments"));
                break;
            case TURNOS_RANGO_FECHAS:
                generateAppointmentsRangePdf(document,(List<Appointment>) reportData.get("appointmentsRange"));
                break;
            case DIA_MAYOR_CANT_TURNOS:
                generateAppointmentsMaxDayPdf(document,(List<Object>) reportData.get("diaMayorCantidadTurnos"));
            default:
                document.add(new Paragraph("Contenido del reporte no implementado para PDF: " + reportType));
                break;
        }

        document.close();
        return baos.toByteArray();
    }

    private void generateAppointmentsMaxDayPdf(Document document, List<Object> diaMayorCantidadTurnos) {
        document.add(new Paragraph("el dia con mayor cantidad de turnos fue: " +diaMayorCantidadTurnos.get(0)));
        document.add(new Paragraph("Cantidad de turnos: "+diaMayorCantidadTurnos.get(1)));
        document.add(Chunk.NEWLINE);
    }


    private void generateAppointmentsRangePdf(Document document, List<Appointment> appointments) {
        document.add(new Paragraph("Cantidad de turnos: "+ appointments.size()));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        table.addCell(new PdfPCell(new Phrase("Nombre y Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));
        table.addCell(new PdfPCell(new Phrase("Fecha")));
        table.addCell(new PdfPCell(new Phrase("Hora")));

        for(Appointment a: appointments){
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getFirstName()+" "+a.getPatient().getLastName())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getPhoneNumber())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getEmail())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalDate().toString())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalTime().toString())));
        }

        document.add(table);
    }

    private void generateAppointmentsMonthSelectedPdf(Document document, List<Appointment> monthAppointments) {
        document.add(new Paragraph("Mes: "+monthAppointments.get(2).getDate().getMonth().toString()
                +"Cantidad de turnos:"+ monthAppointments.size()));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        table.addCell(new PdfPCell(new Phrase("Nombre y Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));
        table.addCell(new PdfPCell(new Phrase("Fecha")));
        table.addCell(new PdfPCell(new Phrase("Hora")));

        for(Appointment a: monthAppointments){
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getFirstName()+" "+a.getPatient().getLastName())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getPhoneNumber())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getEmail())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalDate().toString())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalTime().toString())));
        }

        document.add(table);
    }

    private void generateAppointmentsMeanDurationPdf(Document document, Double averageDuration) {
        document.add(new Paragraph("El promedio de duracion de los turnos es de : "+ averageDuration+" minutos"));
        document.add(Chunk.NEWLINE);
    }

    private void generateAppointmentsDonePdf(Document document, List<Appointment> takenAppointments) {
        document.add(new Paragraph("Cantidad de turnos realizados en total: "+ takenAppointments.size()));
        document.add(Chunk.NEWLINE);


        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        table.addCell(new PdfPCell(new Phrase("Nombre y Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));
        table.addCell(new PdfPCell(new Phrase("Fecha")));
        table.addCell(new PdfPCell(new Phrase("Hora")));

        for(Appointment a: takenAppointments){
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getFirstName()+" "+a.getPatient().getLastName())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getPhoneNumber())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getEmail())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalDate().toString())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalTime().toString())));
        }

        document.add(table);
    }

    private void generateAppointmentsDayPdf(Document document, List<Appointment> appointmentsDay) {
        if (!appointmentsDay.isEmpty()) {
            document.add(new Paragraph("Cantidad de turnos para el dia: "+ appointmentsDay.get(0).getDate().toLocalDate()
                    +" : "+ appointmentsDay.size()+" turnos"));
        } else {
            document.add(new Paragraph("No se encontraron turnos para el día especificado."));
        }

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        table.addCell(new PdfPCell(new Phrase("Nombre y Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));
        table.addCell(new PdfPCell(new Phrase("Fecha")));
        table.addCell(new PdfPCell(new Phrase("Hora")));

        for(Appointment a: appointmentsDay){
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getFirstName()+" "+a.getPatient().getLastName())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getPhoneNumber())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getEmail())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalDate().toString())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalTime().toString())));
        }

        document.add(table);
    }

    private void generateCantAppointmentsMonthPdf(Document document, Set<Appointment> appMonth) {
        document.add(new Paragraph("Cantidad de turnos este mes: "+ appMonth.size()));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        table.addCell(new PdfPCell(new Phrase("Nombre y Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));
        table.addCell(new PdfPCell(new Phrase("Fecha")));
        table.addCell(new PdfPCell(new Phrase("Hora")));

        for(Appointment a: appMonth){
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getFirstName()+" "+a.getPatient().getLastName())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getPhoneNumber())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getEmail())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalDate().toString())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalTime().toString())));
        }

        document.add(table);
    }


    private void generatePatientMoreAppointmentsMonthPdf(Document document, ArrayList<Object> patientMonth) {
        String month = (String) patientMonth.get(2);
        document.add(new Paragraph("Paciente con "+ patientMonth.get(1)
                +" turnos asignados en el mes "+ month));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        // Table Headers
        table.addCell(new PdfPCell(new Phrase("Nombre")));
        table.addCell(new PdfPCell(new Phrase("Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));

        Patient patient = (Patient) patientMonth.get(0);
        table.addCell(new PdfPCell(new Phrase(patient.getFirstName())));
        table.addCell(new PdfPCell(new Phrase(patient.getLastName())));
        table.addCell(new PdfPCell(new Phrase(patient.getPhoneNumber())));
        table.addCell(new PdfPCell(new Phrase(patient.getEmail())));

        document.add(table);
    }

    private void generateTotalCancelledAppointmentsPdf(Document document, List<Appointment> totalCancelled) {
        document.add(new Paragraph("Cantidad de turnos cancelados: "+ totalCancelled.size()));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        table.addCell(new PdfPCell(new Phrase("Nombre y Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));
        table.addCell(new PdfPCell(new Phrase("Fecha")));
        table.addCell(new PdfPCell(new Phrase("Hora")));

        for(Appointment a: totalCancelled){
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getFirstName()+" "+a.getPatient().getLastName())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getPhoneNumber())));
            table.addCell(new PdfPCell(new Phrase(a.getPatient().getEmail())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalDate().toString())));
            table.addCell(new PdfPCell(new Phrase(a.getDate().toLocalTime().toString())));
        }

        document.add(table);

    }

    //Paciente con mas turnos cancelados en total
    private void generatePatientMoreAppointmentsPdf(Document document, Optional<Patient> patient) {
        document.add(new Paragraph("Paciente con "+ patient.get().getAppointment().size()
                +" turnos asignados."));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        // Table Headers
        table.addCell(new PdfPCell(new Phrase("Nombre")));
        table.addCell(new PdfPCell(new Phrase("Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));
        table.addCell(new PdfPCell(new Phrase("Email")));

        table.addCell(new PdfPCell(new Phrase(patient.get().getFirstName())));
        table.addCell(new PdfPCell(new Phrase(patient.get().getLastName())));
        table.addCell(new PdfPCell(new Phrase(patient.get().getPhoneNumber())));
        table.addCell(new PdfPCell(new Phrase(patient.get().getEmail())));

        document.add(table);
    }

    //todos los pacientes registrados
    private void generateTotalPatientsPdf(Document document, List<Patient> patients) {
        document.add(new Paragraph("Total de Pacientes Registrados: " + patients.size()));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10f);
        table.setSpacingAfter(10f);

        // Table Headers
        table.addCell(new PdfPCell(new Phrase("Nombre")));
        table.addCell(new PdfPCell(new Phrase("Apellido")));
        table.addCell(new PdfPCell(new Phrase("Teléfono")));

        // Table Data
        for (Patient patient : patients) {
            table.addCell(new PdfPCell(new Phrase(patient.getFirstName())));
            table.addCell(new PdfPCell(new Phrase(patient.getLastName())));
            table.addCell(new PdfPCell(new Phrase(patient.getPhoneNumber())));
        }
        document.add(table);
    }



    public byte[] generateExcel(ReportType reportType, Map<String, Object> reportData) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Reporte");

            int rowNum = 0;

            Row titleRow = sheet.createRow(rowNum++);
            titleRow.createCell(0).setCellValue("Reporte de " + formatReportTypeName(reportType));

            Row dateRow = sheet.createRow(rowNum++);
            dateRow.createCell(0).setCellValue("Fecha de Generación: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

            rowNum++; // Línea en blanco

            switch (reportType) {
                case PACIENTES_TOTAL:
                    generateTotalPatientsExcel(sheet, rowNum, (List<Patient>) reportData.get("patients"));
                    break;
                case PACIENTE_MAS_TURNOS:
                    generatePatientMoreAppointmentsExcel(sheet, rowNum, (Patient) reportData.get("patient"));
                    break;
                case TURNOS_CANCELADOS_TOTAL:
                    generateTotalCancelledAppointmentsExcel(sheet, rowNum, (List<Appointment>) reportData.get("canceledTotal"));
                    break;
                case PACIENTE_MAS_TURNOS_MES:
                    generatePatientMoreAppointmentsMonthExcel(sheet, rowNum, (ArrayList<Object>) reportData.get("patientMonth"));
                    break;
                case TURNOS_MES_ACTUAL:
                    generateAppointmentsMonthExcel(sheet, rowNum, (Set<Appointment>) reportData.get("Month"));
                    break;
                case TURNOS_DIA_DADO:
                    generateAppointmentsDayExcel(sheet, rowNum, (List<Appointment>) reportData.get("appointmentsDay"));
                    break;
                case TURNOS_REALIZADOS_TOTAL:
                    generateAppointmentsDoneExcel(sheet, rowNum, (List<Appointment>) reportData.get("takenAppointments"));
                    break;
                case PROMEDIO_DURACION_TURNOS:
                    generateAppointmentsMeanDurationExcel(sheet, rowNum, (Double) reportData.get("averageDuration"));
                    break;
                case CANT_TURNOS_MES:
                    generateAppointmentsMonthSelectedExcel(sheet, rowNum, (List<Appointment>) reportData.get("MonthAppointments"));
                    break;
                case TURNOS_RANGO_FECHAS:
                    generateAppointmentsRangeExcel(sheet, rowNum, (List<Appointment>) reportData.get("appointmentsRange"));
                    break;
                case DIA_MAYOR_CANT_TURNOS:
                    generateAppointmentsMaxDayExcel(sheet, rowNum, (List<Object>) reportData.get("diaMayorCantidadTurnos"));
                    break;
                default:
                    Row notImplementedRow = sheet.createRow(rowNum);
                    notImplementedRow.createCell(0).setCellValue("Contenido del reporte no implementado para Excel: " + reportType);
                    break;
            }

            workbook.write(baos);
            workbook.close();
            return baos.toByteArray();
        }
    }

    private void generateAppointmentsMaxDayExcel(Sheet sheet, int startRow, List<Object> diaMayorCantidadTurnos) {
        Row row = sheet.createRow(startRow);
        row.createCell(0).setCellValue("El día con mayor cantidad de turnos fue: " + diaMayorCantidadTurnos.get(0));

        row = sheet.createRow(startRow + 1);
        row.createCell(0).setCellValue("Cantidad de turnos: " + diaMayorCantidadTurnos.get(1));
    }

    private void generateAppointmentsRangeExcel(Sheet sheet, int startRow, List<Appointment> appointments) {
        Row infoRow = sheet.createRow(startRow++);
        infoRow.createCell(0).setCellValue("Cantidad de turnos: " + appointments.size());

        Row header = sheet.createRow(startRow++);
        header.createCell(0).setCellValue("Nombre y Apellido");
        header.createCell(1).setCellValue("Teléfono");
        header.createCell(2).setCellValue("Email");
        header.createCell(3).setCellValue("Fecha");
        header.createCell(4).setCellValue("Hora");

        for (Appointment a : appointments) {
            Row row = sheet.createRow(startRow++);
            row.createCell(0).setCellValue(a.getPatient().getFirstName() + " " + a.getPatient().getLastName());
            row.createCell(1).setCellValue(a.getPatient().getPhoneNumber());
            row.createCell(2).setCellValue(a.getPatient().getEmail());
            row.createCell(3).setCellValue(a.getDate().toLocalDate().toString());
            row.createCell(4).setCellValue(a.getDate().toLocalTime().toString());
        }
    }

    private void generateAppointmentsMonthSelectedExcel(Sheet sheet, int startRow, List<Appointment> monthAppointments) {
        if (monthAppointments.isEmpty()) return;

        Row info = sheet.createRow(startRow++);
        info.createCell(0).setCellValue("Mes: " + monthAppointments.get(2).getDate().getMonth().toString() + ", Cantidad: " + monthAppointments.size());

        generateAppointmentTable(sheet, startRow, monthAppointments);
    }

    private void generateAppointmentsMeanDurationExcel(Sheet sheet, int startRow, Double averageDuration) {
        Row row = sheet.createRow(startRow);
        row.createCell(0).setCellValue("El promedio de duración de los turnos es de: " + averageDuration + " minutos");
    }

    private void generateAppointmentsDoneExcel(Sheet sheet, int startRow, List<Appointment> takenAppointments) {
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Cantidad de turnos realizados: " + takenAppointments.size());

        generateAppointmentTable(sheet, startRow, takenAppointments);
    }

    private void generateAppointmentsDayExcel(Sheet sheet, int startRow, List<Appointment> appointmentsDay) {
        if (appointmentsDay.isEmpty()) return;
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Cantidad de turnos para el día: " + appointmentsDay.get(1).getDate() + ", Total: " + appointmentsDay.size());

        generateAppointmentTable(sheet, startRow, appointmentsDay);
    }

    private void generateAppointmentsMonthExcel(Sheet sheet, int startRow, Set<Appointment> appMonth) {
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Cantidad de turnos este mes: " + appMonth.size());

        generateAppointmentTable(sheet, startRow, new ArrayList<>(appMonth));
    }

    private void generatePatientMoreAppointmentsMonthExcel(Sheet sheet, int startRow, ArrayList<Object> patientMonth) {
        String month = (String) patientMonth.get(2);
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Paciente con " + patientMonth.get(1) + " turnos asignados en el mes " + month);

        Patient patient = (Patient) patientMonth.get(0);
        Row header = sheet.createRow(startRow++);
        header.createCell(0).setCellValue("Nombre");
        header.createCell(1).setCellValue("Apellido");
        header.createCell(2).setCellValue("Teléfono");
        header.createCell(3).setCellValue("Email");

        Row patientRow = sheet.createRow(startRow);
        patientRow.createCell(0).setCellValue(patient.getFirstName());
        patientRow.createCell(1).setCellValue(patient.getLastName());
        patientRow.createCell(2).setCellValue(patient.getPhoneNumber());
        patientRow.createCell(3).setCellValue(patient.getEmail());
    }

    private void generateTotalCancelledAppointmentsExcel(Sheet sheet, int startRow, List<Appointment> totalCancelled) {
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Cantidad de turnos cancelados: " + totalCancelled.size());

        generateAppointmentTable(sheet, startRow, totalCancelled);
    }

    private void generatePatientMoreAppointmentsExcel(Sheet sheet, int startRow, Patient patient) {
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Paciente con " + patient.getAppointment().size() + " turnos asignados.");

        Row header = sheet.createRow(startRow++);
        header.createCell(0).setCellValue("Nombre");
        header.createCell(1).setCellValue("Apellido");
        header.createCell(2).setCellValue("Teléfono");
        header.createCell(3).setCellValue("Email");

        Row data = sheet.createRow(startRow);
        data.createCell(0).setCellValue(patient.getFirstName());
        data.createCell(1).setCellValue(patient.getLastName());
        data.createCell(2).setCellValue(patient.getPhoneNumber());
        data.createCell(3).setCellValue(patient.getEmail());
    }

    private void generateTotalPatientsExcel(Sheet sheet, int startRow, List<Patient> patients) {
        Row row = sheet.createRow(startRow++);
        row.createCell(0).setCellValue("Total de Pacientes Registrados: " + patients.size());

        Row header = sheet.createRow(startRow++);
        header.createCell(0).setCellValue("Nombre");
        header.createCell(1).setCellValue("Apellido");
        header.createCell(2).setCellValue("Teléfono");

        for (Patient patient : patients) {
            Row data = sheet.createRow(startRow++);
            data.createCell(0).setCellValue(patient.getFirstName());
            data.createCell(1).setCellValue(patient.getLastName());
            data.createCell(2).setCellValue(patient.getPhoneNumber());
        }
    }

    private void generateAppointmentTable(Sheet sheet, int startRow, List<Appointment> appointments) {
        Row header = sheet.createRow(startRow++);
        header.createCell(0).setCellValue("Nombre y Apellido");
        header.createCell(1).setCellValue("Teléfono");
        header.createCell(2).setCellValue("Email");
        header.createCell(3).setCellValue("Fecha");
        header.createCell(4).setCellValue("Hora");

        for (Appointment a : appointments) {
            Row row = sheet.createRow(startRow++);
            row.createCell(0).setCellValue(a.getPatient().getFirstName() + " " + a.getPatient().getLastName());
            row.createCell(1).setCellValue(a.getPatient().getPhoneNumber());
            row.createCell(2).setCellValue(a.getPatient().getEmail());
            row.createCell(3).setCellValue(a.getDate().toLocalDate().toString());
            row.createCell(4).setCellValue(a.getDate().toLocalTime().toString());
        }
    }

    private String formatReportTypeName(ReportType type) {
        return type.name().replace("_", " ").toLowerCase();
    }
}
