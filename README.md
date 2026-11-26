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
       ├─ molina      HTML de microcinemolina.cl/cartelera (fecha, hora, director, año, cupos)
       ├─ instagram   Apify trae los posts nuevos; recolector/leer-post.js saca las funciones del texto con reglas (solo 06:30)
       └─ manual      datos/manual.json, para lo que no se puede leer solo
```

- **Gasto cero**: no usa IA. El plan gratis de Apify trae US$5 al mes y **corta** al gastarlos (no cobra); el actor
  `apify/instagram-post-scraper` cuesta ~US$2,7 por 1.000 posts y solo se piden los de los últimos 4 días.
- `datos/instagram.json` guarda 30 días de posts (texto, fecha, enlace): cada ejecución los vuelve a leer todos, así
  que un post que anuncia algo para dentro de tres semanas sigue contando.
- El lector de posts reconoce fechas en español («Lunes 30 de noviembre», «28, 29 y 30 de octubre», «este lunes»),
  horas y títulos (con año, en mayúsculas, entre comillas o tras la hora en una cartelera semanal). Si un post trae
  fecha pero no se puede saber qué película es (el título va solo en el afiche), la web lo muestra en «También
  anunciado en Instagram» con el enlace al post. Las pruebas usan posts reales (`test/muestras/posts-instagram.json`):
  si un post nuevo se lee mal, agrégalo ahí con lo que debería salir y ajusta el lector.
- Si una fuente falla, se mantienen sus funciones anteriores que aún no pasan y la web lo avisa abajo.
- Las salas y las cuentas de Instagram están en `recolector/salas.js`.

## Uso local

```bash
npm install
npx playwright install chromium
npm test                                        # pruebas sin red
node recolector/index.js cinemark molina        # solo algunas fuentes
APIFY_TOKEN=… node recolector/index.js          # todas (o el token en .env, que no se sube)
npm run dev
```

Requiere Node 22.18 o superior.

## Configuración (una sola vez)

1. **Pages:** *Settings → Pages → Source: GitHub Actions*.
2. **Secreto** `APIFY_TOKEN` (*Settings → Secrets and variables → Actions*): cuenta gratis en apify.com →
   *Settings → API & Integrations*. Sin él, la parte de Instagram queda "sin configurar" y el resto funciona igual.

## Agregar una función a mano

Para lo que no sale solo (p. ej. un ciclo anunciado en noticias.udec.cl o una función que solo está en un afiche),
en `datos/manual.json` (las que ya pasaron se descartan solas):

```json
[{ "sala": "teatro-udec", "titulo": "Rashomon", "anio": 1950, "director": "Akira Kurosawa",
   "inicio": "2026-11-16T19:00", "precio": "$2.000", "compra": "https://…" }]
```

## Estilos

Biblioteca de estilos v0.25.0, línea panel2 con acento petróleo.
