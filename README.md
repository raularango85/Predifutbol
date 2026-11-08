# ⚽ PrediFutbol Local Engine v2

Motor local para la gestión, predicción deportiva y generación automatizada de tarjetas y videos en formato vertical 9:16 (1080x1920) para **TikTok**, **Instagram Reels** y **YouTube Shorts**.

---

## 🚀 Características Principales

- **Panel de Control CRUD:** Tabla completa con búsqueda en tiempo real, filtros y paginación para administrar pronósticos deportivos.
- **Autocompletado de Equipos & Ligas:** Base de datos con más de 6,139 equipos con escudos en alta resolución y estadios vinculados.
- **Sincronización con API-Football v3:** Búsqueda directa de partidos en vivo y cuotas por fecha.
- **Motor de Renderizado Determinista (Playwright + FFmpeg):**
  - Generación de videos HD 1080x1920 a 30/60 FPS con reloj virtual fotograma a fotograma (sin congelamientos ni pérdida de fluidez).
  - Exportación de instantáneas PNG de alta calidad.
- **Banda Sonora y Narración Neuronal con IA (Edge-TTS + FFmpeg):**
  - Locución deportiva automática en español (`es-CO-GonzaloNeural`, `es-MX-JorgeNeural`, `es-AR-TomasNeural`, etc.) y en inglés.
  - Beat rítmico electrónico deportivo de fondo (120 BPM) con volumen atenuado para resaltar la voz.
  - Efectos de sonido (*Whoosh* y *Ding*) sincronizados con las animaciones de la tarjeta.
  - Mezcla limpia y masterizada a 15 segundos exactos sin cortes.
- **Laboratorio de Audio Integrado:** Reproductor en el navegador para escuchar y probar voces y efectos antes de renderizar.
- **Soporte Bilingüe Nativo (Español / Inglés).**
- **Persistencia en PostgreSQL & Fallback Offline:** Base de datos relacional con respaldo automático en JSON (`db/yii2-seed-cache.json`).

---

## 🛠️ Requisitos Previos

- **Node.js** v18 o superior
- **Python** 3.10 o superior (para Edge-TTS)
- **PostgreSQL** (Opcional, puerto por defecto `5434` o configurable en `.env`)

---

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd predifutbol
   ```

2. **Instalar dependencias de Node.js:**
   ```bash
   npm install
   ```

3. **Instalar navegadores de Playwright:**
   ```bash
   npx playwright install chromium
   # O utilizar los navegadores del sistema (Edge / Chrome)
   ```

4. **Instalar Edge-TTS para la narración con IA:**
   ```bash
   pip install edge-tts
   ```

5. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` con tus credenciales de PostgreSQL y claves de API deseadas.

---

## 🏃‍♂️ Ejecución

Inicia el servidor local:
```bash
npm start
```
O directamente con Node:
```bash
node server.js
```

Abre tu navegador en:
```
http://localhost:3000
```

---

## 📂 Estructura del Proyecto

```
predifutbol/
├── db/                     # Migraciones SQL y caché de equipos/mercados
├── exports/                # Videos MP4 y snapshots PNG generados (ignorado en git)
├── locales/                # Diccionarios de internacionalización (EN / ES)
├── public/                 # Archivos estáticos, audio base y librerías cliente
│   └── audio/              # Beats, efectos de sonido y muestras de voz
├── services/               # Lógica de base de datos, API-Football y motor de audio
│   ├── audioService.js     # Mezclador FFmpeg y síntesis de voz Edge-TTS
│   ├── apiFootball.js      # Conexión con API-Football v3
│   └── db.js               # Conexión a PostgreSQL y fallback JSON
├── views/                  # Vistas frontend (index.html con TailwindCSS)
├── renderer.js             # Motor de exportación 1080x1920 con Playwright
├── server.js               # Servidor Express y endpoints de API
├── .env.example            # Plantilla de variables de entorno segura
└── .gitignore              # Reglas de exclusión para Git
```

---

## 📄 Licencia

Uso privado y comercial para la marca **PrediFutbol**.
