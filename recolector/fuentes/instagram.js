/**
 * Instagram: Apify trae los posts recientes de las cuentas de `CUENTAS_INSTAGRAM` y Claude saca las funciones
 * del texto y del afiche. Lo extraído de cada post se guarda en `datos/instagram.json` para no pagar dos veces
 * por el mismo post (no es historial: se borra lo de más de 30 días).
 *
 * Variables: APIFY_TOKEN y ANTHROPIC_API_KEY. Sin APIFY_TOKEN la fuente queda "sin configurar".
 */
import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ApifyClient } from "apify-client";
import { z } from "zod";
import { CUENTAS_INSTAGRAM } from "../salas.js";
import { clavePelicula, hoyChile, tituloLegible } from "../util.js";

const CACHE = new URL("../../datos/instagram.json", import.meta.url);
const DIAS_POSTS = 10; // posts más viejos casi nunca anuncian funciones futuras
const POSTS_POR_CUENTA = 6;
const DIAS_CACHE = 30;

const Extraccion = z.object({
  funciones: z.array(
    z.object({
      titulo: z.string(),
      anio: z.number().int().nullable(),
      director: z.string().nullable(),
      fecha: z.string().describe("YYYY-MM-DD"),
      hora: z.string().describe("HH:MM, 24 horas"),
      lugar: z.string().nullable().describe("Nombre y dirección del lugar si el post lo dice"),
      precio: z.string().nullable().describe('Tal como lo dice el post: "Gratis", "Aporte voluntario", "$3.000"'),
      duracionMin: z.number().int().nullable(),
    }),
  ),
});

const SISTEMA = `Extraes funciones de cine de publicaciones de Instagram de salas y cineclubes del Gran Concepción, Chile.
Devuelve solo proyecciones concretas con película, fecha y hora. Una línea como "miércoles 11, viernes 13 y sábado 14,
18:00 Salaam Cinema" son tres funciones. Si un post repite la misma película en dos horarios, son dos funciones.
Calcula la fecha completa a partir de la fecha de publicación del post: "lunes 9" es el lunes 9 más próximo a esa fecha.
Ignora concursos, talleres, charlas sin película, avisos de ciclos sin fecha y funciones ya pasadas respecto de la
publicación. Si no hay funciones, devuelve una lista vacía. No inventes datos: deja en null lo que el post no dice.`;

export async function recolectar() {
  if (!process.env.APIFY_TOKEN) return { estado: "sin-configurar", mensaje: "Falta APIFY_TOKEN", peliculas: {}, funciones: [] };

  const posts = await traerPosts();
  const cache = await leerCache();
  const claude = new Anthropic();
  const errores = [];

  for (const post of posts) {
    if (cache[post.shortCode]) continue;
    try {
      cache[post.shortCode] = { publicado: post.timestamp, usuario: post.ownerUsername, url: post.url, funciones: await extraer(claude, post) };
    } catch (e) {
      errores.push(`${post.url}: ${e.message}`);
    }
  }
  await guardarCache(cache);

  const peliculas = {};
  const funciones = [];
  const salaDe = new Map(CUENTAS_INSTAGRAM.map((c) => [c.usuario, c.sala]));
  for (const p of Object.values(cache)) {
    for (const f of p.funciones) {
      const id = clavePelicula(f.titulo);
      if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha) || !/^\d{2}:\d{2}$/.test(f.hora)) continue;
      peliculas[id] ??= { titulo: tituloLegible(f.titulo), anio: f.anio, director: f.director, duracionMin: f.duracionMin };
      const enTeatroUdec = /teatro\s+(udec|universidad de concepci)/i.test(f.lugar ?? "");
      funciones.push({
        sala: enTeatroUdec ? "teatro-udec" : salaDe.get(p.usuario) ?? p.usuario,
        pelicula: id,
        inicio: `${f.fecha}T${f.hora}`,
        formato: null,
        idioma: null,
        lugar: enTeatroUdec ? null : f.lugar,
        precio: f.precio,
        compra: p.url,
        fuente: "instagram",
      });
    }
  }
  return {
    estado: errores.length ? "parcial" : "ok",
    mensaje: errores.length ? `${errores.length} post(s) sin leer: ${errores.slice(0, 3).join(" · ")}` : null,
    peliculas,
    funciones: dedup(funciones),
  };
}

async function traerPosts() {
  const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const run = await apify.actor("apify/instagram-post-scraper").call({
    username: CUENTAS_INSTAGRAM.map((c) => c.usuario),
    resultsLimit: POSTS_POR_CUENTA,
    onlyPostsNewerThan: `${DIAS_POSTS} days`,
    skipPinnedPosts: false,
  });
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items.filter((p) => p.shortCode && (p.caption || p.displayUrl));
}

async function extraer(claude, post) {
  const contenido = [];
  const imagen = await imagenBase64(post.displayUrl);
  if (imagen) contenido.push({ type: "image", source: { type: "base64", media_type: imagen.tipo, data: imagen.datos } });
  contenido.push({
    type: "text",
    text: `Cuenta: @${post.ownerUsername}\nPublicado: ${post.timestamp} (hoy es ${hoyChile()})\n\nTexto del post:\n${post.caption ?? "(sin texto)"}`,
  });

  const r = await claude.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Extraccion) },
    system: SISTEMA,
    messages: [{ role: "user", content: contenido }],
  });
  if (r.stop_reason === "refusal") throw new Error("Claude rechazó el post");
  if (!r.parsed_output) throw new Error(`respuesta sin JSON válido (${r.stop_reason})`);
  return r.parsed_output.funciones;
}

async function imagenBase64(url) {
  if (!url) return null;
  try {
    const r = await fetch(url);
    const tipo = r.headers.get("content-type")?.split(";")[0];
    if (!r.ok || !["image/jpeg", "image/png", "image/webp"].includes(tipo)) return null;
    return { tipo, datos: Buffer.from(await r.arrayBuffer()).toString("base64") };
  } catch {
    return null; // sin imagen, Claude lee solo el texto
  }
}

async function leerCache() {
  try {
    return JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    return {};
  }
}

async function guardarCache(cache) {
  const limite = new Date(Date.now() - DIAS_CACHE * 86_400_000).toISOString();
  const vigente = Object.fromEntries(Object.entries(cache).filter(([, p]) => (p.publicado ?? "") >= limite).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(CACHE, `${JSON.stringify(vigente, null, 1)}\n`);
}

const dedup = (funciones) => [...new Map(funciones.map((f) => [`${f.sala}|${f.pelicula}|${f.inicio}`, f])).values()];
