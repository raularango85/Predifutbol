import React, { useState } from 'react';
import type { Prediction, CheckAllResult } from '../types';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { CheckerSummaryModal } from './CheckerSummaryModal';
import { Search, Trash2, Edit3, CheckCircle2, Share2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface PredictionTableProps {
  predictions: Prediction[];
  total: number;
  totalPages: number;
  page: number;
  search: string;
  loading: boolean;
  checkingAll?: boolean;
  checkSummary?: CheckAllResult | null;
  summaryModalOpen?: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onSelect: (pred: Prediction) => void;
  onDelete: (id: number) => void;
  onSettle: (id: number, homeGoals: number, awayGoals: number) => void;
  onOpenTikTok: (pred: Prediction) => void;
  onCheckAll?: () => void;
  onCloseSummaryModal?: () => void;
}

export const PredictionTable: React.FC<PredictionTableProps> = ({
  predictions,
  total,
  totalPages,
  page,
  search,
  loading,
  checkingAll = false,
  checkSummary = null,
  summaryModalOpen = false,
  onPageChange,
  onSearchChange,
  onSelect,
  onDelete,
  onSettle,
  onOpenTikTok,
  onCheckAll,
  onCloseSummaryModal,
}) => {
  const [settleTarget, setSettleTarget] = useState<Prediction | null>(null);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
      {/* Table Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Historial de Predicciones ({total})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestiona, carga al editor o verifica los resultados reales de tus pronósticos
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {onCheckAll && (
            <Button
              variant="emerald"
              size="sm"
              loading={checkingAll}
              onClick={onCheckAll}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${checkingAll ? 'animate-spin' : ''}`} />}
              title="Verificar resultados con API-Football (Equivalente al Cron de Yii2)"
            >
              Revisar Resultados (Auto)
            </Button>
          )}

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Buscar por equipo o pick..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Partido</th>
              <th className="py-3 px-4">Pronóstico</th>
              <th className="py-3 px-3 text-center">Cuota</th>
              <th className="py-3 px-3 text-center">Prob.</th>
              <th className="py-3 px-3 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Cargando predicciones...
                </td>
              </tr>
            ) : predictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No se encontraron predicciones guardadas.
                </td>
              </tr>
            ) : (
              predictions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex -space-x-1 items-center">
                        <img src={p.home_flag} alt="" className="w-5 h-5 object-contain rounded-full bg-slate-800" />
                        <img src={p.away_flag} alt="" className="w-5 h-5 object-contain rounded-full bg-slate-800" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">
                          {p.home_name} vs {p.away_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.league_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-300">
                    {p.custom_pick_es || p.custom_pick_en || p.prediction_value}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-amber-400">
                    {Number(p.odd).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold">
                    {p.probability}%
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <Badge status={p.was_right} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        title="Cargar en Studio"
                        onClick={() => onSelect(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        title="Verificar resultado"
                        onClick={() => {
                          setSettleTarget(p);
                          setHomeGoals(0);
                          setAwayGoals(0);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Copy TikTok"
                        onClick={() => onOpenTikTok(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Eliminar"
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">
              Verificar Resultado Real
            </h3>
            <p className="text-xs text-slate-400">
              Ingresa el marcador final de <b>{settleTarget.home_name} vs {settleTarget.away_name}</b>:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Goles {settleTarget.home_name}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-center font-bold text-white"
                  value={homeGoals}
                  onChange={(e) => setHomeGoals(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Goles {settleTarget.away_name}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-center font-bold text-white"
                  value={awayGoals}
                  onChange={(e) => setAwayGoals(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setSettleTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="emerald"
                size="sm"
                onClick={() => {
                  onSettle(settleTarget.id, homeGoals, awayGoals);
                  setSettleTarget(null);
                }}
              >
                Evaluar Regla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Automatic Checker Summary Modal */}
      <CheckerSummaryModal
        isOpen={summaryModalOpen}
        onClose={onCloseSummaryModal || (() => {})}
        summary={checkSummary}
      />
    </div>
  );
};
