/** Forma de `public/cartelera.json`, que arma `recolector/index.js`. */

export type TipoSala = "cadena" | "independiente" | "cineclub";

export interface Sala {
  id: string;
  nombre: string;
  tipo: TipoSala;
  direccion: string;
  comuna: string;
  url?: string;
  instagram?: string;
}

export interface Pelicula {
  titulo: string;
  duracionMin?: number | null;
  genero?: string | null;
  clasificacion?: string | null;
  sinopsis?: string | null;
  poster?: string | null;
  trailer?: string | null;
  anio?: number | null;
  director?: string | null;
}

export interface Funcion {
  sala: string;
  pelicula: string;
  /** Hora local de Chile, "YYYY-MM-DDTHH:MM". */
  inicio: string;
  formato: string | null;
  idioma: string | null;
  sala_numero?: string | null;
  lugar?: string | null;
  precio?: string | null;
  compra: string | null;
  fuente: string;
}

export interface EstadoFuente {
  id: string;
  estado: "ok" | "parcial" | "error" | "sin-configurar";
  mensaje: string | null;
  actualizado: string | null;
  funciones?: number;
}

export interface Cartelera {
  generado: string;
  salas: Sala[];
  peliculas: Record<string, Pelicula>;
  funciones: Funcion[];
  fuentes: EstadoFuente[];
}
