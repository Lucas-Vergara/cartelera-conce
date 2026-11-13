/**
 * Cineplanet: la web es una SPA que pide tres JSON (`/v3/api/cache/{cinemascache,moviescache,sessioncache}`)
 * con una clave de suscripción propia. No usamos esa clave: abrimos la página del cine en un navegador sin
 * ventana, como cualquier visitante, y leemos las respuestas que pide la propia página.
 */
import { chromium } from "playwright";
import { clavePelicula, horaLocal, minutos, separarFormato, tituloLegible } from "../util.js";

const PAGINA = "https://www.cineplanet.cl/cines/cp-concepcin";
const CINE_ID = "0000000002"; // CP Concepción (Mall del Centro)
const SALA = "cineplanet-concepcion";

/** Funciones y películas a partir de los JSON de la página. Función pura (probada en test/). */
export function leerCaches({ movies, sessions }) {
  const peliculas = {};
  const porId = new Map();
  for (const m of movies.movies ?? []) {
    const cine = (m.cinemas ?? []).find((c) => c.cinemaId === CINE_ID);
    if (!cine) continue;
    const { titulo, formato } = separarFormato(m.title);
    const id = clavePelicula(titulo);
    peliculas[id] ??= {
      titulo: tituloLegible(titulo),
      duracionMin: minutos(m.runTime),
      genero: genero(m.genre),
      clasificacion: m.ratingDescription || null,
      sinopsis: m.synopsis || null,
      poster: m.posterUrl || null,
      trailer: m.trailer || null,
    };
    for (const d of cine.dates ?? []) for (const s of d.sessions ?? []) porId.set(s, { id, formato });
  }

  const funciones = [];
  for (const s of sessions.sessions ?? []) {
    const pelicula = porId.get(s.id);
    const inicio = horaLocal(s.showtime);
    if (!pelicula || !inicio) continue;
    funciones.push({
      sala: SALA,
      pelicula: pelicula.id,
      inicio,
      formato: [...new Set([...(s.formats ?? []).filter((f) => f !== "CONV").map((f) => (f === "IV" ? "INFINITY VISION" : f)), pelicula.formato].filter(Boolean))].join(" ") || "2D",
      idioma: idioma(s.languages),
      sala_numero: null,
      compra: PAGINA,
      fuente: "cineplanet",
    });
  }
  return { peliculas, funciones };
}

/** Cineplanet escribe los géneros en mayúscula y sin tildes ("ACCION", "CIENCIA FICCION"). */
const TILDES = { Accion: "Acción", Animacion: "Animación", "Ciencia ficcion": "Ciencia ficción", Fantasia: "Fantasía", Biografia: "Biografía", Musica: "Música", Musical: "Musical", Romantica: "Romántica", Documental: "Documental" };
const genero = (g) => {
  if (!g) return null;
  const t = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
  return TILDES[t] ?? t;
};

const idioma = (lista = []) => {
  const t = lista.join(" ").toUpperCase();
  return t.includes("SUBT") ? "Subtitulada" : t.includes("DOBL") ? "Doblada" : null;
};

export async function recolectar() {
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    const esperar = (nombre) =>
      pagina.waitForResponse((r) => r.url().includes(`/v3/api/cache/${nombre}`) && r.ok(), { timeout: 60_000 }).then((r) => r.json());
    const respuestas = Promise.all([esperar("moviescache"), esperar("sessioncache")]);
    await pagina.goto(PAGINA, { waitUntil: "domcontentloaded" });
    const [movies, sessions] = await respuestas;
    return leerCaches({ movies, sessions });
  } finally {
    await navegador.close();
  }
}
