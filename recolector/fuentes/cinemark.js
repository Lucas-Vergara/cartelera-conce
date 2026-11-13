/**
 * Cinemark: cada página de cartelera trae las funciones de ~6 días como datos estructurados schema.org
 * (`MovieTheater` con `event[]` de `ScreeningEvent`), los mismos que lee Google. Basta el HTML, sin navegador.
 * El idioma (doblada/subtitulada) no viene ahí: queda en null y la web remite a Cinemark.
 */
import { clavePelicula, horaLocal, minutos, tituloLegible } from "../util.js";

const CINES = [
  { sala: "cinemark-mirador", url: "https://www.cinemark.cl/cartelera/cinemark-mallplaza-mirador-bio-bio" },
  { sala: "cinemark-trebol", url: "https://www.cinemark.cl/cartelera/cinemark-mallplaza-trebol" },
];

/** Funciones y películas a partir del HTML de una cartelera. Función pura (probada en test/). */
export function leerCartelera(html, sala) {
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1]);
  const teatro = bloques.map((b) => JSON.parse(b)).find((d) => d["@type"] === "MovieTheater");
  if (!teatro) throw new Error("La página no trae el bloque MovieTheater: Cinemark cambió su HTML");

  const peliculas = {};
  const funciones = [];
  for (const e of teatro.event ?? []) {
    const obra = e.workPresented ?? {};
    const id = clavePelicula(obra.name);
    const inicio = horaLocal(e.startDate);
    if (!id || !inicio) continue;
    peliculas[id] ??= {
      titulo: tituloLegible(obra.name),
      duracionMin: minutos(obra.duration),
      genero: obra.genre || null,
      poster: obra.image || null,
    };
    const [formato, extra] = String(e.videoFormat ?? "").split(" + ");
    funciones.push({
      sala,
      pelicula: id,
      inicio,
      formato: [formato, extra].filter(Boolean).join(" "),
      idioma: null,
      sala_numero: /- (\d+)$/.exec(e.location?.name ?? "")?.[1] ?? null,
      compra: e.offers?.url ?? null,
      fuente: "cinemark",
    });
  }
  return { peliculas, funciones };
}

export async function recolectar() {
  const peliculas = {};
  const funciones = [];
  for (const { sala, url } of CINES) {
    const r = await fetch(url, { headers: { "user-agent": "cartelera-conce (github.com/Lucas-Vergara/cartelera-conce)" } });
    if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
    const res = leerCartelera(await r.text(), sala);
    Object.assign(peliculas, res.peliculas);
    funciones.push(...res.funciones);
  }
  return { peliculas, funciones };
}
