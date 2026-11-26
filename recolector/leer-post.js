/**
 * Lee las funciones de cine del texto de un post de Instagram, con reglas y sin IA (gasto cero). Función pura,
 * probada con posts reales en test/.
 *
 * Lo que reconoce, a partir de cómo escriben las salas y cineclubes de Concepción:
 * - Fechas: "Lunes 30 de noviembre", "28, 29 y 30 de octubre", "Miércoles 11, viernes 13 y sábado 14",
 *   "Del miércoles 18 al domingo 22 de noviembre", "martes 03", "este lunes". Un número suelto sin día de la semana
 *   ni mes no cuenta como fecha.
 * - Horas: "18:00 hrs", "a las 17:00hrs", "18:00 y 20:30 hrs". Lo que va entre paréntesis no cuenta
 *   ("19:30hrs (partimos a las 20:00)"), y "20hrs" solo si el post no trae ninguna hora con minutos.
 * - Títulos, de más a menos confiable:
 *   1. una línea que empieza con la hora: "18:00 hrs. — Salaam Cinema (1995) | 1h 11min." (cartelera semanal);
 *   2. un título con año: "Return of the living dead (1985)", "Lunes Cinematográficos: Funny Games (1997)";
 *   3. un título en mayúsculas dentro de una frase: "presentamos MARÍA ANTONIETA, de Sofia Coppola";
 *   4. un título entre comillas: "con “Joven y alocada”".
 *
 * Si el post trae fecha pero no se puede saber qué película es (p. ej. el título solo está en el afiche), devuelve
 * un aviso para mostrar el post tal cual, en vez de inventar.
 */

const DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const UNIDAD_HORA = new Set(["h", "hr", "hrs", "hs", "horas", "hora", "min"]);
const MAX_PALABRAS = 8;

/** Palabras en mayúscula que no son títulos: encabezados, siglas y avisos. */
const NO_TITULOS = new Set(
  "cartelera programacion funciones funcion sorteo concurso convocatoria cerrada gracias conmemoracion semana ciclo hrs ucsc udec duoc dm qr ia cine cineclub cineforo gratis gratuita liberada nuevo nueva hoy entrada entradas reserva reservas importante atencion".split(" "),
);

/**
 * @param {{ texto: string, publicado: string, diaHabitual?: number | null, direccionSala?: string | null }} post
 *   `publicado` es la fecha del post en Chile ("YYYY-MM-DD"); `diaHabitual` (0 = domingo) se usa cuando el post no dice
 *   la fecha (CineSecreto siempre es el lunes).
 * @returns {{ funciones: Array<{titulo: string, anio: number|null, director: string|null, fecha: string, hora: string, lugar: string|null, precio: string|null}>,
 *            aviso: null | { titulo: string, fechas: string[], hora: string|null, lugar: string|null, precio: string|null } }}
 */
