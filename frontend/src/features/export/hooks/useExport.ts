import { useState, useCallback, useRef, useEffect } from 'react';
import { exportApi } from '../api';
import type { ExportJob, StartExportRequest } from '../types';

export function useExport() {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJob = useCallback((jobId: string) => {
    stopPolling();
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await exportApi.getJob(jobId);
        if (res.success && res.job) {
          setJob(res.job);
          if (res.job.status === 'done' || res.job.status === 'error') {
            stopPolling();
            setExporting(false);
          }
        }
      } catch {
        stopPolling();
        setExporting(false);
      }
    }, 600);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startExport = useCallback(async (req: StartExportRequest) => {
    setExporting(true);
    setModalOpen(true);
    setJob({
      id: '',
      format: req.format,
      status: 'queued',
      percent: 1,
      stage: 'Iniciando motor de exportación...',
      frame: 0,
      total_frames: req.format === 'video' ? 450 : 0,
      elapsed_sec: 0,
      files: [],
    });

    try {
      const res = await exportApi.startExport(req);
      if (res.success && res.jobId) {
        pollJob(res.jobId);
      } else {
        setJob(prev => prev ? { ...prev, status: 'error', error: 'No se pudo iniciar la exportación' } : null);
        setExporting(false);
      }
    } catch (err) {
      setJob(prev => prev ? { ...prev, status: 'error', error: err instanceof Error ? err.message : 'Error desconocido' } : null);
      setExporting(false);
    }
  }, [pollJob]);

  const closeModal = useCallback(() => {
    if (!exporting) {
      setModalOpen(false);
      setJob(null);
    }
  }, [exporting]);

  return {
    job,
    exporting,
    modalOpen,
    startExport,
    closeModal,
  };
}
