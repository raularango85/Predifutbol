# PrediFutbol Local Engine - Implementation Plan (v2: Yii2 Extract & Upgrade)

A fast, local-first admin dashboard and 9:16 vertical video/image generation pipeline built with **Node.js, Express, PostgreSQL, Tailwind CSS, and Playwright**.

This plan combines the modern local card generator ([`predifutbol_match_card_generator.html`](predifutbol_match_card_generator.html)) with the database assets and domain logic extracted from the legacy Yii2 project (`predifutbolapi/`) to enable **under-60-second daily creation of bilingual (EN/ES) sports prediction cards** for TikTok, Reels, and YouTube Shorts.

---

## What We Reuse from `predifutbolapi` (Legacy Yii2 Project)

1. **Pre-Populated Sports Database (`migrations/predifutbol.sql` & `web/*.json`):**
   * **160+ Countries** with ISO codes and SVG flags (`https://media.api-sports.io/flags/{code}.svg`).
   * **950+ Leagues** with official league logos (`https://media.api-sports.io/football/leagues/{id}.png`).
   * **6,100+ Teams** with official team crests (`https://media.api-sports.io/football/teams/{id}.png`) and foreign keys to their home stadium (`venue_id`).
   * **2,800+ Venues (Stadiums)** with stadium name and city — selecting a Home Team automatically populates the Stadium/Venue on the card.
2. **Structured Prediction Markets (`type_predictions` & `Utilities::getBetLabel()`):**
   * 22 standardized betting markets (1X2, Double Chance, Exact Score, Over/Under Goals, BTTS, Corners, Cards, Asian Handicap) upgraded with bilingual `EN` and `ES` dictionaries so toggling languages translates the pick automatically.
   * Support for **Odds (`odd`)**, **Stake (`stake_bet` 1–10)**, and **Confidence (`probability` %)** from the Yii2 `predictions` table.
3. **API-Football v3 Sync Client (`models/apifootball/FootballClient.php`):**
   * Ported to a clean Node.js service (`services/apiFootball.js`) for optional 1-click daily fixture syncing via RapidAPI (`https://api-football-v1.p.rapidapi.com/v3/fixtures`), while maintaining 100% offline capability using the seeded PostgreSQL database.

---

## Project Structure

```text
predifutbol/
├── db/
│   ├── migration.sql            # PostgreSQL schema (countries, venues, leagues, teams, fixtures, predictions)
│   └── seed-from-yii2.js        # Parser script that imports 10,000+ records from predifutbolapi/migrations/predifutbol.sql
├── locales/
│   ├── en.json                  # English UI, HUD labels, and 22 prediction market translations
│   └── es.json                  # Spanish UI, HUD labels, and 22 prediction market translations
├── services/
│   ├── db.js                    # PostgreSQL connection pool (pg)
│   └── apiFootball.js           # Node.js port of Yii2 FootballClient for optional RapidAPI fixture sync
├── public/
│   ├── css/                     # Local styles / assets
│   └── flags/                   # Optional cached local flags/crests
├── views/
│   └── index.html               # Split-screen Admin Control Center & 9:16 Live HUD Canvas
├── exports/                     # Output directory for rendered 1080x1920 PNG & MP4/WebM cards
├── server.js                    # Express backend API & static file server
├── renderer.js                  # Playwright worker for 1080x1920 PNG snapshot & 5s video recording
├── predifutbol_match_card_generator.html # Original standalone UI prototype
├── predifutbolapi/              # Legacy Yii2 project (source for SQL seed extraction; can be archived after Phase 1)
├── package.json                 # Node dependencies
└── implementation_plan.md       # This roadmap
```

---

## Phase 1: Environment, PostgreSQL Schema & Yii2 Data Extraction

### 1. Initialize Project & Dependencies
* Initialize Node.js project at workspace root (or dedicated app folder) and install packages:
  * Core: `express`, `pg`, `dotenv`, `cors`
  * Export Engine: `playwright`

### 2. PostgreSQL Schema (`db/migration.sql`)
Create a unified PostgreSQL schema in database `predifutbol` that preserves the Yii2 relational model while adding fields needed for the 9:16 card generator:

