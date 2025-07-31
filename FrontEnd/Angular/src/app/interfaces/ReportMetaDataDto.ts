export interface ReportMetaDataDto {
    id: number;
    type: string;
    date: string;
    format: 'PDF' | 'EXCEL';
    professionalEmail: string;
    downloadUrl: string;
  }