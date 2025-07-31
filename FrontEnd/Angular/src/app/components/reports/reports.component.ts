import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { CalendarComponent } from "../calendar/calendar.component";
import { ReportMetaDataDto } from '../../interfaces/ReportMetaDataDto';
import { ReportRequestDateDto } from '../../interfaces/ReportRequestDateDto';
import { ReportResponseDto } from '../../interfaces/ReportResponseDto';
import { ReportService } from '../../services/report.service';
import { PaginatorComponent } from "../paginator/paginator.component";

// Enum con la lista corregida de tipos de reporte.
export enum ReportType {
  PACIENTES_TOTAL = 'PACIENTES_TOTAL',
  PACIENTE_MAS_TURNOS = 'PACIENTE_MAS_TURNOS',
  PACIENTE_MAS_TURNOS_MES = 'PACIENTE_MAS_TURNOS_MES',
  CANT_TURNOS_MES = 'CANT_TURNOS_MES',

  TURNOS_DIA_DADO = 'TURNOS_DIA_DADO',
  TURNOS_CANCELADOS_TOTAL = 'TURNOS_CANCELADOS_TOTAL',
  TURNOS_REALIZADOS_TOTAL = 'TURNOS_REALIZADOS_TOTAL',
  PROMEDIO_DURACION_TURNOS = 'PROMEDIO_DURACION_TURNOS',