export function leerPost({ texto, publicado, diaHabitual = null, direccionSala = null }) {
  const original = (texto ?? "").normalize("NFC");
  const vacio = { funciones: [], aviso: null };
  if (!original.trim()) return vacio;

  const lineasOriginales = original.split("\n");
  const primera = limpiar(lineasOriginales.find((l) => limpiar(l).trim()) ?? "").trim();
  if (/\b(sorteo|concurso|ganador(?:es|as)?)\b/i.test(plano(primera))) return vacio; // regalan entradas: la función sale de otra cuenta

  const lugar = leerLugar(lineasOriginales, direccionSala);
  const lineas = lineasOriginales.map((l) => limpiar(l).trim());
  const precio = leerPrecio(plano(lineas.join("\n")));
  const ref = publicado;

  // --- Modo cartelera: líneas que empiezan con la hora y siguen con el título, bajo una línea con las fechas ---
  const porLinea = [];
  let fechasVigentes = [];
  for (const linea of lineas) {
    const fechas = leerFechas(linea, ref);
    const conTitulo = tituloTrasHora(linea);
    if (conTitulo) {
      for (const fecha of fechasVigentes) for (const hora of conTitulo.horas) porLinea.push({ ...conTitulo.pelicula, fecha, hora });
    } else if (fechas.length) {
      fechasVigentes = fechas;
    }
  }
  if (porLinea.length) return { funciones: porLinea.map((f) => ({ ...f, lugar, precio })), aviso: null };

  // --- Modo anuncio: fechas, horas y títulos del post completo ---
  let fechas = unicos(lineas.flatMap((l) => leerFechas(l, ref)));
  if (!fechas.length && diaHabitual != null) fechas = [proximoDia(ref, diaHabitual, 1)];
  const horas = leerHoras(lineas);
  const titulos = leerTitulos(lineas);

  const funciones = [];
  if (fechas.length && horas.length && titulos.length) {
    if (titulos.length === fechas.length && titulos.length > 1) {
      titulos.forEach((t, i) => horas.forEach((hora) => funciones.push({ ...t, fecha: fechas[i], hora })));
    } else if (titulos.length === 1 || fechas.length === 1) {
      for (const t of titulos) for (const fecha of fechas) for (const hora of horas) funciones.push({ ...t, fecha, hora });
    }
  }
  if (funciones.length) return { funciones: funciones.map((f) => ({ ...f, lugar, precio })), aviso: null };
  if (!fechas.length) return vacio;
  return { funciones: [], aviso: { titulo: recortar(primera.replace(/^[^\p{L}\d¿¡]+/u, ""), 140), fechas, hora: horas[0] ?? null, lugar, precio } };
}

// ---------------------------------------------------------------- texto

/** Saca emojis y variantes; deja el resto igual. */
function limpiar(s) {
  return s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu, " ").replace(/[ \t]+/g, " ");
}

/** Minúsculas y sin tildes, con el mismo largo que el texto (para usar las mismas posiciones). */
function plano(s) {
  return s
    .split("")
    .map((c) => c.normalize("NFD")[0].toLowerCase()[0])
    .join("");
}

const recortar = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const unicos = (xs) => [...new Set(xs)];
const palabras = (s) => s.split(/\s+/).filter(Boolean).length;
const empiezaConMayuscula = (s) => /^[¿¡"“«]?\s*[A-ZÁÉÍÓÚÑÜ0-9]/.test(s);

// ---------------------------------------------------------------- fechas

const fechaIso = (d) => d.toISOString().slice(0, 10);
const dia = (iso) => new Date(`${iso}T12:00:00Z`);
const sumarDias = (iso, n) => {
  const d = dia(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fechaIso(d);
};

/** Primer día de la semana `semana` desde `ref` + `desde` días. */
function proximoDia(ref, semana, desde = 0) {
  for (let i = desde; i < desde + 7; i++) {
    const f = sumarDias(ref, i);
    if (dia(f).getUTCDay() === semana) return f;
  }
  return ref;
}

/** Fecha de un "día N" (con o sin mes y día de la semana) cerca de la fecha del post. */
function resolver({ n, mes, semana }, ref) {
  const r = dia(ref);
  if (mes) {
    let anio = r.getUTCFullYear();
    let d = new Date(Date.UTC(anio, mes - 1, n, 12));
    if (d.getUTCMonth() !== mes - 1) return null;
    if (d < new Date(r.getTime() - 120 * 86_400_000)) d = new Date(Date.UTC(++anio, mes - 1, n, 12)); // en diciembre, "8 de enero"
    return fechaIso(d);
  }
  const candidatas = [];
  for (let m = -1; m <= 2; m++) {
    const d = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + m, n, 12));
    if (d.getUTCDate() === n) candidatas.push(d);
  }
  const conDia = semana == null ? candidatas : candidatas.filter((d) => d.getUTCDay() === semana);
  const lista = conDia.length ? conDia : candidatas;
  const desde = new Date(r.getTime() - 7 * 86_400_000);
  const d = lista.find((x) => x >= desde) ?? lista.at(-1);
  return d ? fechaIso(d) : null;
}

