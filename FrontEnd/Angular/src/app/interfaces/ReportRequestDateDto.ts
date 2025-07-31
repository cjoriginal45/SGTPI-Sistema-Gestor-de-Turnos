export interface ReportRequestDateDto {
    reportType: string;
    reportFormat: 'PDF' | 'EXCEL';
    professionalId: number;
    startDate?: string;
    endDate?: string;
  }