* **`countries`**: `id`, `name`, `code`, `flag`
* **`venues`**: `id`, `name`, `address`, `city`, `capacity`, `surface`, `image`
* **`leagues`**: `id`, `name`, `type`, `logo`, `country_id`
* **`teams`**: `id`, `name`, `country`, `founded`, `national`, `logo`, `country_id`, `venue_id`
* **`fixtures_status`**: `id`, `short` (`NS`, `1H`, `HT`, `FT`, etc.), `long_es`, `long_en`
* **`fixtures`**: `id`, `referee`, `timezone`, `date`, `timestamp`, `venue_name`, `venue_city`, `goal_home`, `goal_away`, `team_home_id`, `team_away_id`, `league_id`, `status_id`
* **`type_predictions`**: `id`, `name` (slug, e.g. `both_team_score`), `label_es`, `label_en`, `valid_values` (comma-separated valid picks)
* **`predictions` (Saved Match Cards)**:
  * `id`, `fixture_id` (nullable for manual custom matches)
  * Snapshot/override fields for fast rendering: `league_name`, `league_logo`, `home_team_id`, `home_name`, `home_logo`, `away_team_id`, `away_name`, `away_logo`, `stadium`, `match_date_text`
  * Market fields (from Yii2): `type_prediction_id`, `prediction_value`, `custom_pick_en`, `custom_pick_es`, `odd` (`NUMERIC(5,2)`), `stake_bet` (`INT` 1–10), `probability` (`INT` 10–99), `is_vip` (`BOOLEAN`), `was_right` (`SMALLINT`)
  * Card content & styling: `stats_en` (`JSONB` array of 3 lines), `stats_es` (`JSONB` array of 3 lines), `theme` (`emerald`, `cyan`, `violet`, `amber`), `created_at`

### 3. Automated Yii2 SQL Seed Importer (`db/seed-from-yii2.js`)
* Reads `predifutbolapi/migrations/predifutbol.sql`.
* Extracts and batch-inserts all `countries`, `venues`, `leagues`, `teams`, `fixtures_status`, and `type_predictions` into PostgreSQL using `ON CONFLICT DO NOTHING / DO UPDATE`.
* Enriches `type_predictions` with both `label_es` (from Yii2) and `label_en` (for English cards).

---

## Phase 2: Bilingual Localization & Structured Markets (`locales/`)

Create JSON dictionaries in `locales/en.json` and `locales/es.json` so switching between `EN` and `ES` updates both the HUD chrome and the structured betting pick:

* **HUD Chrome Labels:**
  * `key_match_data`: `"KEY MATCH DATA"` / `"DATOS CLAVE DEL PARTIDO"`
  * `value_prediction`: `"VALUE PREDICTION"` / `"PREDICCIÓN DE VALOR"`
  * `odd_label`: `"ODD"` / `"CUOTA"`
  * `stake_label`: `"STAKE"` / `"STAKE"`
  * `confidence_label`: `"CONFIDENCE"` / `"CONFIANZA"`
  * `cta_footer`: `"Follow @PrediFutbol for daily tips"` / `"Sigue a @PrediFutbol para pronósticos diarios"`
* **Market & Bet Value Translations (ported from `m220817_160039_type_predictions.php` & `Utilities.php`):**
  * Market slugs (`classic`, `score`, `goals_over_match`, `goals_under_match`, `both_team_score`, `corners_over_match`, `asian_handicap_local`, etc.) mapped to clean HUD titles in both languages.
  * Bet values (`1` → `"HOME WIN"` / `"GANA LOCAL"`, `2` → `"AWAY WIN"` / `"GANA VISITANTE"`, `X` → `"DRAW"` / `"EMPATE"`, `1X` → `"HOME OR DRAW"` / `"LOCAL O EMPATE"`, `X2` → `"AWAY OR DRAW"` / `"VISITANTE O EMPATE"`, `YES` → `"YES"` / `"SÍ"`, `NO` → `"NO"` / `"NO"`).
  * Example auto-formatted pick:
    * `EN`: `BOTH TEAMS TO SCORE: YES` or `MATCH OVER 2.5 GOALS`
    * `ES`: `AMBOS EQUIPOS MARCAN: SÍ` or `PARTIDO MÁS DE 2.5 GOLES`

---

## Phase 3: Backend API & Optional API-Football Sync (`server.js`)

Build an Express server connected to PostgreSQL (`services/db.js`) with the following endpoints:

1. **Lookup & Autocomplete Endpoints (Fast Local DB Queries):**
   * `GET /api/leagues?q=...` — Search leagues with country flag and league logo.
   * `GET /api/teams?q=...&league_id=...` — Search teams; returns team `id`, `name`, `logo`, `country`, and joined `venue` (`stadium_name`, `stadium_city`).
   * `GET /api/type-predictions` — List all 22 structured prediction types and their valid values.
   * `GET /api/localize/:lang` — Return `en.json` or `es.json` dictionary.
