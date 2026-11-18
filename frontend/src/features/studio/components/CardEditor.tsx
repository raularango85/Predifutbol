import React, { useState, useMemo } from 'react';
import type { CardState, Team, League, TypePrediction } from '../types';
import type { Fixture } from '../../fixtures/types';
import { FixtureSearchBar } from '../../fixtures/components/FixtureSearchBar';
import { formatFixtureDateText } from '../../fixtures/hooks/useFixtures';
import { parseValidValues, formatMarketPick } from '../utils/marketFormatter';
import { Button } from '../../../components/Button';
import { Save, Search, Sparkles, BarChart2 } from 'lucide-react';

interface CardEditorProps {
  card: CardState;
  types: TypePrediction[];
  saving: boolean;
  saveSuccess: boolean;
  teamResults: Team[];
  leagueResults: League[];
  searchingTeams: boolean;
  searchingLeagues: boolean;
  onUpdate: (updates: Partial<CardState>) => void;
  onSearchTeams: (q: string) => void;
  onSearchLeagues: (q: string) => void;
  onSave: () => void;
}

export const CardEditor: React.FC<CardEditorProps> = ({
  card,
  types,
  saving,
  saveSuccess,
  teamResults,
  leagueResults,
  onUpdate,
  onSearchTeams,
  onSearchLeagues,
  onSave,
}) => {
  const [teamSearchTarget, setTeamSearchTarget] = useState<'home' | 'away' | null>(null);
  const [leagueSearchOpen, setLeagueSearchOpen] = useState(false);

  const currentTypeObj = types.find((t) => t.id === card.type_prediction_id);
  const availableValues = useMemo(() => {
    return parseValidValues(currentTypeObj?.valid_values, card.type_prediction_id);
  }, [currentTypeObj, card.type_prediction_id]);

  const handleMarketTypeChange = (newTypeId: number) => {
    const typeObj = types.find((t) => t.id === newTypeId);
    const values = parseValidValues(typeObj?.valid_values, newTypeId);
    const defaultVal = values[0] || '1';
    const formatted = formatMarketPick(newTypeId, defaultVal);
    onUpdate({
      type_prediction_id: newTypeId,
      prediction_value: defaultVal,
      custom_pick_es: formatted.es,
      custom_pick_en: formatted.en,
    });
  };

  const handlePredictionValueChange = (newVal: string) => {
    const formatted = formatMarketPick(card.type_prediction_id, newVal);
    onUpdate({
      prediction_value: newVal,
      custom_pick_es: formatted.es,
      custom_pick_en: formatted.en,
    });
  };

  const handleStatChange = (index: number, val: string) => {
    const nextStats = [...(card.stats_es || ['', '', ''])];
    nextStats[index] = val;
    onUpdate({ stats_es: nextStats });
  };

  const handleSelectFixture = (f: Fixture) => {
    const homeDisplay = (f.home_name_es || f.home_name || '').toUpperCase();
    const awayDisplay = (f.away_name_es || f.away_name || '').toUpperCase();
    const venueText = [f.venue_name, f.venue_city].filter(Boolean).join(', ') || 'Estadio por confirmar';
    const dateFormatted = formatFixtureDateText(f.date, f.timestamp);

    const leagueDisplayName = f.league_country
      ? `${(f.league_name || '').toUpperCase()} • ${f.league_country.toUpperCase()}`
      : (f.league_name || '').toUpperCase();

    const stat1 = `⚡ H2H: Historial reciente y balance entre ${homeDisplay} y ${awayDisplay}`;
    const stat2 = `🔥 Local: ${homeDisplay} en condición de local`;
    const stat3 = `🛡️ Visita: ${awayDisplay} en condición de visitante`;

    onUpdate({
      fixture_id: f.id,
      league_id: f.league_id,
      league_name: leagueDisplayName,
      league_logo: f.league_logo || null,
      home_team_id: f.home_id,
      home_name: homeDisplay,
      home_flag: f.home_logo || '⚽',
      away_team_id: f.away_id,
      away_name: awayDisplay,
      away_flag: f.away_logo || '⚽',
      stadium: venueText,
      match_date_text: dateFormatted,
      stats_es: [stat1, stat2, stat3],
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Configurador de Tarjeta 9:16
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Personaliza los datos del partido, escudos y cuota en tiempo real
          </p>
        </div>
        <Button
          variant="emerald"
          size="md"
          loading={saving}
          onClick={onSave}
          icon={<Save className="w-4 h-4" />}
        >
          {saveSuccess ? '¡Guardado!' : 'Guardar Tarjeta'}
        </Button>
      </div>

      {/* 1-Click Fixture Search & API Sync Bar */}
      <FixtureSearchBar onSelectFixture={handleSelectFixture} />

      {/* League Selection */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Liga o Torneo
        </label>
        <div className="relative">
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={card.league_name}
            onChange={(e) => {
              onUpdate({ league_name: e.target.value });
              onSearchLeagues(e.target.value);
              setLeagueSearchOpen(true);
            }}
            placeholder="Buscar liga (ej. Premier League, BetPlay...)"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
        </div>

        {leagueSearchOpen && leagueResults.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
            {leagueResults.map((l) => (
              <div
                key={l.id}
                className="px-3.5 py-2 hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 text-xs text-slate-200"
                onClick={() => {
                  onUpdate({
                    league_id: l.id,
                    league_name: l.name,
                    league_logo: l.logo,
                  });
                  setLeagueSearchOpen(false);
                }}
              >
                {l.logo && <img src={l.logo} alt={l.name} className="w-5 h-5 object-contain" />}
                <span className="font-semibold">{l.name}</span>
                {l.country_name && <span className="text-slate-500">({l.country_name})</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home Team */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Equipo Local
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={card.home_name}
            onChange={(e) => {
              onUpdate({ home_name: e.target.value });
              onSearchTeams(e.target.value);
              setTeamSearchTarget('home');
            }}
            placeholder="Buscar equipo local..."
          />
          {teamSearchTarget === 'home' && teamResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {teamResults.map((t) => (
                <div
                  key={t.id}
                  className="px-3.5 py-2 hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 text-xs text-slate-200"
                  onClick={() => {
                    const venue = [t.venue_name, t.venue_city].filter(Boolean).join(', ');
                    onUpdate({
                      home_team_id: t.id,
                      home_name: (t.name || '').toUpperCase(),
                      home_flag: t.logo || '⚽',
                      stadium: venue || card.stadium || 'Estadio por confirmar',
                    });
                    setTeamSearchTarget(null);
                  }}
                >
                  <img src={t.logo} alt={t.name} className="w-5 h-5 object-contain" />
                  <span className="font-semibold">{t.name}</span>
                  {t.country && <span className="text-slate-500">({t.country})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Equipo Visitante
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={card.away_name}
            onChange={(e) => {
              onUpdate({ away_name: e.target.value });
              onSearchTeams(e.target.value);
              setTeamSearchTarget('away');
            }}
            placeholder="Buscar equipo visitante..."
          />
          {teamSearchTarget === 'away' && teamResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {teamResults.map((t) => (
                <div
                  key={t.id}
                  className="px-3.5 py-2 hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 text-xs text-slate-200"
                  onClick={() => {
                    onUpdate({
                      away_team_id: t.id,
                      away_name: (t.name || '').toUpperCase(),
                      away_flag: t.logo || '⚽',
                    });
                    setTeamSearchTarget(null);
                  }}
                >
                  <img src={t.logo} alt={t.name} className="w-5 h-5 object-contain" />
                  <span className="font-semibold">{t.name}</span>
                  {t.country && <span className="text-slate-500">({t.country})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Match Details: Date & Stadium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Fecha y Hora (Texto)
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={card.match_date_text}
            onChange={(e) => onUpdate({ match_date_text: e.target.value })}
            placeholder="SÁB, 22 NOV · 18:30"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Estadio / Sede
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={card.stadium}
            onChange={(e) => onUpdate({ stadium: e.target.value })}
            placeholder="Estadio Atanasio Girardot..."
          />
        </div>
      </div>

      {/* Market & Pick Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Tipo de Mercado
          </label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            value={card.type_prediction_id}
            onChange={(e) => handleMarketTypeChange(Number(e.target.value))}
          >
            {types.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.label_es}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Valor de Pronóstico
          </label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            value={card.prediction_value}
            onChange={(e) => handlePredictionValueChange(e.target.value)}
          >
            {availableValues.map((val) => {
              const formatted = formatMarketPick(card.type_prediction_id, val);
              return (
                <option key={val} value={val}>
                  {formatted.optLabel}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Cuota (Odd)
          </label>
          <input
            type="number"
            step="0.01"
            min="1.01"
            max="50.0"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
            value={card.odd}
            onChange={(e) => onUpdate({ odd: parseFloat(e.target.value) || 1.75 })}
          />
        </div>
      </div>

      {/* Pick Card Display Text (Auto-generated or custom editable) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Texto del Pick en Tarjeta (Resultado)
          </label>
          <span className="text-[10px] text-slate-500">Auto-generado según mercado y valor</span>
        </div>
        <input
          type="text"
          className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 transition-colors"
          value={card.custom_pick_es}
          onChange={(e) => onUpdate({ custom_pick_es: e.target.value })}
          placeholder="GANA LOCAL, MÁS DE 2.5 GOLES..."
        />
      </div>

      {/* Probability and Stake sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
            <span>Probabilidad Estimada:</span>
            <span className="text-emerald-400 font-black">{card.probability}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="95"
            value={card.probability}
            onChange={(e) => onUpdate({ probability: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
            <span>Nivel de Confianza:</span>
            <span className="text-amber-400 font-black">{card.stake_bet}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={card.stake_bet}
            onChange={(e) => onUpdate({ stake_bet: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-500"
          />
        </div>
      </div>

      {/* 3 Match Key Insights / Stats */}
      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Datos Clave del Partido (3 Líneas en Tarjeta)</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">
            Personalizable
          </span>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              ⚡ Línea 1 (Historial H2H)
            </label>
            <input
              type="text"
              value={card.stats_es?.[0] || ''}
              onChange={(e) => handleStatChange(0, e.target.value)}
              placeholder="⚡ H2H: Historial reciente y balance entre ambos equipos..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              🔥 Línea 2 (Racha / Rendimiento Local)
            </label>
            <input
              type="text"
              value={card.stats_es?.[1] || ''}
              onChange={(e) => handleStatChange(1, e.target.value)}
              placeholder="🔥 Local: Promedia X goles por partido en casa..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              🛡️ Línea 3 (Racha / Rendimiento Visita)
            </label>
            <input
              type="text"
              value={card.stats_es?.[2] || ''}
              onChange={(e) => handleStatChange(2, e.target.value)}
              placeholder="🛡️ Visita: Desempeño y estadísticas en condición de visitante..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Theme selector */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
          Tema Visual de la Tarjeta
        </label>
        <div className="flex items-center gap-2">
          {(['emerald', 'amber', 'cyan', 'rose', 'violet'] as const).map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => onUpdate({ theme: th })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                card.theme === th
                  ? 'bg-slate-700 text-white border-2 border-emerald-400 shadow'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {th}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
