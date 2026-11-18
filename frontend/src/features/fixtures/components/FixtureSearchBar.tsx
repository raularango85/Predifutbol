import React, { useState, useRef, useEffect } from 'react';
import type { Fixture } from '../types';
import { useFixtures, formatFixtureDateText, getLocalDateIso } from '../hooks/useFixtures';
import { Database, RefreshCw, Search, X, Check, Clock } from 'lucide-react';

interface FixtureSearchBarProps {
  onSelectFixture: (fixture: Fixture) => void;
}

export const FixtureSearchBar: React.FC<FixtureSearchBarProps> = ({ onSelectFixture }) => {
  const {
    fixtures,
    loading,
    syncing,
    syncMessage,
    error,
    query,
    date,
    upcomingOnly,
    setDate,
    setUpcomingOnly,
    debouncedSearch,
    search,
    sync,
    setQuickDate,
    clearResults,
  } = useFixtures();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayIso = getLocalDateIso(0);
  const tomorrowIso = getLocalDateIso(1);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (fixture: Fixture) => {
    onSelectFixture(fixture);
    setIsOpen(false);
    clearResults();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (fixtures.length === 0) {
      search(query, date, upcomingOnly);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 shadow-xl space-y-3 relative"
    >
      {/* Header controls: Title & Date quick-buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />
          <span>Carga Rápida de Partidos (API-Football / BD)</span>
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Date buttons */}
          <button
            type="button"
            onClick={() => {
              setQuickDate(0);
              setIsOpen(true);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
              date === todayIso
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickDate(1);
              setIsOpen(true);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
              date === tomorrowIso
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            Mañana
          </button>
          <button
            type="button"
            onClick={() => {
              setDate('');
              search(query, '', upcomingOnly);
              setIsOpen(true);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
              !date
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            Todas
          </button>

          {/* Date Picker Input */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                search(query, e.target.value, upcomingOnly);
                setIsOpen(true);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Sync Button */}
          <button
            type="button"
            disabled={syncing}
            onClick={() => sync(date)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-500/10 hover:text-emerald-300 border border-slate-800 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
            title="Sincronizar partidos de la API-Football para la fecha seleccionada"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar API'}</span>
          </button>
        </div>
      </div>

      {/* Filter Options: Upcoming Only & Feedback Messages */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
        <label className="flex items-center gap-2 text-xs text-emerald-400 font-semibold cursor-pointer select-none bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/30 hover:bg-emerald-950/60 transition">
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => {
              setUpcomingOnly(e.target.checked);
              search(query, date, e.target.checked);
              setIsOpen(true);
            }}
            className="accent-emerald-500 rounded cursor-pointer w-3.5 h-3.5"
          />
          <Clock className="w-3.5 h-3.5" />
          <span>Solo partidos futuros (&gt; hora actual)</span>
        </label>

        {syncMessage && (
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-pulse">
            <Check className="w-3.5 h-3.5" /> {syncMessage}
          </span>
        )}
        {error && (
          <span className="text-xs text-rose-400 font-medium">
            {error}
          </span>
        )}
      </div>

      {/* Fixture Search Bar & Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={query}
            onFocus={handleInputFocus}
            onChange={(e) => {
              debouncedSearch(e.target.value);
              setIsOpen(true);
            }}
            placeholder="Escribe o haz clic para buscar partidos por equipo, liga o país..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                debouncedSearch('');
              }}
              className="absolute right-3 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-40 divide-y divide-slate-800/80">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Buscando partidos...</span>
              </div>
            ) : fixtures.length > 0 ? (
              fixtures.map((f) => {
                const homeDisplay = f.home_name_es || f.home_name;
                const awayDisplay = f.away_name_es || f.away_name;
                const hasTranslation =
                  homeDisplay !== f.home_name || awayDisplay !== f.away_name;
                const venueText = [f.venue_name, f.venue_city].filter(Boolean).join(', ');
                const dateText = formatFixtureDateText(f.date, f.timestamp);

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelect(f)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-900/90 flex items-center justify-between gap-3 transition group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {f.home_logo ? (
                          <img
                            src={f.home_logo}
                            alt={homeDisplay}
                            className="w-6 h-6 object-contain rounded-full bg-slate-900 p-0.5 border border-slate-800"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="w-6 h-6 flex items-center justify-center text-xs bg-slate-800 rounded-full">
                            ⚽
                          </span>
                        )}
                        {f.away_logo ? (
                          <img
                            src={f.away_logo}
                            alt={awayDisplay}
                            className="w-6 h-6 object-contain rounded-full bg-slate-900 p-0.5 border border-slate-800"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="w-6 h-6 flex items-center justify-center text-xs bg-slate-800 rounded-full">
                            ⚽
                          </span>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                          <span>
                            {homeDisplay} vs {awayDisplay}
                          </span>
                          {hasTranslation && (
                            <span className="text-slate-400 font-normal text-[10px]">
                              ({f.home_name} vs {f.away_name})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-400/90 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{f.league_name}</span>
                          {f.league_country && (
                            <span className="text-slate-400">({f.league_country})</span>
                          )}
                          {venueText && (
                            <span className="text-slate-400 truncate">
                              • 🏟️ {venueText}
                            </span>
                          )}
                          {dateText && (
                            <span className="text-slate-300 font-mono text-[10px]">
                              • {dateText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-900 text-emerald-400 border border-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 transition shrink-0">
                      Cargar
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                <p>No se encontraron partidos para la fecha y criterio seleccionados.</p>
                {date && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setDate('');
                        search(query, '', upcomingOnly);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      🔍 Buscar {query ? `"${query}"` : 'partidos'} en todas las fechas
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  O haz clic en <strong className="text-emerald-400">Sincronizar API</strong> para cargar partidos de hoy/mañana desde API-Football.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
