import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { leerCartelera } from "../recolector/fuentes/cinemark.js";
import { leerCaches } from "../recolector/fuentes/cineplanet.js";
import { ahoraChile, clavePelicula, horaLocal, minutos, separarFormato, tituloLegible, vigentes } from "../recolector/util.js";

test("hora local: Cinemark y Cineplanet escriben la hora de la sala", () => {
  assert.equal(horaLocal("2026-11-13T21:00:00.000Z-05:00"), "2026-11-13T21:00");
  assert.equal(horaLocal("2026-11-13T18:30:00-03:00"), "2026-11-13T18:30");
  assert.equal(horaLocal("mañana"), null);
});

test("hora de Chile", () => {
  // 13-nov-2026 22:00 UTC = 19:00 en Chile (horario de verano, UTC-3)
  assert.equal(ahoraChile(new Date("2026-11-13T22:00:00Z")), "2026-11-13T19:00");
});

test("títulos y claves", () => {
  assert.equal(tituloLegible("YO SOY ROCKY"), "Yo Soy Rocky");
  assert.equal(tituloLegible("EL GATO CON SOMBRERO"), "El Gato con Sombrero");
  assert.equal(tituloLegible("KALKUTUN: JUICIO A LOS BRUJOS"), "Kalkutun: Juicio a los Brujos");
  assert.equal(tituloLegible("AKIRA 4K [1988]"), "Akira 4K");
  assert.equal(tituloLegible("Salaam Cinema"), "Salaam Cinema");
  assert.equal(clavePelicula("CÓMO ROBAR UN BANCO"), clavePelicula("Como robar un banco"));
  assert.equal(clavePelicula("AKIRA 4K [1988]"), "akira-4k");
  assert.deepEqual(separarFormato("AVENGERS DOOMSDAY INFINITY VISION"), { titulo: "AVENGERS DOOMSDAY", formato: "INFINITY VISION" });
  assert.deepEqual(separarFormato("YO SOY ROCKY"), { titulo: "YO SOY ROCKY", formato: null });
});

test("duraciones", () => {
  assert.equal(minutos("PT2H8M"), 128);
  assert.equal(minutos("124"), 124);
  assert.equal(minutos(null), null);
});

test("vigentes: deja fuera lo que ya empezó hace más de 15 minutos", () => {
  const f = (inicio) => ({ inicio });
  const r = vigentes([f("2026-11-13T21:00"), f("2026-11-13T18:40"), f("2026-11-13T18:50")], "2026-11-13T19:00");
  assert.deepEqual(r.map((x) => x.inicio), ["2026-11-13T18:50", "2026-11-13T21:00"]);
});

test("Cinemark: lee el JSON-LD de la cartelera", () => {
  const html = readFileSync(new URL("muestras/cinemark.html", import.meta.url), "utf8");
  const { peliculas, funciones } = leerCartelera(html, "cinemark-mirador");
  assert.equal(funciones.length, 3);
  assert.deepEqual(funciones[0], {
    sala: "cinemark-mirador",
    pelicula: "yo-soy-rocky",
    inicio: "2026-11-13T21:00",
    formato: "2D PREMIER",
    idioma: null,
    sala_numero: "2",
    compra: "https://www.cinemark.cl/pelicula/yo-soy-rocky/compra-entradas/entradas",
    fuente: "cinemark",
  });
  assert.equal(peliculas["yo-soy-rocky"].duracionMin, 128);
  assert.throws(() => leerCartelera("<html></html>", "x"), /MovieTheater/);
});

test("Cineplanet: une películas y funciones de Concepción", () => {
  const movies = {
    movies: [
      { title: "AVENGERS DOOMSDAY INFINITY VISION", runTime: "165", genre: "ACCION", ratingDescription: "TE +7", synopsis: "…", posterUrl: "p.jpg", cinemas: [{ cinemaId: "0000000002", dates: [{ date: "2026-11-14T00:00:00", sessions: ["0000000002-1"] }] }] },
      { title: "OTRA", runTime: "90", cinemas: [{ cinemaId: "0000000004", dates: [{ sessions: ["0000000004-9"] }] }] },
    ],
  };
  const sessions = {
    sessions: [
      { id: "0000000002-1", showtime: "2026-11-14T20:30:00-03:00", formats: ["2D", "CONV"], languages: ["SUBTITULAD"] },
      { id: "0000000004-9", showtime: "2026-11-14T20:30:00-03:00", formats: ["2D"], languages: ["DOBLADA"] },
    ],
  };
  const { peliculas, funciones } = leerCaches({ movies, sessions });
  assert.deepEqual(Object.keys(peliculas), ["avengers-doomsday"]);
  assert.equal(peliculas["avengers-doomsday"].titulo, "Avengers Doomsday");
  assert.equal(funciones.length, 1);
  assert.equal(funciones[0].inicio, "2026-11-14T20:30");
  assert.equal(funciones[0].formato, "2D INFINITY VISION");
  assert.equal(peliculas["avengers-doomsday"].genero, "Acción");
  assert.equal(funciones[0].idioma, "Subtitulada");
});
