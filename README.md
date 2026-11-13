# Cartelera Conce

Todas las funciones de cine del Gran Concepción en una página: Cinemark, Cineplanet, salas independientes y
cineclubes que publican en Instagram. Solo muestra de hoy en adelante; no guarda historial.

**Web:** https://lucas-vergara.github.io/cartelera-conce/ · Investigación de fuentes: [`INVESTIGACION.md`](INVESTIGACION.md)

## Cómo funciona

```
GitHub Actions (06:30 y 14:00, hora de Chile)
  └─ node recolector/index.js  ──►  public/cartelera.json  ──►  commit  ──►  build (Vite)  ──►  GitHub Pages
       ├─ cinemark    HTML de la cartelera de cada cine: datos estructurados schema.org (ScreeningEvent)
       ├─ cineplanet  la página del cine en un navegador sin ventana (Playwright): lee los JSON que pide la página
       ├─ instagram   Apify trae los posts recientes; Claude saca las funciones del texto y del afiche (solo 06:30)
       └─ manual      datos/manual.json, para lo que no se puede leer solo (p. ej. Lunes Cinematográficos)
```

- Si una fuente falla, se mantienen sus funciones anteriores que aún no pasan y la web lo avisa abajo.
- `datos/instagram.json` guarda lo que Claude ya extrajo de cada post (30 días), para no pagar dos veces.
- Las salas y las cuentas de Instagram están en `recolector/salas.js`.

## Uso local

```bash
npm install
npx playwright install chromium
npm test                                   # pruebas sin red
node recolector/index.js cinemark cineplanet   # solo algunas fuentes
APIFY_TOKEN=… ANTHROPIC_API_KEY=… node recolector/index.js   # todas
npm run dev
```

Requiere Node 22.18 o superior.

## Configuración (una sola vez)

1. **Pages:** *Settings → Pages → Source: GitHub Actions*.
2. **Secretos** (*Settings → Secrets and variables → Actions*):
   - `APIFY_TOKEN`: cuenta gratis en apify.com → *Settings → API & Integrations*. El actor
     `apify/instagram-post-scraper` cuesta ~US$2,7 por 1.000 posts; 8 cuentas × 6 posts al día ≈ 1.400 al mes,
     dentro de los US$5 gratis mensuales.
   - `ANTHROPIC_API_KEY`: para leer los posts con Claude (Opus 5.5, esfuerzo bajo). Solo se lee cada post una vez.
   Sin estos secretos, la parte de Instagram queda "sin configurar" y el resto funciona igual.

## Agregar una función a mano

En `datos/manual.json` (las que ya pasaron se descartan solas):

```json
[{ "sala": "teatro-udec", "titulo": "Rashomon", "anio": 1950, "director": "Akira Kurosawa",
   "inicio": "2026-11-16T19:00", "precio": "$2.000", "compra": "https://…" }]
```

## Estilos

Biblioteca de estilos v0.25.0, línea panel2 con acento petróleo.