/** Fechas que nombra una línea. Ver los formatos al inicio del archivo. */
export function leerFechas(linea, ref) {
  const p = plano(linea).replace(/\([^)]*\)/g, (m) => " ".repeat(m.length));
  const tokens = [...p.matchAll(/\d{1,2}[:.]\d{2}(?!\d)|[a-zñ]+|\d+|,/g)].map((m) => m[0]);
  const fechas = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    // "este lunes", "el próximo viernes": un día de la semana sin número
    if (/^(este|esta|proximo|proxima)$/.test(t) && DIAS[tokens[i + 1]] != null && !/^\d+$/.test(tokens[i + 2] ?? "")) {
      fechas.push(proximoDia(ref, DIAS[tokens[i + 1]]));
      i += 2;
      continue;
    }
    const grupo = leerGrupo(tokens, i);
    if (!grupo) {
      i++;
      continue;
    }
    i = grupo.fin;
    const conMes = grupo.items.some((x) => x.mes);
    if (!conMes && !grupo.items.some((x) => x.semana != null)) continue; // "3 entradas", "+56 9 …"
    // el mes escrito al final vale para los días anteriores que no lo dicen ("28, 29 y 30 de octubre")
    for (let k = grupo.items.length - 2; k >= 0; k--) grupo.items[k].mes ??= grupo.items[k + 1].mes;
    for (let k = 0; k < grupo.items.length; k++) {
      const item = grupo.items[k];
      const f = resolver(item, ref);
      if (!f) continue;
      if (item.hasta && k + 1 < grupo.items.length) {
        const fin = resolver(grupo.items[k + 1], ref);
        for (let d = f; fin && d < fin && fechas.length < 40; d = sumarDias(d, 1)) fechas.push(d);
      } else fechas.push(f);
    }
  }
  return unicos(fechas);
}

/** Un grupo de días seguidos: "[día] N[, [día] N]* [y|al [día] N] [de MES [de AAAA]]". */
function leerGrupo(tokens, i) {
  const items = [];
  let j = i;
  for (;;) {
    let semana = null;
    if (DIAS[tokens[j]] != null) {
      semana = DIAS[tokens[j]];
      j++;
    }
    const n = tokens[j];
    if (!/^\d{1,2}$/.test(n ?? "") || Number(n) < 1 || Number(n) > 31 || UNIDAD_HORA.has(tokens[j + 1])) {
      if (!items.length) return null;
      j = semana == null ? j : j - 1;
      break;
    }
    const item = { n: Number(n), semana, mes: null, hasta: false };
    j++;
    if (tokens[j] === "de" && MESES[tokens[j + 1]]) {
      item.mes = MESES[tokens[j + 1]];
      j += 2;
      if (tokens[j] === "de" && /^\d{4}$/.test(tokens[j + 1] ?? "")) j += 2;
    }
    items.push(item);
    const sep = tokens[j];
    if (sep === "," || sep === "y" || sep === "e") j++;
    else if (sep === "al" || sep === "hasta") {
      item.hasta = true;
      j += tokens[j + 1] === "el" ? 2 : 1;
    } else break;
    if (DIAS[tokens[j]] == null && !/^\d{1,2}$/.test(tokens[j] ?? "")) {
      item.hasta = false;
      break;
    }
  }
  return { items, fin: Math.max(j, i + 1) };
}

// ---------------------------------------------------------------- horas

const HORA = /(?<![\d$.])(\d{1,2})[:.](\d{2})(?!\d)/g;

