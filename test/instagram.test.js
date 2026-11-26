import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { leerFechas, leerPost } from "../recolector/leer-post.js";
import { leerCartelera } from "../recolector/fuentes/molina.js";
import { hoyChile } from "../recolector/util.js";

// Posts reales de noviembre de 2026
const POSTS = JSON.parse(readFileSync(new URL("muestras/posts-instagram.json", import.meta.url), "utf8"));
const leer = (nombre, extra = {}) => leerPost({ texto: POSTS[nombre].texto, publicado: hoyChile(new Date(POSTS[nombre].publicado)), ...extra });
const resumen = (r) => r.funciones.map((f) => `${f.fecha} ${f.hora} ${f.titulo}`).sort();

test("fechas en español", () => {
  const ref = "2026-11-08"; // domingo
  assert.deepEqual(leerFechas("Lunes 09 de noviembre", ref), ["2026-11-09"]);
  assert.deepEqual(leerFechas("28, 29 y 30 de octubre", "2026-10-27"), ["2026-10-28", "2026-10-29", "2026-10-30"]);
  assert.deepEqual(leerFechas("Miércoles 11, viernes 13, sábado 14 y domingo 15", ref), ["2026-11-11", "2026-11-13", "2026-11-14", "2026-11-15"]);
  assert.deepEqual(leerFechas("Del miércoles 18 al domingo 22 de noviembre.", ref), ["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.deepEqual(leerFechas("Este lunes les traemos dos mediometrajes", ref), ["2026-11-09"]);
  assert.deepEqual(leerFechas("Partiremos el miércoles 2 de diciembre", "2026-11-24"), ["2026-12-02"]);
  assert.deepEqual(leerFechas("En diciembre: viernes 8 de enero", "2026-12-20"), ["2027-01-08"]);
  // números que no son fechas
  assert.deepEqual(leerFechas("Regalamos 3 entradas dobles", ref), []);
  assert.deepEqual(leerFechas("18:00 hrs. — Salaam Cinema (1995) | 1h 11min.", ref), []);
  assert.deepEqual(leerFechas("Reservas al +56 9 3263 0228", ref), []);
});

test("cartelera semanal: una línea por horario bajo los días", () => {
  const r = leer("molina-cartelera");
  assert.equal(r.funciones.length, 10);
  assert.ok(resumen(r).includes("2026-11-11 18:00 Salaam Cinema"));
  assert.ok(resumen(r).includes("2026-11-15 20:30 Children of Heaven"));
  assert.ok(resumen(r).includes("2026-11-12 20:30 Persepolis"));
  assert.equal(r.funciones.find((f) => f.titulo === "Salaam Cinema").anio, 1995);
});

test("CineSecreto: título con año, 'este lunes' y la hora entre paréntesis que no cuenta", () => {
  assert.deepEqual(resumen(leer("cinesecreto-la-playa")), ["2026-11-09 20:00 LA PLAYA"]);
  assert.deepEqual(resumen(leer("cinesecreto-doble")), ["2026-11-16 20:00 CARNE", "2026-11-16 20:00 LUX AETERNA"]);
  // sin fecha en el texto: el día habitual (lunes) después del post
  assert.deepEqual(resumen(leer("cinesecreto-sin-fecha", { diaHabitual: 1 })), ["2026-11-02 19:30 Return of the living dead"]);
  assert.deepEqual(resumen(leer("cinesecreto-sin-fecha")), []);
});

test("Lunes Cinematográficos de Corcudec: lugar Teatro UdeC", () => {
  const r = leer("corcudec-funny-games");
  assert.deepEqual(resumen(r), ["2026-11-30 19:00 Funny Games"]);
  assert.equal(r.funciones[0].anio, 1997);
  assert.equal(r.funciones[0].lugar, "Teatro UdeC");
});

test("Fiudec: título en mayúsculas con director; no confunde instrucciones entre comillas", () => {
  const r = leer("fiudec-maria-antonieta", { direccionSala: "Facultad de Ingeniería UdeC" });
  assert.deepEqual(resumen(r), ["2026-11-18 17:00 MARÍA ANTONIETA"]);
  assert.equal(r.funciones[0].director, "Sofia Coppola");
  assert.equal(r.funciones[0].precio, "Gratis");
  assert.equal(r.funciones[0].lugar, null); // es la dirección de la sala
  // "Haz clic en “Reserve a spot”" y "20hrs" (cierre del auditorio) no son funciones
  assert.deepEqual(resumen(leer("fiudec-instrucciones")), ["2026-11-18 17:00 MARÍA ANTONIETA"]);
});

test("Videodromo: dos fechas con dos títulos entre comillas, en orden", () => {
  assert.deepEqual(resumen(leer("videodromo-dos-fechas")), ["2026-12-02 17:00 Joven y alocada", "2026-12-09 17:00 Al unísono"]);
});

test("sin película legible: aviso con la fecha; sorteos y posts sin fecha, nada", () => {
  const truffaut = leer("truffaut-afiche");
  assert.deepEqual(truffaut.funciones, []);
  assert.deepEqual(truffaut.aviso.fechas, ["2026-10-28"]);
  assert.equal(truffaut.aviso.hora, "16:00");
  assert.match(truffaut.aviso.titulo, /^¿Nos extrañaron\?/);

  const conversatorio = leer("fiudec-conversatorio-fecha");
  assert.deepEqual(conversatorio.aviso.fechas, ["2026-12-04"]);
  assert.equal(conversatorio.aviso.lugar, "Terraza Puya");

  assert.deepEqual(leer("fiudec-sorteo"), { funciones: [], aviso: null });
  assert.deepEqual(leer("fiudec-conversatorios"), { funciones: [], aviso: null });
});

test("Microcine Molina: lee la cartelera de su web", () => {
  const html = readFileSync(new URL("muestras/molina.html", import.meta.url), "utf8");
  const { peliculas, funciones } = leerCartelera(html);
  assert.equal(funciones.length, 3);
  assert.deepEqual(funciones[0], {
    sala: "microcine-molina",
    pelicula: "la-historia-sin-fin",
    inicio: "2026-11-26T18:00",
    formato: null,
    idioma: null,
    precio: "Aporte voluntario",
    agotada: true,
    compra: "https://www.microcinemolina.cl/cartelera/la-historia-sin-fin",
    fuente: "molina",
  });
  assert.equal(funciones[1].agotada, false);
  assert.equal(funciones[1].compra, "https://www.microcinemolina.cl/reservar/64");
  assert.equal(funciones[2].precio, "Gratis");
  assert.deepEqual(peliculas["la-historia-sin-fin"], { titulo: "La historia sin fin", director: "Wolfgang Petersen", anio: 1984, duracionMin: 94, ficha: "https://www.microcinemolina.cl/cartelera/la-historia-sin-fin" });
  assert.throws(() => leerCartelera("<html></html>"), /Molina cambió/);
});