  TURNOS_MES_ACTUAL = 'TURNOS_MES_ACTUAL',
  TURNOS_RANGO_FECHAS = 'TURNOS_RANGO_FECHAS',
  DIA_MAYOR_CANT_TURNOS = 'DIA_MAYOR_CANT_TURNOS',
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
    CalendarComponent,
    PaginatorComponent
],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {

  StringToEnum(arg0: string): ReportFormat {
    if (arg0 === ReportFormat.PDF) {
      return ReportFormat.PDF;
    } else if (arg0 === ReportFormat.EXCEL) {
      return ReportFormat.EXCEL;
    } else {
      throw new Error(`Invalid ReportFormat: ${arg0}`);
    }
  }

  // Signals para el estado del componente
  loading = signal(false);
  allReports = signal<ReportMetaDataDto[]>([]);
  notification = signal<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  // --- LÓGICA DE PAGINACIÓN ---
  currentPage = signal(1);
  itemsPerPage = signal(5);

  totalPages = computed(() =>
    Math.ceil(this.allReports().length / this.itemsPerPage())
  );

  paginatedReports = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.allReports().slice(start, end);
  });
  // --- FIN LÓGICA DE PAGINACIÓN ---

  // Enums para usar en la plantilla
  ReportType = ReportType;
  ReportFormat = ReportFormat;

  // Signals para la expansión de categorías (UI)
  isPatientsExpanded = signal(true);
  isAppointmentsExpanded = signal(true);
  isDatesExpanded = signal(true);

  // Signals para el modal de parámetros
  showReportParamsModal = signal(false);
  currentReportType = signal<ReportType | null>(null);
  currentReportFormat = signal<ReportFormat | null>(null);
  modalParamStartDate = signal<Date | null>(null);
  modalParamEndDate = signal<Date | null>(null);

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.fetchReports();
  }

  /**
   * Obtiene la lista de reportes del backend y actualiza la signal.
   */
  fetchReports(): void {
    this.loading.set(true);
    this.reportService.getAllReportMetadata().subscribe({
      next: (reports) => {
        this.allReports.set(reports);
        this.loading.set(false);
        // Resetea la página actual a 1 cada vez que se cargan nuevos reportes
        this.currentPage.set(1);
      },
      error: (err) => {
        this.showNotification('error', 'Error al cargar la lista de reportes.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  /**
   * Maneja el evento de cambio de página del componente paginador.
   * @param newPage El número de la nueva página.
   */
  onPageChange(newPage: number) {
    this.currentPage.set(newPage);
  }

  /**
   * Alterna el estado de expansión de una categoría.
   */
  toggleCategory(category: 'patients' | 'appointments' | 'dates'): void {
    if (category === 'patients') {
      this.isPatientsExpanded.update((val) => !val);
    } else if (category === 'appointments') {
      this.isAppointmentsExpanded.update((val) => !val);
    } else {
      this.isDatesExpanded.update((val) => !val);
    }
  }

  /**
   * Determina qué parámetros son necesarios para un tipo de reporte.
   */
  getRequiredParams = computed(() => {
    const type = this.currentReportType();
    if (!type) return [];

    switch (type) {
      case ReportType.PACIENTES_TOTAL:
        return [];
      case ReportType.PACIENTE_MAS_TURNOS:
        return [];
      case ReportType.CANT_TURNOS_MES: 
        return ['singleDate']; 
      case ReportType.TURNOS_CANCELADOS_TOTAL:
        return [];
      case ReportType.TURNOS_REALIZADOS_TOTAL:
        return [];
      case ReportType.PROMEDIO_DURACION_TURNOS:
        return [];
      case ReportType.PACIENTE_MAS_TURNOS_MES:
      case ReportType.TURNOS_DIA_DADO:
        return ['singleDate'];
      case ReportType.TURNOS_MES_ACTUAL:
        return [];
      case ReportType.DIA_MAYOR_CANT_TURNOS:
        return [];
      case ReportType.TURNOS_RANGO_FECHAS:
        return ['startDate', 'endDate'];
      default:
        return [];
    }
  });

  /**
   * Verifica si los parámetros requeridos para el reporte son válidos.
   */
  isFormValid = computed(() => {
    const requiredParams = this.getRequiredParams();

    if (requiredParams.length === 0) return true;

    if (requiredParams.includes('singleDate')) {
      if (this.modalParamStartDate() === null) return false;
    }

    if (requiredParams.includes('startDate')) {
      if (this.modalParamStartDate() === null) return false;
    }
    if (requiredParams.includes('endDate')) {
      if (this.modalParamEndDate() === null) return false;
    }

    const startDate = this.modalParamStartDate();
    const endDate = this.modalParamEndDate();
    if (startDate && endDate && endDate < startDate) {
      return false;
    }

    return true;
  });

  /**
   * Abre el modal de parámetros para generar un reporte.
   */
  openReportParamsModal(type: ReportType, format: ReportFormat): void {
    this.currentReportType.set(type);
    this.currentReportFormat.set(format);
    this.modalParamStartDate.set(null);
    this.modalParamEndDate.set(null);

    if (this.getRequiredParams().includes('singleDate')) {
      this.modalParamStartDate.set(new Date());
    }

    this.showReportParamsModal.set(true);
  }

  /**
   * Maneja la selección de fechas en el modal.
   */
  onModalDateSelected(date: Date, paramName: 'startDate' | 'endDate'): void {
    if (paramName === 'startDate') {
      this.modalParamStartDate.set(date);
    } else if (paramName === 'endDate') {
      this.modalParamEndDate.set(date);
    }
  }

  /**
   * Cierra el modal de parámetros.
   */
  closeReportParamsModal(): void {
    this.showReportParamsModal.set(false);
    this.currentReportType.set(null);
    this.currentReportFormat.set(null);
    this.clearNotification();
  }

  /**
   * Confirma la generación del reporte, recolectando los parámetros.
   */
  confirmGenerateReport(): void {
    if (!this.isFormValid()) {
      this.showNotification('error', 'Por favor, complete todos los parámetros requeridos.');
      return;
    }

    const reportType = this.currentReportType();
    const reportFormat = this.currentReportFormat();

    if (!reportType || !reportFormat) {
      this.showNotification('error', 'No se pudo determinar el tipo o formato del reporte. Por favor, intente de nuevo.');
      this.closeReportParamsModal();
      return;
    }

    this.loading.set(true);
    this.showNotification('info', `Generando reporte...`);

    const request: ReportRequestDateDto = {
      reportType: reportType,
      reportFormat: reportFormat,
      professionalId: 1, // Placeholder
    };

    const startDate = this.modalParamStartDate()?.toISOString().split('T')[0];
    const endDate = this.modalParamEndDate()?.toISOString().split('T')[0];
    const requiredParams = this.getRequiredParams();

    if (requiredParams.includes('singleDate') && startDate) {
      request.startDate = startDate;
    } else if (requiredParams.includes('startDate') && startDate && endDate) {
      request.startDate = startDate;
      request.endDate = endDate;
    }

    this.reportService.generateReport(request).subscribe({
      next: (response: ReportResponseDto) => {
        this.showNotification('success', response.message);
        console.log(`Reporte generado con éxito. Intentando descargar el archivo con ID: ${response.reportId}`);
        this.downloadReport(response.reportId, reportFormat);
        this.closeReportParamsModal();
        this.fetchReports();
      },
      error: (err) => {
        this.showNotification('error', `Error al generar el reporte: ${err.error?.message || 'Error desconocido'}`);
        this.loading.set(false);
        console.error(err);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  /**
   * Inicia la descarga de un reporte.
   */
  downloadReport(reportId: number, format: ReportFormat): void {
    this.showNotification('info', 'Iniciando descarga...');
    this.reportService.downloadReport(reportId).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const fileURL = URL.createObjectURL(blob);
        a.href = fileURL;
        a.download = `reporte-${reportId}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fileURL);
        this.showNotification('success', 'Reporte descargado exitosamente.');
      },
      error: (err) => {
        this.showNotification('error', 'Error al descargar el reporte.');
        console.error(err);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  /**
   * Muestra una notificación temporal.
   */
  showNotification(tipo: 'success' | 'error' | 'info', mensaje: string): void {
    this.notification.set({ tipo, mensaje });
    setTimeout(() => this.notification.set(null), 3000);
  }

  /**
   * Limpia la notificación actual.
   */
  clearNotification(): void {
    this.notification.set(null);
  }
}

