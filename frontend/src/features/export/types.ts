import type { CardState } from '../studio/types';

export interface StartExportRequest {
  cardData: CardState;
  format: 'png' | 'video';
  langs: ('es' | 'en')[];
}

export interface ExportFile {
  lang: string;
  format: string;
  file_name: string;
  url: string;
}

export interface ExportJob {
  id: string;
  format: 'png' | 'video';
  status: 'queued' | 'running' | 'done' | 'error';
  percent: number;
  stage: string;
  frame: number;
  total_frames: number;
  eta_sec?: number | null;
  elapsed_sec: number;
  files: ExportFile[];
  error?: string;
}
