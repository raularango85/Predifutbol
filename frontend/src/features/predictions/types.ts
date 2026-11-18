export type WasRightStatus = 0 | 1 | 2 | 3; // 0: Lost, 1: Won, 2: Pending, 3: Void

export interface Prediction {
  id: number;
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
  stadium?: string;
  match_date_text?: string;
  match_date?: string;
  type_prediction_id?: number | null;
  prediction_value?: string;
  custom_pick_en?: string;
  custom_pick_es?: string;
  odd: number;
  stake_bet: number;
  probability: number;
  is_vip: boolean;
  was_right: WasRightStatus;
  stats_en: string[];
  stats_es: string[];
  tiktok_caption?: string;
  tiktok_hashtags?: string;
  tiktok_full_text?: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface PredictionListResult {
  predictions: Prediction[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SavePredictionDTO {
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
  stadium?: string;
  match_date_text?: string;
  type_prediction_id?: number | null;
  prediction_value?: string;
  custom_pick_en?: string;
  custom_pick_es?: string;
  odd: number;
  stake_bet: number;
  probability: number;
  is_vip: boolean;
  was_right: WasRightStatus;
  stats_en: string[];
  stats_es: string[];
  theme: string;
}

export interface SettleResult {
  prediction_id: number;
  was_right: WasRightStatus;
  home_goals: number;
  away_goals: number;
  status: 'WON' | 'LOST';
}

export interface CheckItemResult {
  id: number;
  home_name: string;
  away_name: string;
  score?: string;
  pick: string;
  was_right: WasRightStatus;
  outcome: string; // 'Acertada' | 'Fallada' | 'Pendiente'
  source?: string;
  reason?: string;
}

export interface CheckAllResult {
  total_pending: number;
  settled: number;
  won: number;
  lost: number;
  still_pending: number;
  win_rate: number;
  results: CheckItemResult[];
}
