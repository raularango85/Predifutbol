export interface Fixture {
  id: number;
  referee?: string;
  timezone?: string;
  date?: string;
  timestamp?: number;
  elapsed?: number;
  venue_name?: string;
  venue_city?: string;
  goal_home?: number;
  goal_away?: number;
  home_id: number;
  home_name: string;
  home_name_es?: string;
  home_logo?: string;
  away_id: number;
  away_name: string;
  away_name_es?: string;
  away_logo?: string;
  league_id: number;
  league_name: string;
  league_country?: string;
  league_logo?: string;
  status_short?: string;
  status_long_es?: string;
  status_long_en?: string;
}

export interface FixtureFilter {
  query?: string;
  date?: string;
  upcomingOnly?: boolean;
  limit?: number;
}

export interface SyncFixtureRequest {
  date?: string;
  timezone?: string;
}

export interface SyncFixtureResponse {
  success: boolean;
  fetched: number;
  saved: number;
  date: string;
  timezone: string;
  error?: string;
}
