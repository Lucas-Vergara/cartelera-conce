# Cartelera Gran Concepción — investigación de fuentes

Revisado el 13-nov-2026 (web + Claude in Chrome). Fuera de alcance: Cinemark Arauco Coronel (lejos) y
Artistas del Acero (cerró).

## Salas y fuentes

### Cadenas (horarios completos, actualización diaria)

| Sala | Dirección | Fuente | Qué trae |
|---|---|---|---|
| Cinemark Mallplaza Mirador Bío Bío | Los Carrera Pte. 301, Concepción | `cinemark.cl/cartelera/cinemark-mallplaza-mirador-bio-bio` | ~6 días; título, duración, clasificación, formato (2D/3D/XD/DBOX/Premier/Infinity), idioma, hora, disponibilidad de butacas. Sin precio. |
| Cinemark Mallplaza Trébol | Av. Alessandri 3177, Talcahuano | `cinemark.cl/cartelera/cinemark-mallplaza-trebol` | Igual. Cine en remodelación 2026–2028 (1.818 butacas). |
| Cineplanet Concepción (Mall del Centro) | Barros Arana 1068, Concepción, 7 salas | `cineplanet.cl/cines/cp-concepcin` | ~10 días; título, género, duración, clasificación, formato, doblada/subtitulada, hora, precios de boletería por día (2D $6.200 / 3D $5.800 general). Horario = inicio de publicidad. |

**Cómo leerlas sin navegador (revisado en Chrome el 13-nov-2026):**

- **Cinemark**: `GET https://www.cinemark.cl/cartelera/{slug-cine}` (Next.js con SSR). El HTML trae un
  `<script type="application/ld+json">` schema.org `MovieTheater` con `event[]` de `ScreeningEvent`
  (~180 por cine, 6 días): `startDate` (ojo: viene como `2026-11-13T21:00:00.000Z-05:00`, la hora es la
  local que se ve en pantalla aunque diga Z), `videoFormat` («2D + PREMIER»), `location.name` (cine + sala),
  `offers.url` (compra), `workPresented` {name, duration ISO, image}. El idioma (doblada/subtitulada) no
  viene en el JSON-LD; está en el payload RSC (`self.__next_f`) o en el texto de la página. No hay llamadas
  XHR para la cartelera. Slugs: `cinemark-mallplaza-mirador-bio-bio`, `cinemark-mallplaza-trebol`.
- **Cineplanet**: SPA que lee tres JSON públicos (sin login): `/v3/api/cache/cinemascache` (11 cines;
  Concepción = ID `0000000002`, con lat/lng, formatos y tarifas por día), `/v3/api/cache/moviescache`
  (42 películas: título, sinopsis, género, duración, clasificación, director, reparto, póster, tráiler,
  y por cine las fechas con sus IDs de función) y `/v3/api/cache/sessioncache` (~2.600 funciones de todo
  Chile: id `cine-función`, `showtime`, `formats`, `languages`). Se filtra por el prefijo `0000000002-`.

Fichas de película de Cinemark (`/pelicula/{slug}`) traen sinopsis, género, estreno y distribuidor.

No hay Cinépolis, Muvix ni Cine Star en el Gran Concepción.

### Salas independientes y ciclos (Instagram casi siempre)

