/**
 * Funciones cargadas a mano en `datos/manual.json`, para lo que no se puede leer solo (p. ej. un ciclo de los
 * Lunes Cinematográficos anunciado en noticias.udec.cl). Formato de cada elemento:
 *
 *   { "sala": "teatro-udec", "titulo": "Rashomon", "anio": 1950, "director": "Akira Kurosawa",
 *     "inicio": "2026-11-16T19:00", "precio": "$2.000", "compra": "https://…" }
 *
 * Las que ya pasaron se descartan solas; no hace falta borrarlas.
 */
import { readFile } from "node:fs/promises";
import { clavePelicula, tituloLegible } from "../util.js";

const ARCHIVO = new URL("../../datos/manual.json", import.meta.url);

export async function recolectar() {
  const lista = JSON.parse(await readFile(ARCHIVO, "utf8"));
  const peliculas = {};
  const funciones = [];
  for (const f of lista) {
    const id = clavePelicula(f.titulo);
    if (!id || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.inicio ?? "")) throw new Error(`Función mal escrita en datos/manual.json: ${JSON.stringify(f)}`);
    peliculas[id] ??= { titulo: tituloLegible(f.titulo), anio: f.anio ?? null, director: f.director ?? null, duracionMin: f.duracionMin ?? null };
    funciones.push({ sala: f.sala, pelicula: id, inicio: f.inicio, formato: null, idioma: f.idioma ?? null, precio: f.precio ?? null, lugar: f.lugar ?? null, compra: f.compra ?? null, fuente: "manual" });
  }
  return { peliculas, funciones };
}
