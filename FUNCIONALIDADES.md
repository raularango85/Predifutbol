# PrediFutbol — Checklist de Funcionalidades y Reglas de Negocio

Guía funcional completa del sistema para la implementación en **Golang**.

---

## 1. Gestión y Sincronización de Partidos (API-Football v3)

* **Sincronización por fecha:**
  * Endpoint `POST /api/fixtures/sync` que recibe fecha (`YYYY-MM-DD`) y zona horaria (por defecto `America/Bogota`).
  * Consulta RapidAPI API-Football v3 (`/fixtures?date=...&timezone=...`) y realiza upsert en PostgreSQL (tablas `leagues`, `teams`, `venues`, `fixtures`).
  * **Regla crítica de BD:** Si `venue.id <= 0`, debe convertirse a `NULL` antes de insertar para evitar fallos de clave foránea en PostgreSQL.
* **Botones de acceso rápido "Hoy" y "Mañana":**
  * Calculan dinámicamente la fecha local en Bogotá y sincronizan/filtran en 1 clic.
* **Buscador en tiempo real con soporte de alias:**
  * Búsqueda por equipo local, visitante, liga o país.
  * Soporte de sintaxis de enfrentamiento (ej. `Nacional vs Once Caldas` ignora el `vs` y busca ambos equipos).
  * Sinónimos deportivos integrados (`Turkey` ↔ `Türkiye` ↔ `Turquía`; `Czech Republic` ↔ `Czechia` ↔ `República Checa`; `UNL` ↔ `UEFA Nations League`, etc.).
  * Normalización insensible a tildes y caracteres diacríticos (`Beşiktaş` → `besiktas`).
* **Filtro de partidos futuros (`upcomingOnly`):**
  * Interruptor visual `[✓] Solo partidos futuros (> hora actual)` activo por defecto.
  * Filtra en BD comparando `f.timestamp >= NOW() - 5 min` o `f.date >= NOW() - 5 min` para excluir partidos ya finalizados o en juego.
  * Ordenación cronológica ascendente para priorizar los partidos más cercanos en el tiempo.
  * Estado vacío inteligente: si ya se jugaron todos los partidos de la fecha o liga, ofrece botones *"Ver partidos pasados"* o *"Sincronizar Mañana"*.
* **Traductor inteligente de equipos al español (`teamTranslator`):**
  * Diccionario canónico de todas las selecciones nacionales FIFA (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC): `Germany` → `Alemania`, `Netherlands` → `Países Bajos`, `England` → `Inglaterra`, `Spain` → `España`, `United States` → `Estados Unidos`, `Ivory Coast` → `Costa de Marfil`, etc.
  * Clubes internacionales destacados: `Bayern Munich` → `Bayern Múnich`, `Inter Milan` → `Inter de Milán`, `Sporting CP` → `Sporting de Lisboa`, `Red Star Belgrade` → `Estrella Roja`.
  * Reglas automáticas por Regex:
    * Juveniles: `U23`, `U21`, `U20`, `U19`... → `Sub-21`, `Sub-19` (ej. `England U21` → `Inglaterra Sub-21`).
    * Femenino: `Women`, `(W)`, `W` → `Femenino` (ej. `Spain Women` → `España Femenino`).
    * Filiales: `II`, `2` → `B` (ej. `Celta de Vigo II` → `Celta de Vigo B`).
  * Autocompleta los nombres traducidos en el formulario en español manteniendo los campos 100% editables.
* **Autocompletado de formulario al seleccionar fixture:**
  * Carga automática de escudos, estadio/sede, competición/país, fecha y hora local.
  * Generación automática de 3 textos de estadísticas predeterminadas (H2H, racha local y racha visitante) con los nombres de los equipos traducidos.

---

## 2. Mercados de Predicción y Formateo de Picks

* **Catálogo de 18+ tipos de mercado estructurados (Yii2):**
  * `1`: Clásico / Ganador 1X2 (`1`, `2`, `X`, `1X`, `X2`, `12`).
  * `2`: Marcador Exacto (`2-1`, `1-0`, etc.).
  * `3` / `4`: Total de goles en el partido (+ / - X goles).
  * `5` / `6`: Goles del equipo local (+ / - X goles).
  * `7` / `8`: Goles del equipo visitante (+ / - X goles).
  * `9`: Ambos Equipos Marcan / BTTS (`YES` / `NO`).
  * `10` / `11`: Córners (+ / - X tiros de esquina).
  * `12` / `13`: Tarjetas (+ / - X tarjetas amarillas).
  * `14` / `15` / `16`: Hándicap Asiático (Local, Visitante, Partido).
  * `17` / `18`: Clásico 1er Tiempo y 2do Tiempo (1X2).
  * `19` / `20` / `21` / `22`: Goles en 1er Tiempo (+ / - X goles).
* **Formateador genérico de picks (`marketFormatter`):**
  * Convierte códigos técnicos a etiquetas profesionales para tarjeta y locución:
    * `1` → *"Gana Local"*, `2` → *"Gana Visitante"*, `X` → *"Empate"*, `1X` → *"Local o Empate"*.
    * `YES` → *"Ambos Equipos Marcan: SÍ"*, `NO` → *"Ambos Equipos Marcan: NO"*.
    * `+2.5` → *"Más de 2.5 Goles"*.
  * **Regla estricta:** No incrusta nombres de equipos en el pick para evitar errores de redacción en la tarjeta gráfica.
* **Métricas de valor deportivo:**
  * Cuota decimal (`odd`).
  * Nivel de confianza (1 a 10).
  * Probabilidad estimada en % (vinculada a la barra visual de la tarjeta).

