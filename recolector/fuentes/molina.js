/**
 * Microcine Molina: su web (microcinemolina.cl/cartelera) lista cada función con fecha y hora (`<time datetime>`),
 * título, director, año, duración, aporte y cupos. Es HTML del servidor: basta un fetch, sin navegador ni Instagram.
 * La sinopsis sale de la ficha de cada película (`og:description`).
 */
import { clavePelicula, horaLocal } from "../util.js";

const BASE = "https://www.microcinemolina.cl";
const CABECERAS = { "user-agent": "cartelera-conce (github.com/Lucas-Vergara/cartelera-conce)" };

const texto = (html) =>
  (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const clase = (bloque, nombre) => new RegExp(`class="[^"]*\\b${nombre}\\b[^"]*"[^>]*>([\\s\\S]*?)</`, "i").exec(bloque)?.[1];

/** Funciones y películas a partir del HTML de la cartelera. Función pura (probada en test/). */
export function leerCartelera(html) {
  const articulos = [...html.matchAll(/<article class="funcion-item[^"]*"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  if (!articulos.length && !/cartelera-mes|lista-funciones/.test(html)) throw new Error("La página no trae la lista de funciones: Microcine Molina cambió su web");

  const peliculas = {};
  const funciones = [];
  for (const a of articulos) {
    const inicio = horaLocal(/<time[^>]*datetime="([^"]+)"/.exec(a)?.[1]);
    const enlace = /funcion-item__titulo[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(a);
    const titulo = texto(enlace?.[2] ?? clase(a, "funcion-item__titulo"));
    const id = clavePelicula(titulo);
    if (!id || !inicio) continue;

    const [director, anio] = texto(clase(a, "funcion-item__ficha")).split(" · ");
    const duracion = /(\d+)\s*min/.exec(texto(clase(a, "funcion-item__datos")))?.[1];
    peliculas[id] ??= {
      titulo,
      director: director || null,
      anio: /^\d{4}$/.test(anio ?? "") ? Number(anio) : null,
      duracionMin: duracion ? Number(duracion) : null,
      ficha: enlace?.[1] ?? null,
    };

    const detalle = texto(clase(a, "funcion-item__hora")).split(" · ").slice(1).join(" · ");
    const reserva = /href="([^"]*\/reservar\/[^"]+)"/.exec(a)?.[1];
    funciones.push({
      sala: "microcine-molina",
      pelicula: id,
      inicio,
      formato: null,
      idioma: null,
      precio: /aporte|paga lo que puedas/i.test(detalle) ? "Aporte voluntario" : /liberada|gratis|gratuita/i.test(detalle) ? "Gratis" : detalle || null,
      agotada: /funcion-item--agotada|cupo--agotado/.test(a),
      compra: reserva ?? enlace?.[1] ?? `${BASE}/cartelera`,
      fuente: "molina",
    });
  }
  return { peliculas, funciones };
}

export async function recolectar() {
  const r = await fetch(`${BASE}/cartelera`, { headers: CABECERAS });
  if (!r.ok) throw new Error(`${BASE}/cartelera respondió ${r.status}`);
  const { peliculas, funciones } = leerCartelera(await r.text());

  for (const p of Object.values(peliculas)) {
    const ficha = p.ficha;
    delete p.ficha;
    if (!ficha) continue;
    try {
      const html = await (await fetch(ficha, { headers: CABECERAS })).text();
      const sinopsis = /<meta property="og:description" content="([^"]*)"/.exec(html)?.[1];
      if (sinopsis) p.sinopsis = texto(sinopsis);
    } catch {
      /* sin sinopsis: la película se muestra igual */
    }
  }
  return { peliculas, funciones };
}
