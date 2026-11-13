/** Utilidades sin red: fechas en hora de Chile y nombres normalizados. Probadas en test/. */

const ZONA = "America/Santiago";

/** Fecha y hora local de Chile como "YYYY-MM-DDTHH:MM". */
export function ahoraChile(fecha = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(fecha)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export const hoyChile = (fecha = new Date()) => ahoraChile(fecha).slice(0, 10);

/**
 * Hora local de una fecha de las cadenas. Cinemark manda "2026-11-13T21:00:00.000Z-05:00" y Cineplanet
 * "2026-11-13T21:00:00-03:00": en los dos casos la fecha y la hora escritas son las de la sala, así que se
 * toman tal cual (la "Z" de Cinemark es un error de su JSON-LD).
 */
export function horaLocal(texto) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(texto ?? "");
  return m ? `${m[1]}T${m[2]}` : null;
}

/** Clave para unir la misma película entre fuentes: sin tildes, sin año entre corchetes, solo letras y números. */
export function clavePelicula(titulo) {
  return (titulo ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[\d{4}\]|\(\d{4}\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MENORES = new Set("a al con de del e el en la las lo los o para por sin u un una y".split(" "));

/**
 * "Yo Soy Rocky" a partir de "YO SOY ROCKY" (las cadenas escriben todo en mayúscula); sin el año entre
 * corchetes. Deja tal cual los títulos que ya vienen con minúsculas.
 */
export function tituloLegible(titulo) {
  const t = (titulo ?? "").replace(/\s*\[\d{4}\]\s*$/, "").trim();
  if (t !== t.toUpperCase()) return t;
  return t
    .toLocaleLowerCase("es-CL")
    .split(/(\s+|:\s*)/)
    .map((p, i) => (i > 0 && MENORES.has(p) ? p : p.charAt(0).toLocaleUpperCase("es-CL") + p.slice(1)))
    .join("")
    .replace(/\b(\d+)k\b/g, "$1K");
}

/** Formato de sala pegado al final del título ("AVENGERS DOOMSDAY INFINITY VISION"): lo separa. */
export function separarFormato(titulo) {
  const m = /^(.*?)\s+(INFINITY VISION|XTREME|PRIME|3D)$/i.exec((titulo ?? "").trim());
  return m ? { titulo: m[1], formato: m[2].toUpperCase() } : { titulo, formato: null };
}

/** Minutos de una duración ISO 8601 ("PT2H8M") o de un número en texto ("124"). */
export function minutos(valor) {
  if (valor == null || valor === "") return null;
  if (/^\d+$/.test(String(valor))) return Number(valor);
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(String(valor));
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : null;
}

/** Deja solo las funciones que aún no empiezan (con 15 minutos de gracia) y las ordena. */
export function vigentes(funciones, ahora = ahoraChile()) {
  const limite = restarMinutos(ahora, 15);
  return funciones.filter((f) => f.inicio >= limite).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function restarMinutos(local, min) {
  const d = new Date(`${local}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() - min);
  return d.toISOString().slice(0, 16);
}
