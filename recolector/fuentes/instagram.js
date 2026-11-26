/**
 * Instagram: Apify trae los posts nuevos de las cuentas de `CUENTAS_INSTAGRAM` y `leerPost` saca las funciones del
 * texto con reglas, sin IA (gasto cero). Los posts se guardan 30 días en `datos/instagram.json`: así a Apify solo
 * se le piden los de los últimos días (cobra por post) y un post que anuncia algo para dentro de tres semanas sigue
 * contando. Cada ejecución vuelve a leer todos los guardados, así que una mejora del lector vale también para ellos.
 *
 * Variable: APIFY_TOKEN. Sin ella la fuente queda "sin configurar". El plan gratis de Apify corta al gastar sus
 * US$5 del mes, no cobra.
 */
import { readFile, writeFile } from "node:fs/promises";
import { ApifyClient } from "apify-client";
import { leerPost } from "../leer-post.js";
import { CUENTAS_INSTAGRAM, SALAS } from "../salas.js";
import { clavePelicula, hoyChile, tituloLegible } from "../util.js";

const CACHE = new URL("../../datos/instagram.json", import.meta.url);
const DIAS_NUEVOS = 4; // corre a diario: 4 días cubren una o dos ejecuciones fallidas
const POSTS_POR_CUENTA = 6;
const DIAS_CACHE = 30;

export async function recolectar() {
  if (!process.env.APIFY_TOKEN) return { estado: "sin-configurar", mensaje: "Falta APIFY_TOKEN", peliculas: {}, funciones: [] };
  const cache = await leerCache();
  for (const post of await traerPosts()) cache[post.shortCode] = post.guardado;
  await guardarCache(cache);
  return { estado: "ok", mensaje: null, ...leerGuardados(cache) };
}

/** Funciones y avisos de los posts guardados. Función pura (probada en test/). */
export function leerGuardados(cache) {
  const salaDe = new Map(CUENTAS_INSTAGRAM.map((c) => [c.usuario, c.sala]));
  const salas = new Map(SALAS.map((s) => [s.id, s]));
  const peliculas = {};
  const funciones = [];
  const avisos = [];

  for (const p of Object.values(cache)) {
    const salaCuenta = salaDe.get(p.cuenta) ?? salaDe.get(p.autor);
    if (!salaCuenta) continue;
    const s = salas.get(salaCuenta);
    const { funciones: fs, aviso } = leerPost({ texto: p.texto, publicado: hoyChile(new Date(p.publicado)), diaHabitual: s?.diaHabitual ?? null, direccionSala: s?.direccion ?? null });
    const enTeatroUdec = (lugar) => /teatro\s+(udec|universidad de concepci)/i.test(lugar ?? "");

    for (const f of fs) {
      const id = clavePelicula(f.titulo);
      if (!id) continue;
      const titulo = tituloLegible(f.titulo);
      peliculas[id] ??= { titulo, anio: f.anio, director: f.director };
      peliculas[id].anio ??= f.anio;
      peliculas[id].director ??= f.director;
      funciones.push({
        sala: enTeatroUdec(f.lugar) ? "teatro-udec" : salaCuenta,
        pelicula: id,
        inicio: `${f.fecha}T${f.hora}`,
        formato: null,
        idioma: null,
        lugar: enTeatroUdec(f.lugar) ? null : f.lugar,
        precio: f.precio,
        compra: p.url,
        fuente: "instagram",
      });
    }
    if (aviso) avisos.push({ sala: enTeatroUdec(aviso.lugar) ? "teatro-udec" : salaCuenta, ...aviso, lugar: enTeatroUdec(aviso.lugar) ? null : aviso.lugar, url: p.url, publicado: p.publicado });
  }

  const unicas = dedup(funciones);
  // un aviso sobra si otro post de la misma sala ya dio funciones para esas fechas
  const conFunciones = new Set(unicas.map((f) => `${f.sala}|${f.inicio.slice(0, 10)}`));
  const avisosUtiles = avisos.filter((a) => !a.fechas.every((d) => conFunciones.has(`${a.sala}|${d}`)));
  return { peliculas, funciones: unicas, avisos: avisosUtiles };
}

async function traerPosts() {
  const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const run = await apify.actor("apify/instagram-post-scraper").call({
    username: CUENTAS_INSTAGRAM.map((c) => c.usuario),
    resultsLimit: POSTS_POR_CUENTA,
    onlyPostsNewerThan: `${DIAS_NUEVOS} days`,
    skipPinnedPosts: false,
  });
  if (run.status !== "SUCCEEDED") throw new Error(`Apify terminó en ${run.status}`);
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items
    .filter((p) => p.shortCode && p.caption)
    .map((p) => ({
      shortCode: p.shortCode,
      // la cuenta en cuyo perfil apareció (en un post colaborativo, el autor puede ser otra)
      guardado: { cuenta: cuentaDe(p.inputUrl) ?? p.ownerUsername, autor: p.ownerUsername, publicado: p.timestamp, url: p.url, texto: p.caption },
    }));
}

const cuentaDe = (url) => /instagram\.com\/([^/?#]+)/.exec(url ?? "")?.[1]?.toLowerCase() ?? null;

async function leerCache() {
  try {
    return JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    return {};
  }
}

async function guardarCache(cache) {
  const limite = new Date(Date.now() - DIAS_CACHE * 86_400_000).toISOString();
  const vigente = Object.fromEntries(
    Object.entries(cache)
      .filter(([, p]) => p.texto != null && (p.publicado ?? "") >= limite)
      .sort(([, a], [, b]) => a.publicado.localeCompare(b.publicado)),
  );
  await writeFile(CACHE, `${JSON.stringify(vigente, null, 1)}\n`);
}

const dedup = (funciones) => [...new Map(funciones.map((f) => [`${f.sala}|${f.pelicula}|${f.inicio}`, f])).values()];
