import React from 'react';
import type { ExportJob } from '../types';
import { Button } from '../../../components/Button';
import { Film, Image as ImageIcon, Download, CheckCircle, AlertCircle, X, Hash } from 'lucide-react';

interface ExportModalProps {
  job: ExportJob | null;
  exporting: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenTikTok?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  job,
  exporting,
  isOpen,
  onClose,
  onOpenTikTok,
}) => {
  if (!isOpen || !job) return null;

  const isVideo = job.format === 'video';
  const isDone = job.status === 'done';
  const isError = job.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {isVideo ? (
              <Film className="w-5 h-5 text-emerald-400" />
            ) : (
              <ImageIcon className="w-5 h-5 text-cyan-400" />
            )}
            <h3 className="text-base font-black text-white">
              {isVideo ? 'Exportando Video HD 1080x1920' : 'Generando Snapshot PNG'}
            </h3>
          </div>
          {!exporting && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress or Status */}
        <div className="flex flex-col items-center text-center py-2 space-y-3">
          {isDone ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
          ) : isError ? (
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="animate-spin h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}

          <div>
            <h4 className="text-sm font-black text-white">{job.stage}</h4>
            {job.total_frames > 0 && !isDone && !isError && (
              <p className="text-xs text-slate-400 mt-1">
                Fotograma {job.frame} de {job.total_frames}
                {job.eta_sec != null && job.eta_sec > 0 && (
                  <span className="text-emerald-400 ml-1.5 font-bold">
                    (~{job.eta_sec}s restantes)
                  </span>
                )}
              </p>
            )}
            {isError && (
              <p className="text-xs text-rose-400 mt-1 max-w-xs">{job.error}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Progreso</span>
              <span className="text-emerald-400">{job.percent}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(2, job.percent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Generated Files List */}
        {isDone && job.files.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Archivos Listos para Descarga
            </span>
            {job.files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                    {f.lang}
                  </span>
                  <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                    {f.file_name}
                  </span>
                </div>
                <a
                  href={f.url}
                  download={f.file_name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {isDone && onOpenTikTok ? (
            <Button
              variant="secondary"
              size="sm"
              className="text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/10 font-bold"
              icon={<Hash className="w-4 h-4 text-cyan-400" />}
              onClick={() => {
                onClose();
                onOpenTikTok();
              }}
            >
              Ver Copy & Tags TikTok
            </Button>
          ) : <div />}
          <Button
            variant={isDone ? 'emerald' : 'secondary'}
            size="sm"
            disabled={exporting}
            onClick={onClose}
          >
            {isDone ? 'Cerrar y Continuar' : isError ? 'Cerrar' : 'Procesando...'}
          </Button>
        </div>
      </div>
    </div>
  );
};
