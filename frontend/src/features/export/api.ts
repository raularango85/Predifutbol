import { request } from '../../services/apiClient';
import type { StartExportRequest, ExportJob } from './types';

export const exportApi = {
  startExport: (data: StartExportRequest) => {
    return request<{ success: boolean; jobId: string }>('/api/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getJob: (jobId: string) => {
    return request<{ success: boolean; job: ExportJob }>(`/api/export/jobs/${jobId}`);
  },
};
