import React from 'react';
import type { CardState } from '../types';
import { Shield, Sparkles } from 'lucide-react';

interface CardPreviewProps {
  card: CardState;
  lang?: 'es' | 'en';
}

export const CardPreview: React.FC<CardPreviewProps> = ({ card, lang = 'es' }) => {
  const isEs = lang === 'es';
  const pick = isEs ? (card.custom_pick_es || card.prediction_value) : (card.custom_pick_en || card.prediction_value);
  const stats = isEs ? card.stats_es : card.stats_en;

  const themeGlow = {
    emerald: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-400',
    cyan: 'from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30 text-cyan-400',
    rose: 'from-rose-500/20 via-pink-500/10 to-transparent border-rose-500/30 text-rose-400',
    violet: 'from-violet-500/20 via-purple-500/10 to-transparent border-violet-500/30 text-violet-400',
  }[card.theme] || 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-400';

  const themeBadge = {
    emerald: 'bg-emerald-500 text-slate-950',
    amber: 'bg-amber-500 text-slate-950',
    cyan: 'bg-cyan-500 text-slate-950',
    rose: 'bg-rose-500 text-white',
    violet: 'bg-violet-500 text-white',
  }[card.theme] || 'bg-emerald-500 text-slate-950';

  return (
    <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-slate-800 shadow-2xl flex flex-col justify-between p-5 text-white select-none">
      {/* Background ambient mesh */}
      <div className={`absolute inset-0 bg-gradient-to-b ${themeGlow} opacity-40 pointer-events-none`} />
      <div className="absolute top-1/4 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/public/logo_big_512_512.png" alt="PrediFutbol" className="w-7 h-7 object-contain drop-shadow" />
          <span className="font-bebas text-lg tracking-wider bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            PREDIFUTBOL
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {card.match_date_text || (isEs ? 'PRÓXIMO ENCUENTRO' : 'UPCOMING MATCH')}
        </div>
      </div>

      {/* League Pill */}
      <div className="relative z-10 text-center my-1">
        <span className="inline-block px-3 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-black tracking-widest text-slate-400 uppercase">
          {card.league_name || 'LIGA INTERNACIONAL'}
        </span>
      </div>

      {/* VS Match Showcase */}
      <div className="relative z-10 grid grid-cols-5 items-center my-2">
        {/* Home Team */}
        <div className="col-span-2 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 p-2.5 border border-slate-700/50 flex items-center justify-center shadow-lg relative group">
            {card.home_flag ? (
              <img src={card.home_flag} alt={card.home_name} className="max-w-full max-h-full object-contain drop-shadow" />
            ) : (
              <Shield className="w-8 h-8 text-slate-500" />
            )}
          </div>
          <span className="font-bebas text-base mt-1.5 leading-tight tracking-wide line-clamp-2 max-w-[100px]">
            {card.home_name || 'LOCAL'}
          </span>
        </div>

        {/* VS Badge */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          <span className="font-teko text-2xl font-bold text-slate-500 tracking-wider">VS</span>
        </div>

        {/* Away Team */}
        <div className="col-span-2 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 p-2.5 border border-slate-700/50 flex items-center justify-center shadow-lg relative group">
            {card.away_flag ? (
              <img src={card.away_flag} alt={card.away_name} className="max-w-full max-h-full object-contain drop-shadow" />
            ) : (
              <Shield className="w-8 h-8 text-slate-500" />
            )}
          </div>
          <span className="font-bebas text-base mt-1.5 leading-tight tracking-wide line-clamp-2 max-w-[100px]">
            {card.away_name || 'VISITANTE'}
          </span>
        </div>
      </div>

      {/* Stadium indicator */}
      {card.stadium && (
        <div className="relative z-10 text-center -mt-1 mb-2">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
            📍 {card.stadium}
          </span>
        </div>
      )}

      {/* Top Value Pick Showcase Box */}
      <div className="relative z-10 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-3 shadow-xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {isEs ? 'PRONÓSTICO DE VALOR' : 'TOP VALUE PICK'}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${themeBadge}`}>
            CUOTA {Number(card.odd || 1.75).toFixed(2)}
          </span>
        </div>

        <div className="font-bebas text-xl text-center my-1 tracking-wide text-white drop-shadow">
          {pick || (isEs ? 'Victoria Local' : 'Home Win')}
        </div>

        {/* Probability & Confidence bar */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px]">
          <div>
            <div className="flex justify-between text-slate-400 font-bold mb-1">
              <span>{isEs ? 'PROBABILIDAD' : 'PROBABILITY'}</span>
              <span className="text-emerald-400 font-black">{card.probability || 70}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(10, card.probability || 70))}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 font-bold mb-1">
              <span>{isEs ? 'CONFIANZA' : 'CONFIDENCE'}</span>
              <span className="text-amber-400 font-black">{card.stake_bet || 7}/10</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (card.stake_bet || 7) * 10)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Bullets */}
      <div className="relative z-10 space-y-1 my-2">
        {(stats || []).slice(0, 3).map((st, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300 leading-tight bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
            <span>{st}</span>
          </div>
        ))}
      </div>

      {/* Bottom Footer / Branding */}
      <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 font-semibold tracking-wider">
        <span>PREDIFUTBOL COLOMBIA</span>
        <span>TIKTOK: @PREDIFUTBOL</span>
      </div>
    </div>
  );
};
