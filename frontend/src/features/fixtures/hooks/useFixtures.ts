import { useState, useCallback, useRef } from 'react';
import type { Fixture, FixtureFilter, SyncFixtureResponse } from '../types';
import { searchFixtures, syncFixtures } from '../api';

export function getLocalDateIso(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatFixtureDateText(dateStr?: string, timestamp?: number): string {
  let d: Date | null = null;
  if (timestamp && timestamp > 0) {
    d = new Date(timestamp * 1000);
  } else if (dateStr) {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return '';
  try {
    return d
      .toLocaleString('es-ES', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
      })
      .toUpperCase()
      .replace(/\./g, '')
      .replace(/,\s*(?=\d{2}:\d{2})/, ' · ');
  } catch {
    return d
      .toLocaleString('es-ES', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .toUpperCase()
      .replace(/\./g, '')
      .replace(/,\s*(?=\d{2}:\d{2})/, ' · ');
  }
}

export function useFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateIso(0));
  const [upcomingOnly, setUpcomingOnly] = useState<boolean>(true);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (overrideQuery?: string, overrideDate?: string, overrideUpcoming?: boolean) => {
      const q = overrideQuery !== undefined ? overrideQuery : query;
      const d = overrideDate !== undefined ? overrideDate : date;
      const u = overrideUpcoming !== undefined ? overrideUpcoming : upcomingOnly;

      setLoading(true);
      setError(null);
      try {
        const filter: FixtureFilter = {
          query: q.trim(),
          date: d,
          upcomingOnly: u,
          limit: 30,
        };
        const results = await searchFixtures(filter);
        setFixtures(results);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al buscar partidos';
        setError(msg);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    },
    [query, date, upcomingOnly]
  );

  const debouncedSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        search(newQuery, date, upcomingOnly);
      }, 250);
    },
    [date, upcomingOnly, search]
  );

  const sync = useCallback(
    async (targetDate?: string): Promise<SyncFixtureResponse | null> => {
      const syncDate = targetDate || date;
      setSyncing(true);
      setSyncMessage(null);
      setError(null);

      try {
        const res = await syncFixtures({ date: syncDate, timezone: 'America/Bogota' });
        if (res.success) {
          setSyncMessage(`✅ ${res.fetched} partidos sincronizados`);
          await search(query, syncDate, upcomingOnly);
        } else {
          setError(res.error || 'Aviso de API al sincronizar partidos');
        }
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al sincronizar con API';
        setError(msg);
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [date, query, upcomingOnly, search]
  );

  const setQuickDate = useCallback(
    async (offsetDays: number) => {
      const newDate = getLocalDateIso(offsetDays);
      setDate(newDate);
      await search(query, newDate, upcomingOnly);
    },
    [query, upcomingOnly, search]
  );

  const clearResults = useCallback(() => {
    setFixtures([]);
  }, []);

  return {
    fixtures,
    loading,
    syncing,
    syncMessage,
    error,
    query,
    date,
    upcomingOnly,
    setQuery,
    setDate,
    setUpcomingOnly,
    search,
    debouncedSearch,
    sync,
    setQuickDate,
    clearResults,
  };
}
