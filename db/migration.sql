-- PrediFutbol Local Engine v2 - PostgreSQL Schema
-- Extracted & upgraded from legacy Yii2 predifutbolapi/migrations/predifutbol.sql

CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  flag VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_countries_name ON countries (name);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries (code);

CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(120),
  capacity INTEGER,
  surface VARCHAR(50),
  image VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_venues_name ON venues (name);

CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(60) NOT NULL,
  logo VARCHAR(255) NOT NULL,
  country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leagues_name ON leagues (name);
CREATE INDEX IF NOT EXISTS idx_leagues_country_id ON leagues (country_id);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  year INTEGER UNIQUE
);

CREATE TABLE IF NOT EXISTS leagues_seasons (
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  PRIMARY KEY (league_id, season_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(120),
  founded INTEGER,
  national SMALLINT,
  logo VARCHAR(255),
  country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams (name);
CREATE INDEX IF NOT EXISTS idx_teams_country ON teams (country);
CREATE INDEX IF NOT EXISTS idx_teams_venue_id ON teams (venue_id);

CREATE TABLE IF NOT EXISTS fixtures_status (
  id INTEGER PRIMARY KEY,
  short VARCHAR(20) NOT NULL,
  long_es VARCHAR(120),
  long_en VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS fixtures (
  id INTEGER PRIMARY KEY,
  referee VARCHAR(120),
  timezone VARCHAR(50),
  date TIMESTAMP,
  timestamp BIGINT,
  elapsed INTEGER,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  venue_name VARCHAR(255),
  venue_city VARCHAR(120),
  goal_home SMALLINT,
  goal_away SMALLINT,
  team_home_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  team_away_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  status_id INTEGER REFERENCES fixtures_status(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures (date);
CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON fixtures (team_home_id, team_away_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_league ON fixtures (league_id);

CREATE TABLE IF NOT EXISTS type_predictions (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  label_es VARCHAR(150) NOT NULL,
  label_en VARCHAR(150) NOT NULL,
  valid_values TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER REFERENCES fixtures(id) ON DELETE SET NULL,
  league_id INTEGER REFERENCES leagues(id) ON DELETE SET NULL,
  league_name VARCHAR(150) NOT NULL,
  league_logo VARCHAR(255),
  home_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  home_name VARCHAR(120) NOT NULL,
  home_flag VARCHAR(255) NOT NULL,
  away_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  away_name VARCHAR(120) NOT NULL,
  away_flag VARCHAR(255) NOT NULL,
  stadium VARCHAR(255),
  match_date_text VARCHAR(120),
  type_prediction_id INTEGER REFERENCES type_predictions(id) ON DELETE SET NULL,
  prediction_value VARCHAR(50),
  custom_pick_en VARCHAR(200),
  custom_pick_es VARCHAR(200),
  odd NUMERIC(5, 2),
  stake_bet SMALLINT DEFAULT 7,
  probability SMALLINT NOT NULL DEFAULT 70,
  is_vip BOOLEAN DEFAULT FALSE,
  was_right SMALLINT DEFAULT 2,
  stats_en JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats_es JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme VARCHAR(30) NOT NULL DEFAULT 'emerald',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions (created_at DESC);