| Espacio | Lugar | Frecuencia | Fuente | Formato de la publicación |
|---|---|---|---|---|
| Microcine Molina | Orompello 104, Concepción (12 butacas) | Mié–dom, 18:00 y 20:30 | **Web `microcinemolina.cl/cartelera`** (desde nov-2026, con reservas y cupos; es la fuente que se usa) e IG `@microcinemolina` (~6.200 seg.) | Post semanal «La cartelera de esta semana»: la **leyenda** trae días, hora, título, año y duración en texto. Aporte voluntario. Ya funcionando (ciclo de cine iraní en nov). |
| CineSecreto | Icebar, Ongolmo 1305, Concepción | Lunes 20:00 (horario de verano; antes 19:30) | IG `@cinesecreto_ccp` (~5.900 seg.) | Un post por función; leyenda con título, año, fecha, hora y lugar. |
| Lunes Cinematográficos (Teatro UdeC) | O'Higgins 660, Concepción | Lunes 19:00, ciclos mensuales | noticias.udec.cl (etiqueta «Lunes Cinematográficos»), IG `@festivalbiobiocine`, venta Ticketmaster | Una nota por ciclo con títulos y fechas. teatroudec.cl solo vende entradas y tiene enlaces spam de apuestas: no usar. |
| Cineclub FI UdeC | Facultad de Ingeniería UdeC + Teatro UdeC | Ciclos; gratis con cineforo | IG `@cineclubfiudec` (~7.300 seg.) | Afiches; también «Conversatorios de cine» en Librería Marta Brunet. |
| Cineclub Truffaut | Plan B (Caupolicán 1172), UCSC, Biblioteca Municipal | 1–2 veces al mes | IG `@clubdecinetruffaut` (~3.900 seg.) | Afiches. |
| Videodromo | Auditorio Facultad de Historia UCSC | Ciclos, ~17:00 | IG `@videodromo_` | Afiche con título, director, fecha, hora y lugar dentro de la imagen. |
| Cine Arte Windsor | Bares (p. ej. Bar Callejón, Cochrane 1269) | Ciclos temáticos | IG `@cineartewindsor` | Leyenda muy completa (título, año, duración, director, reparto, sinopsis). Último post visto: feb-2026 → verificar si sigue activo. |
| Cineclub Umbral (Duoc UC) | Duoc Concepción | Semestral | IG `@cineclub.umbral` | Por revisar. |
| Cineclub AAC (Duoc UC) | — | — | IG `@cineclub.aac` | Por revisar. |
| Cineclub Educación UdeC | Facultad de Educación UdeC | — | IG `@cineclubeduca` | Por revisar. |
| Cineclub Penco | Penco | Hoy publica sobre todo talleres | IG `@cineclubpenco` | Baja prioridad. |
| Teatro Biobío | Concepción | Cine ocasional | teatrobiobio.cl (WordPress), Ticketplus | Hoy la cartelera no tiene cine. Baja prioridad. |

### Festivales (eventos puntuales con programa completo)

- BioBioCine — noviembre (2026: 2–7 nov). festivalbiobiocine.cl, programa PDF.
- Frontera Sur — junio, entrada liberada.
- Marcinefest / Festival Internacional de Cine del Mar — abril–mayo. marcinefest.cl.
- SANFIC Educa (extensión Concepción).

Referencias: Butaca Conce «10 cineclubs imperdibles» (butacaconce.periodismoudec.cl/10-cineclub-en-concepcion/),
Diario Concepción 21-jul-2026 (cineclubes penquistas), Radio UdeC 20-oct-2026 (Microcine Molina).

## Revisión con posts reales (25-nov-2026, Apify)

39 posts de los últimos 30 días de las 7 cuentas, por US$0,10:

- **El texto basta casi siempre**: Fiudec, Videodromo, CineSecreto, Corcudec y Molina ponen película, fecha y hora en
  la leyenda. Truffaut puso el título solo en el afiche. Con reglas (sin IA) salen todas las funciones anunciadas en
  texto; lo que no se puede leer queda como aviso con enlace al post.
- **Posts colaborativos**: aparecen en el perfil de una cuenta con otro autor (Corcudec, Bitácora de Cine,
  El Desconcierto en el de @festivalbiobiocine). La sala se asigna por el perfil donde apareció (`inputUrl`).
- **@corcudec** anuncia cada función de los Lunes Cinematográficos (título, año, fecha, hora, Teatro UdeC): se suma.
- **Cine Arte Windsor**: sin posts en 30 días.
- Microcine Molina abrió su web con la cartelera y reservas en línea: se lee de ahí y no de Instagram.

## Conclusiones para el diseño

1. **Tres tipos de fuente**: cadenas (scraper con navegador, diario), Instagram (texto de la leyenda +
   imagen, semanal) y notas/webs de ciclos y festivales (manual o semiautomático).
2. **Instagram**: casi todos ponen los datos en la leyenda (ver la revisión con posts reales) → se leen con reglas,
   sin IA, para que el gasto sea cero. Lo que va solo en el afiche queda como aviso con enlace al post.
   Leer IG automáticamente: Business Discovery API de Meta (requiere cuenta IG de empresa propia) o carga
   asistida (pegar el link del post y extraer). Scraping directo choca con los términos de Meta.
3. **Revisión humana** para lo extraído de Instagram antes de publicarlo (las fechas vienen como «lunes 9»).
4. **TMDB** como llave común de películas (póster, director, sinopsis), sobre todo para cine clásico.
