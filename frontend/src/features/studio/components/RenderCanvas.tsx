import React, { useEffect, useRef, useState } from 'react';
import type { CardState } from '../types';
import { DEFAULT_CARD_STATE } from '../hooks/useStudio';
import { Shield, Sparkles, Activity } from 'lucide-react';

declare global {
  interface Window {
    __RENDER_CARD_DATA__?: CardState;
    __RENDER_LANG__?: 'es' | 'en';
    __vtInstalled?: boolean;
    __vtAdvanceTo?: (ms: number) => number;
    __vtSceneAdvanceTo?: (ms: number) => number;
    __vtInstantFinalState?: () => void;
  }
}

export const RenderCanvas: React.FC = () => {
  const [card, setCard] = useState<CardState>(DEFAULT_CARD_STATE);
  const [lang, setLang] = useState<'es' | 'en'>('es');

  // DOM Refs for synchronous frame-by-frame updates without React batching latency
  const splashRef = useRef<HTMLDivElement>(null);
  const scene2Ref = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const matchupRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const predictionRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Injected globals
    if (window.__RENDER_CARD_DATA__) {
      setCard(window.__RENDER_CARD_DATA__);
    }
    if (window.__RENDER_LANG__) {
      setLang(window.__RENDER_LANG__);
    }

    // 2. URL search params fallback
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam === 'en' || langParam === 'es') {
      setLang(langParam);
    }
    const dataParam = params.get('data');
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam)) as CardState;
        setCard(parsed);
      } catch {
        // Fallback to default
      }
    }
  }, []);

  const isEs = lang === 'es';
  const pick = isEs ? (card.custom_pick_es || card.prediction_value) : (card.custom_pick_en || card.prediction_value);
  const stats = isEs ? (card.stats_es || []) : (card.stats_en || []);

  const themeGlow = {
    emerald: 'from-emerald-500/25 via-teal-500/15 to-transparent border-emerald-500/35 text-emerald-400',
    amber: 'from-amber-500/25 via-orange-500/15 to-transparent border-amber-500/35 text-amber-400',
    cyan: 'from-cyan-500/25 via-blue-500/15 to-transparent border-cyan-500/35 text-cyan-400',
    rose: 'from-rose-500/25 via-pink-500/15 to-transparent border-rose-500/35 text-rose-400',
    violet: 'from-violet-500/25 via-purple-500/15 to-transparent border-violet-500/35 text-violet-400',
  }[card.theme] || 'from-emerald-500/25 via-teal-500/15 to-transparent border-emerald-500/35 text-emerald-400';

  const themeBadge = {
    emerald: 'bg-emerald-500 text-slate-950',
    amber: 'bg-amber-500 text-slate-950',
    cyan: 'bg-cyan-500 text-slate-950',
    rose: 'bg-rose-500 text-white',
    violet: 'bg-violet-500 text-white',
  }[card.theme] || 'bg-emerald-500 text-slate-950';

  // Synchronous timeline controller for deterministic virtual frame export
  useEffect(() => {
    const updateTimeline = (targetMs: number): number => {
      // Phase 1: Splash Cover (0.0s - 2.8s) -> Fade out (2.8s - 3.4s)
      if (splashRef.current) {
        if (targetMs < 2800) {
          splashRef.current.style.display = 'flex';
          splashRef.current.style.opacity = '1';
          splashRef.current.style.transform = 'scale(1)';
          splashRef.current.style.pointerEvents = 'auto';
        } else if (targetMs < 3400) {
          splashRef.current.style.display = 'flex';
          const p = (targetMs - 2800) / 600;
          splashRef.current.style.opacity = String(Math.max(0, 1 - p));
          splashRef.current.style.transform = `scale(${1 + 0.05 * p})`;
          splashRef.current.style.pointerEvents = 'none';
        } else {
          splashRef.current.style.opacity = '0';
          splashRef.current.style.display = 'none';
          splashRef.current.style.pointerEvents = 'none';
        }
      }

      // Phase 2: Main Match Card Fade In (2.8s - 3.4s)
      if (scene2Ref.current) {
        if (targetMs < 2800) {
          scene2Ref.current.style.opacity = '0';
        } else if (targetMs < 3400) {
          const p = (targetMs - 2800) / 600;
          scene2Ref.current.style.opacity = String(p);
          scene2Ref.current.style.transform = `translateY(${16 * (1 - p)}px)`;
        } else {
          scene2Ref.current.style.opacity = '1';
          scene2Ref.current.style.transform = 'translateY(0)';
        }
      }

      // Phase 3: Stats Box Reveal (at 4.2s - 4.8s)
      if (statsRef.current) {
        if (targetMs < 4200) {
          statsRef.current.style.opacity = '0';
          statsRef.current.style.transform = 'translateY(16px)';
        } else if (targetMs < 4800) {
          const p = (targetMs - 4200) / 600;
          statsRef.current.style.opacity = String(p);
          statsRef.current.style.transform = `translateY(${16 * (1 - p)}px)`;
        } else {
          statsRef.current.style.opacity = '1';
          statsRef.current.style.transform = 'translateY(0)';
        }
      }

      // Phase 4: Value Pick Box & Confidence Bar Reveal (at 5.8s - 6.6s)
      if (predictionRef.current) {
        if (targetMs < 5800) {
          predictionRef.current.style.opacity = '0';
          predictionRef.current.style.transform = 'translateY(18px)';
        } else if (targetMs < 6400) {
          const p = (targetMs - 5800) / 600;
          predictionRef.current.style.opacity = String(p);
          predictionRef.current.style.transform = `translateY(${18 * (1 - p)}px)`;
        } else {
          predictionRef.current.style.opacity = '1';
          predictionRef.current.style.transform = 'translateY(0)';
        }
      }

      if (footerRef.current) {
        if (targetMs < 5800) {
          footerRef.current.style.opacity = '0';
        } else {
          footerRef.current.style.opacity = '1';
        }
      }

      // Progress bar fill animation (5.8s - 7.0s)
      if (progressBarRef.current) {
        const targetPercent = Math.min(100, Math.max(10, card.probability || 70));
        if (targetMs < 5800) {
          progressBarRef.current.style.width = '0%';
        } else if (targetMs < 7000) {
          const p = (targetMs - 5800) / 1200;
          progressBarRef.current.style.width = `${targetPercent * p}%`;
        } else {
          progressBarRef.current.style.width = `${targetPercent}%`;
        }
      }

      return targetMs;
    };

    const showInstantFinalState = () => {
      updateTimeline(15000);
    };

    window.__vtAdvanceTo = updateTimeline;
    window.__vtSceneAdvanceTo = updateTimeline;
    window.__vtInstantFinalState = showInstantFinalState;

    // Check if this is a PNG snapshot request
    const params = new URLSearchParams(window.location.search);
    if (params.get('format') === 'png') {
      showInstantFinalState();
    } else if (!params.has('render')) {
      // In normal browser tab without render flag, play smooth loop for visual inspection
      let start = performance.now();
      const interval = setInterval(() => {
        const elapsed = (performance.now() - start) % 15000;
        updateTimeline(elapsed);
      }, 33);
      return () => clearInterval(interval);
    }
  }, [card.probability]);

  return (
    <div className="relative w-[540px] h-[960px] bg-slate-950 overflow-hidden flex flex-col justify-between p-7 select-none font-sans text-white">
      {/* Background radial atmosphere & grid */}
      <div className={`absolute inset-0 bg-gradient-to-b ${themeGlow} opacity-30 pointer-events-none`} />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-45 pointer-events-none" />

      {/* ========================================================================= */}
      {/* SCENE 1: INTRO SPLASH OVERLAY (0.0s - 2.8s)                                */}
      {/* ========================================================================= */}
      <div
        ref={splashRef}
        id="intro-splash"
        className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-between p-8 text-center transition-none"
      >
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none intro-aura-anim" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none intro-aura-anim" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-50 pointer-events-none" />

        {/* Top League Pill */}
        <div className="relative z-10 pt-2">
          <span className="glass-pill px-5 py-1.5 rounded-full text-xs font-black tracking-widest text-emerald-400 border border-emerald-500/40 uppercase shadow-lg">
            {card.league_name || 'LIGA INTERNACIONAL'}
          </span>
        </div>

        {/* Center Logo Emblem & Teaser */}
        <div className="relative z-10 flex flex-col items-center my-auto space-y-4 w-full">
          {/* Logo 3D Box with Aura */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-5 rounded-full bg-gradient-to-tr from-emerald-500/45 via-cyan-400/35 to-emerald-300/45 blur-2xl intro-aura-anim" />
            <div className="relative w-36 h-36 rounded-3xl bg-slate-900/95 border-2 border-emerald-400/60 shadow-2xl flex flex-col items-center justify-center p-3 shimmer-effect intro-logo-anim">
              <img
                src="/public/logo_big_512_512.png"
                alt="PrediFutbol Logo"
                className="w-28 h-28 object-contain filter brightness-110 contrast-125 drop-shadow-[0_0_18px_rgba(16,185,129,0.7)]"
              />
            </div>
          </div>

          {/* Titles */}
          <div className="space-y-1.5">
            <div className="font-bebas text-5xl tracking-widest bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent leading-none drop-shadow">
              PREDIFUTBOL
            </div>
            <div className="text-xs font-extrabold tracking-[0.26em] text-emerald-400 uppercase drop-shadow">
              AI SPORTS PREDICTIONS
            </div>
          </div>

          {/* Teaser Matchup Glass Card */}
          <div className="w-full max-w-sm glass-card rounded-2xl px-5 py-4 border border-emerald-500/35 shadow-2xl flex items-center justify-between gap-3 mt-2 shimmer-effect">
            {/* Home Side */}
            <div className="flex flex-col items-center w-28 space-y-1 intro-home-anim text-center">
              <div className="w-12 h-12 rounded-xl glass-pill flex items-center justify-center p-1.5 border border-white/15 shadow-inner">
                {card.home_flag ? (
                  <img src={card.home_flag} alt={card.home_name} className="max-w-full max-h-full object-contain drop-shadow" />
                ) : (
                  <Shield className="w-7 h-7 text-emerald-400" />
                )}
              </div>
              <span className="font-bebas text-sm tracking-wider text-white truncate w-full">
                {card.home_name || 'LOCAL'}
              </span>
            </div>

            {/* VS Badge */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 font-teko text-xl font-bold flex items-center justify-center shadow-lg shrink-0 intro-vs-anim">
              VS
            </div>

            {/* Away Side */}
            <div className="flex flex-col items-center w-28 space-y-1 intro-away-anim text-center">
              <div className="w-12 h-12 rounded-xl glass-pill flex items-center justify-center p-1.5 border border-white/15 shadow-inner">
                {card.away_flag ? (
                  <img src={card.away_flag} alt={card.away_name} className="max-w-full max-h-full object-contain drop-shadow" />
                ) : (
                  <Shield className="w-7 h-7 text-cyan-400" />
                )}
              </div>
              <span className="font-bebas text-sm tracking-wider text-white truncate w-full">
                {card.away_name || 'VISITANTE'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pb-2 space-y-1 text-center">
          <p className="text-xs font-mono font-bold text-slate-300 tracking-wider uppercase">
            {card.match_date_text || (isEs ? 'PRÓXIMO ENCUENTRO' : 'UPCOMING MATCH')}
          </p>
          <p className="text-xs font-extrabold text-emerald-400 tracking-widest uppercase">
            TikTok • @predifutbolcolombia
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCENE 2: FULL-BLEED DETAILED MATCH CARD (2.8s - 15.0s)                     */}
      {/* ========================================================================= */}
      <div
        ref={scene2Ref}
        id="scene-2-card"
        className="relative z-10 w-full h-full flex flex-col justify-between transition-none opacity-0"
      >
        {/* Header / Brand & League */}
        <div ref={headerRef} className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center shadow-md p-1">
              <img src="/public/logo_big_512_512.png" alt="PrediFutbol" className="w-full h-full object-contain drop-shadow" />
            </div>
            <span className="font-bebas text-2xl tracking-wider text-white">PREDIFUTBOL</span>
          </div>
          <span className="glass-pill px-3.5 py-1 rounded-full text-xs font-black tracking-widest text-emerald-400 border border-emerald-500/35 uppercase truncate max-w-[240px]">
            {card.league_name || 'LIGA INTERNACIONAL'}
          </span>
        </div>

        {/* Central Container (Matchup + Stats) */}
        <div className="flex-1 flex flex-col justify-evenly py-2 gap-3 my-auto">
          {/* Main Matchup Card */}
          <div ref={matchupRef} className="glass-card rounded-2xl p-4 shadow-2xl relative overflow-hidden border border-emerald-500/25">
            {/* Match details (Stadium & Date) */}
            <div className="text-center pb-2.5 border-b border-slate-800/60">
              {card.stadium && (
                <p className="text-xs font-semibold text-slate-200 truncate">
                  📍 {card.stadium}
                </p>
              )}
              <p className="text-[11px] font-mono text-slate-400 tracking-wider mt-0.5 uppercase">
                {card.match_date_text || (isEs ? 'PRÓXIMO ENCUENTRO' : 'UPCOMING MATCH')}
              </p>
            </div>

            {/* Teams HUD */}
            <div className="grid grid-cols-5 items-center py-3 text-center">
              {/* Home Team */}
              <div className="col-span-2 flex flex-col items-center space-y-1.5">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl glass-pill flex items-center justify-center p-2.5 border border-white/10 shadow-lg">
                  {card.home_flag ? (
                    <img src={card.home_flag} alt={card.home_name} className="max-w-full max-h-full object-contain drop-shadow" />
                  ) : (
                    <Shield className="w-10 h-10 text-emerald-400" />
                  )}
                </div>
                <span className="font-bebas text-xl font-black tracking-wider text-white leading-tight px-1 line-clamp-2">
                  {card.home_name || 'LOCAL'}
                </span>
              </div>

              {/* VS Circular Badge */}
              <div className="col-span-1 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-teko text-xl font-bold flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  VS
                </div>
              </div>

              {/* Away Team */}
              <div className="col-span-2 flex flex-col items-center space-y-1.5">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl glass-pill flex items-center justify-center p-2.5 border border-white/10 shadow-lg">
                  {card.away_flag ? (
                    <img src={card.away_flag} alt={card.away_name} className="max-w-full max-h-full object-contain drop-shadow" />
                  ) : (
                    <Shield className="w-10 h-10 text-cyan-400" />
                  )}
                </div>
                <span className="font-bebas text-xl font-black tracking-wider text-white leading-tight px-1 line-clamp-2">
                  {card.away_name || 'VISITANTE'}
                </span>
              </div>
            </div>

            {/* Key Match Stats (3 lines) */}
            <div ref={statsRef} className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-300 transition-none">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEs ? 'Datos Clave del Partido' : 'Key Match Data'}</span>
              </div>
              {stats.slice(0, 3).map((st, i) => (
                <div key={i} className="font-medium leading-snug py-0.5 flex items-start gap-1">
                  <span>{st}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Value Prediction Box */}
          <div
            ref={predictionRef}
            className="glass-card rounded-2xl p-4 shadow-2xl border-2 border-emerald-500/40 relative overflow-hidden bg-slate-900/95 transition-none"
          >
            <div className="flex justify-between items-center gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isEs ? 'Pronóstico de Valor' : 'Top Value Pick'}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black uppercase tracking-wider ${themeBadge}`}>
                  CUOTA {Number(card.odd || 1.75).toFixed(2)}
                </span>
                <span className="glass-pill px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-slate-300 border border-slate-700/60 whitespace-nowrap">
                  CONFIANZA {card.stake_bet || 7}/10
                </span>
                <span className="font-mono font-black text-xl text-emerald-400 whitespace-nowrap ml-1">
                  {card.probability || 70}%
                </span>
              </div>
            </div>

            {/* Big Pick Text */}
            <div className="font-bebas text-3xl sm:text-4xl text-white tracking-wider my-2.5 leading-tight drop-shadow text-center">
              {pick || (isEs ? 'Victoria Local' : 'Home Win')}
            </div>

            {/* Animated Probability & Confidence Progress Bar */}
            <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
              <div
                ref={progressBarRef}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-lg transition-none"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Footer / CTA */}
        <div ref={footerRef} className="text-center border-t border-slate-800/80 pt-3 pb-1 transition-none">
          <p className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>TikTok • @predifutbolcolombia</span>
          </p>
        </div>
      </div>
    </div>
  );
};
