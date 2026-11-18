import { useState, useCallback, useEffect } from 'react';
import { studioApi } from '../api';
import { predictionsApi } from '../../predictions/api';
import type { CardState, Team, League, TypePrediction } from '../types';
import type { Prediction } from '../../predictions/types';

export const DEFAULT_CARD_STATE: CardState = {
  league_name: 'LIGA BETPLAY COLOMBIA',
  home_name: 'ATLETICO NACIONAL',
  home_flag: 'https://media.api-sports.io/football/teams/1137.png',
  away_name: 'ONCE CALDAS',
  away_flag: 'https://media.api-sports.io/football/teams/1136.png',
  stadium: 'Estadio Atanasio Girardot, Medellin',
  match_date_text: 'SÁB, 22 NOV • 18:30',
  type_prediction_id: 1,
  prediction_value: '1',
  custom_pick_es: 'Gana Local',
  custom_pick_en: 'Home Win',
  odd: 1.85,
  stake_bet: 8,
  probability: 72,
  is_vip: false,
  was_right: 2,
  stats_es: [
    '⚡ H2H: Invicto en los últimos 4 partidos directos',
    '🔥 Local: Promedia 2.1 goles por partido en casa',
    '🛡️ Visita: Once Caldas encajó goles en sus últimas 3 salidas',
  ],
  stats_en: [
    '⚡ H2H: Unbeaten in last 4 direct clashes',
    '🔥 Home Form: Averages 2.1 goals per home match',
    '🛡️ Away Form: Once Caldas conceded in last 3 away games',
  ],
  theme: 'emerald',
};

export function useStudio() {
  const [card, setCard] = useState<CardState>(DEFAULT_CARD_STATE);
  const [types, setTypes] = useState<TypePrediction[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search autocompletes
  const [teamResults, setTeamResults] = useState<Team[]>([]);
  const [leagueResults, setLeagueResults] = useState<League[]>([]);
  const [searchingTeams, setSearchingTeams] = useState(false);
  const [searchingLeagues, setSearchingLeagues] = useState(false);

  useEffect(() => {
    studioApi.getTypePredictions()
      .then(res => setTypes(res.results))
      .catch(() => {});
  }, []);

  const updateCard = useCallback((updates: Partial<CardState>) => {
    setCard(prev => ({ ...prev, ...updates }));
    setSaveSuccess(false);
  }, []);

  const loadPredictionIntoStudio = useCallback((pred: Prediction) => {
    setCard({
      id: pred.id,
      fixture_id: pred.fixture_id,
      league_id: pred.league_id,
      league_name: pred.league_name,
      league_logo: pred.league_logo,
      home_team_id: pred.home_team_id,
      home_name: pred.home_name,
      home_flag: pred.home_flag,
      away_team_id: pred.away_team_id,
      away_name: pred.away_name,
      away_flag: pred.away_flag,
      stadium: pred.stadium || '',
      match_date_text: pred.match_date_text || '',
      type_prediction_id: pred.type_prediction_id || 1,
      prediction_value: pred.prediction_value || '1',
      custom_pick_es: pred.custom_pick_es || '',
      custom_pick_en: pred.custom_pick_en || '',
      odd: pred.odd || 1.75,
      stake_bet: pred.stake_bet || 7,
      probability: pred.probability || 70,
      is_vip: pred.is_vip || false,
      was_right: pred.was_right,
      stats_es: pred.stats_es || [],
      stats_en: pred.stats_en || [],
      theme: (pred.theme as CardState['theme']) || 'emerald',
    });
    setSaveSuccess(false);
  }, []);

  const searchTeams = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTeamResults([]);
      return;
    }
    setSearchingTeams(true);
    try {
      const res = await studioApi.searchTeams(query);
      setTeamResults(res.results);
    } catch {
      setTeamResults([]);
    } finally {
      setSearchingTeams(false);
    }
  }, []);

  const searchLeagues = useCallback(async (query: string) => {
    if (!query.trim()) {
      setLeagueResults([]);
      return;
    }
    setSearchingLeagues(true);
    try {
      const res = await studioApi.searchLeagues(query);
      setLeagueResults(res.results);
    } catch {
      setLeagueResults([]);
    } finally {
      setSearchingLeagues(false);
    }
  }, []);

  const saveCard = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await predictionsApi.save(card);
      if (res.success && res.prediction) {
        setCard(prev => ({ ...prev, id: res.prediction.id }));
        setSaveSuccess(true);
      }
      return res.prediction;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la tarjeta');
      return null;
    } finally {
      setSaving(false);
    }
  }, [card]);

  return {
    card,
    types,
    saving,
    saveSuccess,
    error,
    teamResults,
    leagueResults,
    searchingTeams,
    searchingLeagues,
    updateCard,
    loadPredictionIntoStudio,
    searchTeams,
    searchLeagues,
    saveCard,
  };
}
