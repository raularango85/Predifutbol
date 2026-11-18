import React from 'react';
import type { CheckAllResult } from '../types';
import { CheckCircle2, X, Clock, Check, TrendingUp } from 'lucide-react';

interface CheckerSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CheckAllResult | null;
}

export const CheckerSummaryModal: React.FC<CheckerSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative z-10 bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl p-5 sm:p-6 max-w-2xl w-full my-auto max-h-[92vh] flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bebas text-2xl tracking-wide text-white">
                REVISIÓN DE PREDICCIONES
              </h2>
              <p className="text-xs text-slate-400">
                Verificación automática contra API-Football y reglas de mercado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <div className="font-mono font-bold text-lg text-white">
              {summary.total_pending}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Revisadas
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30 text-center">
            <div className="font-mono font-bold text-lg text-emerald-400">
              {summary.won}
            </div>
            <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold">
              Acertadas
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-500/30 text-center">
            <div className="font-mono font-bold text-lg text-rose-400">
              {summary.lost}
            </div>
            <div className="text-[10px] text-rose-400/80 uppercase tracking-wider font-semibold">
              Falladas
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30 text-center">
            <div className="font-mono font-bold text-lg text-amber-400">
              {summary.still_pending}
            </div>
            <div className="text-[10px] text-amber-400/80 uppercase tracking-wider font-semibold">
              Pendientes
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-cyan-500/30 text-center col-span-2 sm:col-span-1">
            <div className="font-mono font-bold text-lg text-cyan-400 flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {summary.win_rate}%
            </div>
            <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider font-semibold">
              % Acierto
            </div>
          </div>
        </div>

        {/* Detail Results List */}
        <div className="overflow-y-auto pr-1 space-y-2 flex-1 text-xs max-h-72 divide-y divide-slate-800/80">
          {summary.results.length === 0 ? (
            <p className="text-slate-500 text-center py-6">
              No había predicciones pendientes por revisar.
            </p>
          ) : (
            summary.results.map((r) => (
              <div
                key={r.id}
                className="py-2.5 flex items-center justify-between gap-3 group"
              >
                <div className="truncate flex-1">
                  <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                    <span>
                      {r.home_name} vs {r.away_name}
                    </span>
                    {r.score && (
                      <span className="text-emerald-400 font-mono text-[11px] px-1.5 py-0.2 bg-emerald-950/60 rounded border border-emerald-500/30">
                        {r.score}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    Pick: <strong className="text-slate-200">{r.pick}</strong>
                    {r.source ? (
                      <span className="text-emerald-400/80 ml-1.5">
                        • {r.source}
                      </span>
                    ) : r.reason ? (
                      <span className="text-amber-400/80 ml-1.5">
                        • {r.reason}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0">
                  {r.was_right === 1 ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Acertada
                    </span>
                  ) : r.was_right === 0 ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <X className="w-3 h-3" /> Fallada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500 font-mono">
            PrediFutbol • Motor de Liquidación Automática
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
