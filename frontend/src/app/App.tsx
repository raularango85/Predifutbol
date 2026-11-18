import React, { useState, useEffect } from 'react';
import { useStudio } from '../features/studio/hooks/useStudio';
import { usePredictions } from '../features/predictions/hooks/usePredictions';
import { CardPreview } from '../features/studio/components/CardPreview';
import { CardEditor } from '../features/studio/components/CardEditor';
import { PredictionTable } from '../features/predictions/components/PredictionTable';
import { TikTokModal } from '../features/tiktok/components/TikTokModal';
import { RenderCanvas } from '../features/studio/components/RenderCanvas';
import { useExport } from '../features/export/hooks/useExport';
import { ExportModal } from '../features/export/components/ExportModal';
import { studioApi } from '../features/studio/api';
import type { EngineStatus } from '../features/studio/types';
import type { Prediction } from '../features/predictions/types';
import { Sparkles, History, ShieldCheck, Globe, Film, Image as ImageIcon, Hash } from 'lucide-react';
import { Button } from '../components/Button';

export const App: React.FC = () => {
  // If rendering canvas headlessly for video/PNG capture
  if (window.location.pathname === '/render-canvas' || window.location.search.includes('render=1')) {
    return <RenderCanvas />;
  }

  const [activeTab, setActiveTab] = useState<'studio' | 'predictions' | 'audio'>('studio');
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [tiktokTarget, setTiktokTarget] = useState<Prediction | null>(null);

  const {
    card,
    types,
    saving,
    saveSuccess,
    teamResults,
    leagueResults,
    searchingTeams,
    searchingLeagues,
    updateCard,
    loadPredictionIntoStudio,
    searchTeams,
    searchLeagues,
    saveCard,
  } = useStudio();

  const {
    predictions,
    total,
    totalPages,
    page,
    search,
    loading: loadingPredictions,
    checkingAll,
    checkSummary,
    summaryModalOpen,
    setPage,
    setSearch,
    deletePrediction,
    settlePrediction,
    checkAllPredictions,
    closeSummaryModal,
  } = usePredictions();

  const { job, exporting, modalOpen, startExport, closeModal } = useExport();

  useEffect(() => {
    studioApi.getStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/public/logo_big_512_512.png" alt="PrediFutbol" className="w-9 h-9 object-contain drop-shadow" />
            <div>
              <span className="font-bebas text-2xl tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                PREDIFUTBOL
              </span>
              <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
                STUDIO v3
              </span>
            </div>
          </div>

          {/* Center Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Studio 9:16
            </button>
            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'predictions'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Historial ({total})
            </button>
          </nav>

          {/* Right Status & Lang */}
          <div className="flex items-center gap-3">
            {status && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Go Engine • {status.db_mode}
              </div>
            )}

            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Card Editor Form */}
            <div className="lg:col-span-7">
              <CardEditor
                card={card}
                types={types}
                saving={saving}
                saveSuccess={saveSuccess}
                teamResults={teamResults}
                leagueResults={leagueResults}
                searchingTeams={searchingTeams}
                searchingLeagues={searchingLeagues}
                onUpdate={updateCard}
                onSearchTeams={searchTeams}
                onSearchLeagues={searchLeagues}
                onSave={saveCard}
              />
            </div>

            {/* Right: 9:16 Canvas Live Mobile Preview */}
            <div className="lg:col-span-5 flex flex-col items-center sticky top-24">
              <div className="text-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Previsualización Vertical 9:16
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Renderizado reactivo en tiempo real idéntico al video HD
                </p>
              </div>

              <CardPreview card={card} lang={lang} />

              {/* Action Export Buttons */}
              <div className="flex flex-col w-full max-w-[340px] gap-2.5 mt-4">
                <Button
                  variant="emerald"
                  size="md"
                  className="w-full justify-center shadow-emerald-500/25"
                  icon={<Film className="w-4 h-4" />}
                  onClick={() => startExport({ cardData: card, format: 'video', langs: [lang] })}
                >
                  Exportar Video HD (MP4 9:16)
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full justify-center"
                  icon={<ImageIcon className="w-4 h-4" />}
                  onClick={() => startExport({ cardData: card, format: 'png', langs: [lang] })}
                >
                  Exportar Imagen (PNG 1080x1920)
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full justify-center text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/10 font-bold"
                  icon={<Hash className="w-4 h-4 text-cyan-400" />}
                  onClick={() => setTiktokTarget(card as unknown as Prediction)}
                >
                  Ver y Copiar Copy & Tags para TikTok
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <PredictionTable
            predictions={predictions}
            total={total}
            totalPages={totalPages}
            page={page}
            search={search}
            loading={loadingPredictions}
            checkingAll={checkingAll}
            checkSummary={checkSummary}
            summaryModalOpen={summaryModalOpen}
            onPageChange={setPage}
            onSearchChange={setSearch}
            onSelect={(pred) => {
              loadPredictionIntoStudio(pred);
              setActiveTab('studio');
            }}
            onDelete={deletePrediction}
            onSettle={settlePrediction}
            onOpenTikTok={setTiktokTarget}
            onCheckAll={checkAllPredictions}
            onCloseSummaryModal={closeSummaryModal}
          />
        )}
      </main>

      {/* TikTok Copy Modal */}
      {tiktokTarget && (
        <TikTokModal
          prediction={tiktokTarget}
          onClose={() => setTiktokTarget(null)}
        />
      )}

      {/* Export Progress Modal */}
      <ExportModal
        job={job}
        exporting={exporting}
        isOpen={modalOpen}
        onClose={closeModal}
        onOpenTikTok={() => setTiktokTarget(card as unknown as Prediction)}
      />
    </div>
  );
};
