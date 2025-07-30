import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { ProfessionalService } from '../../services/professional.service';
import { CalendarComponent } from "../calendar/calendar.component";


export enum ReportType {
  PACIENTES_TOTAL = 'PACIENTES_TOTAL',
  PACIENTE_MAS_TURNOS = 'PACIENTE_MAS_TURNOS',
  PACIENTE_MAS_CANCELACIONES = 'PACIENTE_MAS_CANCELACIONES',
  PACIENTE_MAS_TURNOS_MES = 'PACIENTE_MAS_TURNOS_MES',
  NUEVOS_PACIENTES_MES = 'NUEVOS_PACIENTES_MES', // Custom

  CANT_TURNOS_MES = 'CANT_TURNOS_MES',
  TURNOS_DIA_DADO = 'TURNOS_DIA_DADO',
  TURNOS_CANCELADOS_TOTAL = 'TURNOS_CANCELADOS_TOTAL', // Custom
  TURNOS_REALIZADOS_TOTAL = 'TURNOS_REALIZADOS_TOTAL', // Custom
  PROMEDIO_DURACION_TURNOS = 'PROMEDIO_DURACION_TURNOS', // Custom

  TURNOS_MES_ACTUAL = 'TURNOS_MES_ACTUAL', // Custom
  TURNOS_RANGO_FECHAS = 'TURNOS_RANGO_FECHAS',
  DIA_MAYOR_CANT_TURNOS = 'DIA_MAYOR_CANT_TURNOS',
  TURNOS_POR_ESTADO_MES = 'TURNOS_POR_ESTADO_MES', // Custom
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL'
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    CalendarComponent
],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {

  private professionalService = inject(ProfessionalService);

  loading = signal(false);
  notification = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  ReportType = ReportType;
  ReportFormat = ReportFormat;

  // Signals for report categories expansion
  isPatientsExpanded = signal(true); // Start expanded by default
  isAppointmentsExpanded = signal(true); // Start expanded by default
  isDatesExpanded = signal(true); // Start expanded by default

  // Signals for report parameters modal
  showReportParamsModal = signal(false);
  currentReportType = signal<ReportType | null>(null);
  currentReportFormat = signal<ReportFormat | null>(null);

  // Parameters for reports
  modalParamStartDate = signal<Date | null>(null);
  modalParamEndDate = signal<Date | null>(null);
  modalParamMonth = signal<number | null>(null);
  modalParamYear = signal<number | null>(null);

  constructor() { }

  ngOnInit(): void {
    const today = new Date();
    this.modalParamMonth.set(today.getMonth() + 1);
    this.modalParamYear.set(today.getFullYear());
  }

  /**
   * Toggles the expansion state of a report category.
   * @param category The category to toggle ('patients', 'appointments', 'dates').
   */
  toggleCategory(category: 'patients' | 'appointments' | 'dates'): void {
    if (category === 'patients') {
      this.isPatientsExpanded.update(val => !val);
    } else if (category === 'appointments') {
      this.isAppointmentsExpanded.update(val => !val);
    } else if (category === 'dates') {
      this.isDatesExpanded.update(val => !val);
    }
  }

  /**
   * Determines which parameters are required for a given report type.
   */
  getRequiredParams = computed(() => {
    const type = this.currentReportType();
    if (!type) return [];

    switch (type) {
      case ReportType.PACIENTE_MAS_TURNOS:
      case ReportType.PACIENTE_MAS_CANCELACIONES:
      case ReportType.NUEVOS_PACIENTES_MES:
      case ReportType.CANT_TURNOS_MES:
      case ReportType.DIA_MAYOR_CANT_TURNOS:
      case ReportType.TURNOS_POR_ESTADO_MES:
      case ReportType.TURNOS_DIA_DADO:
        return ['singleDate'];
      case ReportType.TURNOS_RANGO_FECHAS:
        return ['startDate', 'endDate'];
      default:
        return []; // No parameters needed
    }
  });

  /**
   * Checks if all required parameters for the current report type are valid.
   */
  isFormValid = computed(() => {
    const requiredParams = this.getRequiredParams();

    // Check for month and year
    if (requiredParams.includes('month')) {
      const month = this.modalParamMonth();
      if (month === null || month < 1 || month > 12) return false;
    }
    if (requiredParams.includes('year')) {
      const year = this.modalParamYear();
      if (year === null || year < 1900 || year > 2100) return false;
    }

    // Check for singleDate
    if (requiredParams.includes('singleDate')) {
      if (this.modalParamStartDate() === null) return false;
    }

    // Check for startDate and endDate
    if (requiredParams.includes('startDate')) {
      if (this.modalParamStartDate() === null) return false;
    }
    if (requiredParams.includes('endDate')) {
      if (this.modalParamEndDate() === null) return false;
    }

    // Additional validation for date range: endDate must be after startDate
    const startDate = this.modalParamStartDate();
    const endDate = this.modalParamEndDate();
    if (startDate && endDate && endDate < startDate) {
      return false;
    }

    return true;
  });

  /**
   * Opens the report parameters modal.
   * @param type The type of report to generate.
   * @param format The desired format (PDF, EXCEL).
   */
  openReportParamsModal(type: ReportType, format: ReportFormat): void {
    this.currentReportType.set(type);
    this.currentReportFormat.set(format);

    // Reset parameters for the new report type
    this.modalParamStartDate.set(null);
    this.modalParamEndDate.set(null);
    const today = new Date();
    this.modalParamMonth.set(today.getMonth() + 1); // Month is 0-indexed
    this.modalParamYear.set(today.getFullYear());

    // If it's a single date report, pre-fill with today's date
    if (this.getRequiredParams().includes('singleDate')) {
      this.modalParamStartDate.set(today);
    }

    this.showReportParamsModal.set(true);
    console.log(`[ReportsComponent] Abriendo modal de parámetros para: ${type} (${format})`);
  }

  /**
   * Handles date selection from the calendar component within the modal.
   * @param date The selected date.
   * @param paramName 'startDate' or 'endDate' or 'singleDate'
   */
  onModalDateSelected(date: Date, paramName: 'startDate' | 'endDate' | 'singleDate'): void {
    if (paramName === 'startDate') {
      this.modalParamStartDate.set(date);
    } else if (paramName === 'endDate') {
      this.modalParamEndDate.set(date);
    } else if (paramName === 'singleDate') {
      this.modalParamStartDate.set(date); // Reusing startDate for singleDate
    }
    console.log(`[ReportsComponent] Fecha seleccionada en modal (${paramName}):`, date);
  }

  /**
   * Closes the report parameters modal.
   */
  closeReportParamsModal(): void {
    this.showReportParamsModal.set(false);
    this.currentReportType.set(null);
    this.currentReportFormat.set(null);
    this.clearNotification();
    console.log('[ReportsComponent] Modal de parámetros cerrado.');
  }

  /**
   * Confirms report generation from the modal, collecting parameters.
   */
  async confirmGenerateReport(): Promise<void> {
    if (!this.isFormValid()) {
      this.showNotification('error', 'Por favor, complete todos los parámetros requeridos.');
      return;
    }

    this.loading.set(true);
    this.showNotification('info', `Generando reporte "${this.currentReportType()}" en formato ${this.currentReportFormat()}...`);
    console.log(`[ReportsComponent] Confirmando generación de reporte: Tipo=${this.currentReportType()}, Formato=${this.currentReportFormat()}`);

    const reportType = this.currentReportType()!;
    const reportFormat = this.currentReportFormat()!;
    let params: any = {};

    const required = this.getRequiredParams();
    if (required.includes('month')) params.month = this.modalParamMonth();
    if (required.includes('year')) params.year = this.modalParamYear();
    if (required.includes('singleDate')) params.date = this.modalParamStartDate()?.toISOString().split('T')[0]; // YYYY-MM-DD
    if (required.includes('startDate')) params.startDate = this.modalParamStartDate()?.toISOString().split('T')[0];
    if (required.includes('endDate')) params.endDate = this.modalParamEndDate()?.toISOString().split('T')[0];

    console.log('[ReportsComponent] Parámetros para el reporte:', params);

    try {
      // Here you would call your backend API with type, format, and params
      // Example: await this.professionalService.generateReport(reportType, reportFormat, params);
      // Simulate API call and download
      await new Promise(resolve => setTimeout(resolve, 2000));

      const simulatedDownloadUrl = `https://example.com/reports/${reportType}.${reportFormat.toLowerCase()}?${new URLSearchParams(params).toString()}`;
      window.open(simulatedDownloadUrl, '_blank');

      this.showNotification('success', `Reporte "${reportType}" (${reportFormat}) generado exitosamente.`);
      this.closeReportParamsModal();
      console.log(`[ReportsComponent] Reporte "${reportType}" (${reportFormat}) generado y descarga iniciada.`);

    } catch (error) {
      console.error(`[ReportsComponent] Error al generar reporte "${reportType}" (${reportFormat}):`, error);
      this.showNotification('error', `Error al generar el reporte "${reportType}".`);
    } finally {
      this.loading.set(false);
    }
  }

  showNotification(tipo: 'success' | 'error' | 'info', mensaje: string): void {
    this.notification.set({ tipo, mensaje });
    setTimeout(() => this.notification.set(null), 3000);
  }

  clearNotification(): void {
    this.notification.set(null);
  }
}
