# ⚽ PrediFutbol • Guía de Ejecución & Desarrollo

Esta guía explica cómo ejecutar, desarrollar y compilar la nueva arquitectura de **PrediFutbol** con **Backend en Go (Clean Architecture)** y **Frontend en React 19 + TypeScript (Vite + Tailwind CSS)**.

---

## 🚀 Opción 1: Ejecución Rápida (Unificado / Producción)

El backend de Go está configurado para servir automáticamente la API REST y la aplicación React compilada (`frontend/dist`) desde un único puerto.

### 1. Iniciar el Servidor Go
Desde la raíz del proyecto (`c:\git\predifutbol`):
```powershell
.\predifutbol_server.exe
```
O si deseas compilar y ejecutar directamente con Go:
```powershell
cd backend
go run ./cmd/server
```

### 2. Abrir en tu Navegador
Abre la aplicación en:
```text
http://localhost:3001
```

* **Frontend React:** Carga la interfaz completa de **Studio 9:16**, editor de tarjetas, autocompletado de equipos y tabla de predicciones.
* **Backend REST API:** Disponible bajo `/api/*` (`/api/status`, `/api/teams`, `/api/predictions`, etc.).
* **Lienzo Headless:** Disponible en `http://localhost:3001/render-canvas` (utilizado para capturas PNG y renderizado de video en alta definición).

---

## 💻 Opción 2: Modo Desarrollo (Hot Reload en Tiempo Real)

Para trabajar activamente en el código con recarga en vivo de React y backend independiente:

### Terminal 1 — Backend en Go
Inicia el backend en el puerto `3001`:
```powershell
cd backend
go run ./cmd/server
```
> El backend se conectará automáticamente a PostgreSQL si está activo en tu equipo, o utilizará el almacenamiento local en memoria y JSON (`db/yii2-seed-cache.json` y `db/local-store.json`) si PostgreSQL no está disponible.

### Terminal 2 — Frontend en React (Vite)
Inicia el servidor de desarrollo de Vite en el puerto `5173`:
```powershell
cd frontend
npm run dev
```

Abre en tu navegador:
```text
http://localhost:5173
```
> Vite está preconfigurado con un proxy en `vite.config.ts` que redirige automáticamente todas las peticiones a `/api`, `/public`, `/images` y `/exports` hacia el backend en `http://localhost:3001`.

---

## 🛠️ Cómo Compilar el Proyecto

### 1. Compilar el Frontend React
Cuando realices cambios en `frontend/src/`:
```powershell
cd frontend
npm run build
```
Esto genera la carpeta optimizada y minificada `frontend/dist/`.

### 2. Compilar el Binario de Go
Para generar el ejecutable autónomo `predifutbol_server.exe`:
```powershell
cd backend
go build -o ../predifutbol_server.exe ./cmd/server
```

### 3. Ejecutar Pruebas Unitarias
Para verificar la integridad de la arquitectura y reglas de negocio:
```powershell
cd backend
# Pruebas de repositorios y persistencia
go test -v ./internal/repository/...

# Pruebas de lógica de negocio (evaluación de reglas, TikTok, etc.)
go test -v ./internal/usecase/...
```

---

## 📍 Mapa de Endpoints del Backend

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/status` | Estado del motor Go y modo de base de datos (PostgreSQL o JSON) |
| `GET` | `/api/localize/:lang` | Diccionarios bilingües (`es.json`, `en.json`) |
| `GET` | `/api/teams?q=...` | Búsqueda ultrarrápida entre más de 6,100 equipos con escudos |
| `GET` | `/api/leagues?q=...` | Búsqueda entre más de 940 ligas oficiales |
| `GET` | `/api/type-predictions` | Mercados de apuestas disponibles (1X2, Over/Under, BTTS, etc.) |
| `GET` | `/api/fixtures` | Partidos sincronizados con filtro por fecha |
| `POST` | `/api/fixtures/sync` | Sincronización directa con RapidAPI API-Football v3 |
| `GET` | `/api/predictions` | Listado paginado con búsqueda y orden por fecha |
| `POST` | `/api/predictions` | Guardar o actualizar tarjeta de pronóstico |
| `GET` | `/api/predictions/:id` | Obtener pronóstico por ID |
| `DELETE` | `/api/predictions/:id` | Eliminar pronóstico |
| `POST` | `/api/predictions/:id/settle`| Evaluar resultado real (Won / Lost) según goles |
| `POST` | `/api/tiktok/generate` | Generar copy persuasivo y hashtags algorítmicos |
| `POST` | `/api/export` | Iniciar exportación en segundo plano (Video MP4 o Snapshot PNG) |
| `GET` | `/api/export/jobs/:id` | Consultar estado, progreso (0-100%) y enlaces de descarga |

---

## 🎯 Estado de la Migración

- ✅ **Fase 1 (Backend Go Foundation):** Arquitectura Limpia (`internal/domain`, `internal/repository`), persistencia dual (PostgreSQL + caché en memoria de 6,139 equipos y 941 ligas + JSON store).
- ✅ **Fase 2 (Casos de Uso & API):** Motor de reglas de apuestas (1X2, BTTS, Over/Under, Marcador Exacto), sincronización API-Football v3, generador de TikTok y capa HTTP Gin con `log/slog`.
- ✅ **Fase 3 (Motor Multimedia Go):**
  - Locución deportiva neuronal IA con Edge-TTS (`pkg/audio`).
  - Mezcla y ducking de audio estéreo con efectos (*Whoosh*, *Ding*, estadio) en FFmpeg.
  - Renderizado headless 1080x1920 con **`chromedp`** (`pkg/media`) y reloj virtual.
  - Exportación determinista de videos MP4 a 30 FPS y snapshots PNG en alta definición.
- ✅ **Fase 4 (Frontend React 19 + TypeScript):** Arquitectura por módulos (`features/studio`, `features/predictions`, `features/tiktok`, `features/export`, `features/fixtures`), panel de **Carga Rápida de Partidos (1-Click Sync)** con autocompletado en vivo de fixtures (liga, equipos, escudos, estadio, fecha y estadísticas dinámicas H2H), lienzo 9:16 en vivo y modal de exportación en tiempo real.
- ✅ **Fase 5 (Distribución Unificada):** El binario `predifutbol_server.exe` sirve simultáneamente la aplicación React completa y la API REST en un único puerto (`3001`).