function horasDe(texto) {
  const sinParentesis = texto.replace(/\([^)]*\)/g, (m) => " ".repeat(m.length));
  const horas = [];
  let anterior = null;
  for (const m of sinParentesis.matchAll(HORA)) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) continue;
    // "de 17:45 a 19:00": la segunda es el fin
    const entre = anterior ? sinParentesis.slice(anterior.fin, m.index) : "";
    anterior = { fin: m.index + m[0].length };
    if (/^\s*(?:a|-|–|hasta)\s*$/i.test(entre)) continue;
    horas.push(`${String(h).padStart(2, "0")}:${m[2]}`);
  }
  return horas;
}

function leerHoras(lineas) {
  const conMinutos = unicos(lineas.flatMap(horasDe));
  if (conMinutos.length) return conMinutos.sort();
  const sueltas = lineas
    .flatMap((l) => [...plano(l).replace(/\([^)]*\)/g, "").matchAll(/(?<![\d$.])(\d{1,2})\s*(?:hrs?|hs|horas)\b/g)])
    .map((m) => Number(m[1]))
    .filter((h) => h >= 9 && h <= 23);
  return unicos(sueltas.map((h) => `${String(h).padStart(2, "0")}:00`)).sort();
}

// ---------------------------------------------------------------- títulos

/** "18:00 hrs. — Salaam Cinema (1995) | 1h 11min." → horas y película. Solo si la línea empieza con la hora. */
function tituloTrasHora(linea) {
  const m = /^[^\p{L}\d]*((?:\d{1,2}[:.]\d{2}\s*(?:hrs?\.?|horas|h\b)?\s*(?:y|,)?\s*)+)\s*(?:hrs?\.?|horas|h\b)?\s*[—–\-|:]\s*(.+)$/iu.exec(linea);
  if (!m) return null;
  const horas = horasDe(m[1]);
  let resto = m[2].split(/\s\|\s|\s[—–-]\s*\d+\s*h\b|\s[—–-]\s*\d+\s*min/i)[0].trim();
  resto = resto.replace(/[\s.,;|—–-]+$/, "");
  if (!horas.length || !empiezaConMayuscula(resto)) return null;
  const pelicula = conAnio(resto);
  if (!pelicula || palabras(pelicula.titulo) > MAX_PALABRAS) return null;
  return { horas, pelicula };
}

