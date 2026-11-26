/**
 * Salas y espacios del Gran Concepción. El id es el que usan las funciones de `public/cartelera.json`.
 * Fuera por decisión: Cinemark Arauco Coronel (queda lejos) y Artistas del Acero (cerró).
 */
export const SALAS = [
  {
    id: "cinemark-mirador",
    nombre: "Cinemark Mallplaza Mirador Bío Bío",
    tipo: "cadena",
    direccion: "Los Carrera Poniente 301",
    comuna: "Concepción",
    url: "https://www.cinemark.cl/cartelera/cinemark-mallplaza-mirador-bio-bio",
  },
  {
    id: "cinemark-trebol",
    nombre: "Cinemark Mallplaza Trébol",
    tipo: "cadena",
    direccion: "Av. Alessandri 3177",
    comuna: "Talcahuano",
    url: "https://www.cinemark.cl/cartelera/cinemark-mallplaza-trebol",
  },
  {
    id: "cineplanet-concepcion",
    nombre: "Cineplanet Concepción",
    tipo: "cadena",
    direccion: "Barros Arana 1068, Mall del Centro",
    comuna: "Concepción",
    url: "https://www.cineplanet.cl/cines/cp-concepcin",
  },
  {
    id: "teatro-udec",
    nombre: "Teatro UdeC · Lunes Cinematográficos",
    tipo: "independiente",
    direccion: "O'Higgins 660",
    comuna: "Concepción",
    url: "https://noticias.udec.cl/etiqueta/lunes-cinematograficos/",
  },
  {
    id: "microcine-molina",
    nombre: "Microcine Molina",
    tipo: "independiente",
    direccion: "Orompello 104",
    comuna: "Concepción",
    url: "https://www.microcinemolina.cl/cartelera",
    instagram: "microcinemolina",
    fuentePropia: true, // su web trae la cartelera completa: no se lee su Instagram
  },
  {
    id: "cinesecreto",
    nombre: "CineSecreto",
    tipo: "cineclub",
    direccion: "Icebar, Ongolmo 1305",
    comuna: "Concepción",
    instagram: "cinesecreto_ccp",
    diaHabitual: 1, // lunes: algunos posts solo dicen la hora
  },
  {
    id: "cineclub-fiudec",
    nombre: "Cineclub FI UdeC",
    tipo: "cineclub",
    direccion: "Facultad de Ingeniería UdeC",
    comuna: "Concepción",
    instagram: "cineclubfiudec",
  },
  {
    id: "cineclub-truffaut",
    nombre: "Cineclub Truffaut",
    tipo: "cineclub",
    direccion: "Varios lugares",
    comuna: "Concepción",
    instagram: "clubdecinetruffaut",
  },
  {
    id: "videodromo",
    nombre: "Videodromo",
    tipo: "cineclub",
    direccion: "Auditorio Facultad de Historia UCSC",
    comuna: "Concepción",
    instagram: "videodromo_",
  },
  {
    id: "cine-arte-windsor",
    nombre: "Cine Arte Windsor",
    tipo: "cineclub",
    direccion: "Bares del centro",
    comuna: "Concepción",
    instagram: "cineartewindsor",
  },
];

/**
 * Cuentas de Instagram que se leen con Apify. `sala` es el espacio al que se asignan sus funciones salvo que el
 * post diga que es en el Teatro UdeC (Corcudec, BioBioCine y Fiudec anuncian ahí los Lunes Cinematográficos).
 * Apify cobra por post: cada cuenta suma ~US$0,3 al mes si publica a diario, nada si no publica.
 */
export const CUENTAS_INSTAGRAM = [
  ...SALAS.filter((s) => s.instagram && !s.fuentePropia).map((s) => ({ usuario: s.instagram, sala: s.id })),
  { usuario: "corcudec", sala: "teatro-udec" },
  { usuario: "festivalbiobiocine", sala: "teatro-udec" },
];