---

## 3. Generador de Copy y SEO para TikTok

* **Generación de Copy / Caption:**
  * Gancho de cabecera contextual según la liga (ej. `🔥 ¡PRONÓSTICO LIGA BETPLAY COLOMBIA 🇨🇴! ⚽` o `UEFA NATIONS LEAGUE 🌍`).
  * Frase de intención de búsqueda para TikTok SEO:  
    `🔮 Predicción y probabilidad de victoria para [EquipoLocal] vs [EquipoVisitante] hoy.`
  * Pick recomendado, cuota y porcentaje de probabilidad estimada.
  * 3 viñetas con los datos clave del partido (H2H, forma local, forma visita).
  * Llamado a comentar (CTA de engagement algorítmico):  
    *`¿Cuál es tu marcador exacto para este partidazo? ¡Déjamelo en los comentarios! 👇💬`*
* **Generación de Hashtags:**
  * Tags de enfrentamiento: `#[Local]vs[Visita]`, `#Prediccion[Local]vs[Visita]`.
  * Tags de equipo: `#Pronostico[Local]`, `#Pronostico[Visita]`.
  * Tags de liga y país: `#LigaBetPlayDimayor`, `#FutbolColombiano`, `#NationsLeague`.
  * Tags de intención de búsqueda: `#ProbabilidadDeVictoria`, `#PronosticosFutbol`, `#TipsDeportivos`.
  * **Filtro de seguridad:** Cero palabras de apuestas explícitas (`stake`, `apuestas`, `casino`) para prevenir shadowban o penalización algorítmica.
* **Sincronización reactiva:** Se regenera automáticamente al editar cuota, estadio o equipos, salvo que el usuario haya escrito un texto manual.
* **Copiado rápido:** Botones dedicados para copiar solo la descripción o solo los hashtags con feedback visual de copiado.

---

## 4. Verificación y Liquidación de Resultados (Checker Service)

* **Liquidación automática en lote (`POST /api/predictions/check-all`):**
  * Busca predicciones en estado `PENDING`.
  * Consulta el marcador final en API-Football (`goals.home`, `goals.away`, estado `FT`, `AET`, `PEN`).
  * Evalúa matemáticamente las reglas de cada uno de los 18 mercados.
  * Marca `is_right = 1` (GANADA) o `is_right = 0` (PERDIDA) y estampa la fecha de liquidación.
* **Liquidación manual individual (`POST /api/predictions/:id/settle`):**
  * Permite ingresar goles local/visita manualmente para liquidar un partido sin consultar la API.
* **Métricas en tiempo real:**
  * Conteo total de predicciones ganadas, perdidas, pendientes y porcentaje de acierto (% win rate).

---

## 5. Laboratorio de Audio y Locución Neuronal

* **Generación de script deportivo:**
  * Limpia emojis, viñetas y caracteres no legibles.
  * Produce narración fluida en español:  
    *`"¡[EquipoLocal] recibe a [EquipoVisitante]! Nuestra predicción de valor: [Pick], a cuota [Cuota] y [Prob]% de probabilidad. ¡Síguenos en TikTok... ¡Somos PrediFutbol Colombia!"`*
* **Voces neuronales Edge-TTS:**
  * Voz primaria: `es-CO-GonzaloNeural` (acento colombiano natural).
  * Voces de respaldo: `es-CO-SalomeNeural`, `es-MX-JorgeNeural`.
* **Mezcla multicapa de audio (FFmpeg):**
  * **Pista 1:** Locución neuronal TTS normalizada.
  * **Pista 2:** SFX *Whoosh* en la apertura del video.
  * **Pista 3:** SFX *Ding* al momento de revelar la predicción.
  * **Pista 4:** Sonido ambiental de estadio con público en bucle atenuado (`bgm_stadium_crowd.mp3`).
  * **Pista 5:** Base musical deportiva a 120 BPM (`bgm_sport_beat.mp3`) de fondo.
* **Reproductor en cabina:** Escucha previa en el panel de control antes de exportar.

---

## 6. Motor de Exportación Visual 9:16 (1080×1920)

* **Formato vertical nativo:** Diseñado para pantalla completa móvil en TikTok, Instagram Reels y YouTube Shorts.
* **Paleta de acento visual:** 4 esquemas de color intercambiables (Esmeralda, Cian, Púrpura, Ámbar).
* **Exportación PNG:** Captura estática en alta definición.
* **Exportación MP4 (Video de 15 segundos a 30 FPS):**
  * Animación de entrada de tarjetas y barra de probabilidad.
  * Reloj virtual determinista: pausa y avanza exactamente `1/30` de segundo por frame para evitar saltos o pérdida de fotogramas en servidores con recursos limitados.
  * Muxing automático de la secuencia de video con el audio multicapa generado.
* **Gestión de cola de exportación:**
  * Encolado asíncrono con sondeo de progreso (`percent`, `stage`, `frame`, `totalFrames`, `etaSec`).

---

## 7. Panel de Control y CRUD de Predicciones

* Tabla paginada de predicciones guardadas con búsqueda en vivo.
* Indicadores visuales de estado: `PENDIENTE`, `GANADA` (verde), `PERDIDA` (rojo).
* Edición completa de predicciones existentes con detección de datos obsoletos (limpia datos residuales de equipos anteriores y recalcula los tags).
* Eliminación con modal de confirmación.
* Modales de vista rápida de tarjeta y Laboratorio de Audio.
