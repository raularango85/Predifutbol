export interface Team {
  id: number;
  name: string;
  country?: string;
  founded?: number;
  national?: number;
  logo: string;
  venue_id?: number | null;
  venue_name?: string;
  venue_city?: string;
  flag?: string;
}

export interface League {
  id: number;
  name: string;
  type?: string;
  logo: string;
  country_name?: string;
  country_code?: string;
  country_flag?: string;
}

export interface TypePrediction {
  id: number;
  name: string;
  label_es: string;
  label_en: string;
  valid_values: string;
}

export interface EngineStatus {
  status: string;
  engine: string;
  version: string;
  timestamp: string;
  db_mode: string;
}

export interface CardState {
  id?: number;
  fixture_id?: number | null;
  league_id?: number | null;
  league_name: string;
  league_logo?: string | null;
  home_team_id?: number | null;
  home_name: string;
  home_flag: string;
  away_team_id?: number | null;
  away_name: string;
  away_flag: string;
  stadium: string;
  match_date_text: string;
  type_prediction_id: number;
  prediction_value: string;
  custom_pick_en: string;
  custom_pick_es: string;
  odd: number;
  stake_bet: number;
  probability: number;
  is_vip: boolean;
  was_right: 0 | 1 | 2 | 3;
  stats_en: string[];
  stats_es: string[];
  theme: 'emerald' | 'amber' | 'cyan' | 'rose' | 'violet';
}