2. **Fixture Sync & Lookup Endpoints (`services/apiFootball.js`):**
   * `GET /api/fixtures?date=YYYY-MM-DD&q=...` — Search synced fixtures in local PostgreSQL (similar to Yii2's `PredictionsController::actionFixtures`).
   * `POST /api/fixtures/sync` — Optional trigger that calls `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=YYYY-MM-DD&timezone=America/Bogota` using `RAPIDAPI_KEY` from `.env` and upserts leagues, venues, teams, and fixtures into PostgreSQL.
3. **Saved Match Cards CRUD:**
   * `GET /api/predictions` — List saved match cards for quick reloading.
   * `POST /api/predictions` — Save or update a match card configuration (teams, stadium, bilingual stats, market pick, odd, stake, confidence, theme).
   * `DELETE /api/predictions/:id` — Delete a saved card.
4. **Playwright Render Endpoint:**
   * `POST /api/export` — Accepts `{ predictionId (or cardData), format: 'png' | 'video', langs: ['en', 'es'] }` and invokes `renderer.js` to generate the 1080x1920 file(s) in `/exports`.

---

## Phase 4: Admin Dashboard & Live 9:16 HUD Canvas (`views/index.html`)

Evolve [`predifutbol_match_card_generator.html`](predifutbol_match_card_generator.html) into a database-backed split-screen studio:

### Left Panel (Control Center)
1. **Quick Load / Sync Bar:**
   * Select a saved card, load a preset, or pick a match from synced fixtures (`GET /api/fixtures`) to fill the form in 1 click.
2. **Teams & League Selector (Auto-Fill Enabled):**
   * Searchable dropdown/autocomplete for **League**, **Home Team**, and **Away Team** backed by the 6,100+ teams in PostgreSQL.
   * Selecting the **Home Team** automatically populates the **Home Logo URL** and the **Stadium / Venue** (`venue.name, venue.city`).
   * Manual override inputs remain editable if you ever want a custom name, emoji, or logo URL.
3. **Bilingual Match Stats (3 Lines):**
   * Language tabs (`EN Stats` / `ES Stats`) for the 3 key insight lines (`⚡ H2H`, `🔥 Home Form`, `🛡️ Away Form`).
4. **Structured Prediction & Value Box:**
   * Dropdown for **Prediction Market** (`type_predictions`) + **Value** (`prediction_value`), with an automatic bilingual preview (and optional manual text override).
   * Inputs for **Odd / Cuota** (e.g., `1.85`), **Stake** (`1–10`), and **Confidence Slider** (`10%–99%`).
5. **Action Bar:**
   * Language toggle (`EN` / `ES`) that flips the live preview immediately.
   * Theme switcher (`emerald`, `cyan`, `violet`, `amber`).
   * **"Save Card"**, **"Export PNG (EN + ES)"**, and **"Export 5s Video (EN + ES)"** buttons.

### Right Panel (Live 9:16 Video Preview Canvas)
* Preserves the glassmorphic Sports HUD aesthetic, neon glow borders, crest containers, 3-line key match data box, and animated confidence meter from [`predifutbol_match_card_generator.html`](predifutbol_match_card_generator.html).
* Displays optional **Odd (`1.85`)** and **Stake (`8/10`)** badges alongside the **Confidence (`78%`)** counter inside the Prediction HUD box.
* Supports `?render=1&lang=es` query parameters for clean headless rendering by Playwright (hiding the admin controls and rendering only the 9:16 canvas at full `1080x1920` resolution).

---

## Phase 5: Automated 1080x1920 Export Engine (`renderer.js`)

A headless **Playwright** module triggered from the dashboard or CLI:
1. Launches Chromium with a `1080x1920` viewport (or `380x675` at `deviceScaleFactor: 2.842` so the CSS proportions match the exact preview pixel-for-pixel at 1080p).
2. Opens the card in render-only mode (`/render?id=...&lang=en` or injects the card state directly).
3. **For PNG Export:** Waits for fonts, Lucide icons, and remote `api-sports.io` team crests to finish loading, sets the animation to its final state, and saves `/exports/{date}_{home}_vs_{away}_{lang}.png`.
4. **For Video Export:** Records the 5-second staggered HUD entrance and animated confidence counter (`triggerAnimationSequence()`) using Playwright's `recordVideo` at `1080x1920` and outputs to `/exports/{date}_{home}_vs_{away}_{lang}.webm` (or `.mp4`).
5. Supports **Batch Bilingual Export**: generates both the English and Spanish assets in a single click.

---

## Execution Checklist

- [x] **Step 1:** Initialize `package.json`, `.env.example`, and PostgreSQL database `predifutbol`.
- [x] **Step 2:** Create `db/migration.sql` and run `db/seed-from-yii2.js` to import countries, venues, leagues, teams, and prediction types from `predifutbolapi/migrations/predifutbol.sql`.
- [x] **Step 3:** Create `locales/en.json` and `locales/es.json` with HUD strings and all 22+ prediction market translations.
- [x] **Step 4:** Build `services/db.js`, `services/apiFootball.js`, and `server.js` REST endpoints.
- [x] **Step 5:** Upgrade `views/index.html` from `predifutbol_match_card_generator.html` with team/venue auto-fill, structured bilingual markets, Odd/Stake badges, and EN/ES toggle.
- [x] **Step 6:** Implement `renderer.js` with Playwright for 1080x1920 PNG & 5-second video export.