/** "Título (1995)" o "Título, Director (2020)" → { titulo, anio, director }. */
function conAnio(texto) {
  const m = /^(.*?)\s*\((\d{4})\)\s*$/.exec(texto);
  const base = (m ? m[1] : texto).replace(/^[“"«]|[”"»]$/g, "").trim();
  if (!base || !/\p{L}{2}/u.test(base)) return null;
  const partes = /^(.+),\s*((?:[A-ZÁÉÍÓÚÑ][\p{L}'.-]+\s?){2,3})$/u.exec(base);
  return {
    titulo: (partes ? partes[1] : base).trim(),
    anio: m ? Number(m[2]) : null,
    director: partes ? partes[2].trim() : null,
  };
}

const CONECTORES = new Set("de del la las el los y e of the and a an o en".split(" "));

function leerTitulos(lineas) {
  const conAnios = [];
  const enMayuscula = [];
  const entreComillas = [];

  for (const linea of lineas) {
    // 2. títulos con año
    for (const m of linea.matchAll(/\((\d{4})\)/g)) {
      const anio = Number(m[1]);
      if (anio < 1890 || anio > 2100) continue;
      let antes = linea.slice(0, m.index);
      antes = antes.split(/[:|—–]|[.!?]\s/).at(-1).trim();
      if (palabras(antes) > MAX_PALABRAS) antes = colaDeTitulo(antes);
      antes = antes.replace(/^[\s"“«,—–-]+|[\s"”»,—–-]+$/g, "");
      if (!antes || !empiezaConMayuscula(antes)) continue;
      const p = conAnio(`${antes} (${anio})`);
      if (p) conAnios.push(p);
    }

    // 3. mayúsculas dentro de una frase (no en encabezados escritos todo en mayúscula)
    const letras = linea.replace(/[^\p{L}]/gu, "");
    const minusculas = letras.replace(/[^\p{Ll}]/gu, "").length;
    if (minusculas > letras.length * 0.3) {
      for (const m of linea.matchAll(/(?<![\p{L}])([\p{Lu}][\p{Lu}'’-]*(?:\s+[\p{Lu}][\p{Lu}'’-]*){0,7})(?![\p{L}])/gu)) {
        const t = m[1].trim().replace(/[\-]+$/, "");
        const ps = t.split(/\s+/);
        const significativas = ps.filter((x) => !NO_TITULOS.has(plano(x).replace(/[^a-zñ]/g, "")));
        const largo = t.replace(/[^\p{L}]/gu, "").length;
        if (!significativas.length || largo < 5 || (ps.length === 1 && largo < 5)) continue;
        if (/\bciclo\s+(?:de\s+)?$/i.test(linea.slice(0, m.index))) continue;
        const despues = linea.slice(m.index + m[1].length);
        const director = /^\s*,?\s*de\s+((?:[A-ZÁÉÍÓÚÑ][\p{L}'.-]+\s?){2,3})/u.exec(despues)?.[1]?.trim() ?? null;
        enMayuscula.push({ titulo: t, anio: null, director });
      }
    }

    // 4. comillas, salvo instrucciones ("Haz clic en “Reserve a spot”")
    if (/\b(clic|click|selecciona|presiona|pincha|bot[oó]n)\b/i.test(linea) || /^\d+[.)]/.test(linea)) continue;
    for (const m of linea.matchAll(/[“"«]([^”"»\n]{2,60})[”"»]/g)) {
      const t = m[1].trim();
      if (!empiezaConMayuscula(t) || palabras(t) > MAX_PALABRAS || /[.!?]\s|[.!?]$/.test(t)) continue;
      entreComillas.push({ titulo: t, anio: null, director: null });
    }
  }

  const nivel = [conAnios, enMayuscula, entreComillas].find((l) => l.length) ?? [];
  const vistos = new Map();
  for (const t of nivel) {
    const k = plano(t.titulo).replace(/[^a-z0-9]+/g, "");
    if (!vistos.has(k)) vistos.set(k, t);
    else vistos.set(k, { ...vistos.get(k), anio: vistos.get(k).anio ?? t.anio, director: vistos.get(k).director ?? t.director });
  }
  return [...vistos.values()];
}

/** De una frase larga, el final con palabras en mayúscula: "… función de los Lunes con Funny Games" → "Funny Games". */
function colaDeTitulo(frase) {
  const ps = frase.trim().split(/\s+/);
  let i = ps.length;
  while (i > 0 && (empiezaConMayuscula(ps[i - 1]) || (CONECTORES.has(ps[i - 1].toLowerCase()) && i < ps.length))) i--;
  while (i < ps.length && CONECTORES.has(ps[i].toLowerCase())) i++;
  return ps.slice(i).join(" ");
}

// ---------------------------------------------------------------- lugar y precio

function leerLugar(lineasOriginales, direccionSala) {
  const linea = lineasOriginales.find((l) => l.includes("📍"));
  if (!linea) return null;
  const lugar = limpiar(linea.split("📍")[1] ?? "").trim().replace(/[.\s]+$/, "");
  if (!lugar) return null;
  const clave = (s) => plano(s).replace(/[^a-z0-9]+/g, "");
  if (direccionSala && (clave(lugar).includes(clave(direccionSala)) || clave(direccionSala).includes(clave(lugar)))) return null;
  return lugar;
}

function leerPrecio(p) {
  const monto = /\$\s?\d{1,3}(?:\.\d{3})+|\$\s?\d{3,}/.exec(p);
  if (monto) return monto[0].replace(/\s/g, "");
  if (/aporte voluntario|paga lo que puedas|aporta lo que puedas/.test(p)) return "Aporte voluntario";
  if (/entrada (liberada|gratuita|gratis)|gratuit[ao]|actividad gratuita|gratis/.test(p)) return "Gratis";
  return null;
}
