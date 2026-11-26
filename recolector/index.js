/**
 * Arma `public/cartelera.json` con las funciones de hoy en adelante. Sin base de datos ni historial: cada
 * ejecución reemplaza el archivo. Si una fuente falla, se conservan sus funciones de la ejecución anterior
 * que aún no pasan, y la web lo dice.
 *
 *   node recolector/index.js                 # todas las fuentes
 *   node recolector/index.js cinemark        # solo algunas (las demás se copian de la ejecución anterior)
 */
import { readFile, writeFile } from "node:fs/promises";
import * as cinemark from "./fuentes/cinemark.js";
import * as cineplanet from "./fuentes/cineplanet.js";
import * as instagram from "./fuentes/instagram.js";
import * as manual from "./fuentes/manual.js";
import * as molina from "./fuentes/molina.js";
import { SALAS } from "./salas.js";
import { ahoraChile, vigentes } from "./util.js";

const FUENTES = { cinemark, cineplanet, molina, instagram, manual };
const SALIDA = new URL("../public/cartelera.json", import.meta.url);

const pedidas = process.argv.slice(2);
const anterior = await leerAnterior();
const ahora = ahoraChile();
const generado = new Date().toISOString();

const peliculas = {};
const funciones = [];
const avisos = [];
const estados = [];

for (const [id, fuente] of Object.entries(FUENTES)) {
  const previa = anterior.fuentes?.find((f) => f.id === id);
  const copiarAnterior = () => {
    funciones.push(...(anterior.funciones ?? []).filter((f) => f.fuente === id));
    avisos.push(...(anterior.avisos ?? []).filter((a) => a.fuente === id));
    for (const f of anterior.funciones ?? []) if (f.fuente === id && anterior.peliculas?.[f.pelicula]) peliculas[f.pelicula] ??= anterior.peliculas[f.pelicula];
  };
  if (pedidas.length && !pedidas.includes(id)) {
    copiarAnterior();
    if (previa) estados.push(previa);
    continue;
  }
  const inicio = Date.now();
  try {
    const r = await fuente.recolectar();
    if (r.estado === "sin-configurar") {
      estados.push({ id, estado: "sin-configurar", mensaje: r.mensaje, actualizado: null });
      continue;
    }
    for (const [k, p] of Object.entries(r.peliculas)) peliculas[k] = { ...p, ...peliculas[k], ...soloConDatos(p) };
    funciones.push(...r.funciones);
    avisos.push(...(r.avisos ?? []).map((a) => ({ ...a, fuente: id })));
    estados.push({ id, estado: r.estado ?? "ok", mensaje: r.mensaje ?? null, actualizado: generado, funciones: r.funciones.length });
    console.log(`✓ ${id}: ${r.funciones.length} funciones en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
    copiarAnterior();
    estados.push({ id, estado: "error", mensaje: e.message, actualizado: previa?.actualizado ?? null });
  }
}

const futuras = vigentes(funciones, ahora);
const usadas = new Set(futuras.map((f) => f.pelicula));
const cartelera = {
  generado,
  salas: SALAS,
  peliculas: Object.fromEntries(Object.entries(peliculas).filter(([k]) => usadas.has(k)).sort(([a], [b]) => a.localeCompare(b))),
  funciones: futuras,
  avisos: avisos.filter((a) => a.fechas.some((d) => d >= ahora.slice(0, 10))).sort((a, b) => proxima(a, ahora).localeCompare(proxima(b, ahora))),
  fuentes: estados,
};
await writeFile(SALIDA, `${JSON.stringify(cartelera)}\n`);
console.log(`${futuras.length} funciones de ${usadas.size} películas → public/cartelera.json`);
if (estados.every((e) => e.estado === "error")) process.exit(1);

async function leerAnterior() {
  try {
    return JSON.parse(await readFile(SALIDA, "utf8"));
  } catch {
    return {};
  }
}

/** La próxima fecha de un aviso que aún no pasa. */
function proxima(aviso, ahora) {
  return aviso.fechas.find((d) => d >= ahora.slice(0, 10)) ?? "";
}

/** Los campos con valor de una película, para que una fuente con más datos complete a otra. */
function soloConDatos(p) {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ""));
}
