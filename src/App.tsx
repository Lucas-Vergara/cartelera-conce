import { useEffect, useMemo, useState } from "react";
import { BotonTema, CreditoEstilos, Frescura, Segmentado, Vacio } from "@lucas-vergara/estilos";
import type { Aviso, Cartelera, EstadoFuente, Funcion, Pelicula, Sala } from "./tipos";

type Vista = "pelicula" | "sala";
type Filtro = "todas" | "cadena" | "otras";

const NOMBRE_FUENTE: Record<string, string> = {
  cinemark: "Cinemark",
  cineplanet: "Cineplanet",
  molina: "Microcine Molina (su web)",
  instagram: "Instagram de salas y cineclubes",
  manual: "Cargadas a mano",
};

export function App() {
  const [datos, setDatos] = useState<Cartelera | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>(() => (leer("vista") as Vista) ?? "pelicula");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const ahora = useAhoraChile();

  useEffect(() => {
    fetch("./cartelera.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`respondió ${r.status}`))))
      .then(setDatos)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => guardar("vista", vista), [vista]);

  const salas = useMemo(() => new Map((datos?.salas ?? []).map((s) => [s.id, s])), [datos]);
  const hoy = ahora.slice(0, 10);
  const limite = restarMinutos(ahora, 15);
  const futuras = useMemo(() => (datos?.funciones ?? []).filter((f) => f.inicio >= limite), [datos, limite]);
  const dias = useMemo(() => [...new Set(futuras.map((f) => f.inicio.slice(0, 10)))].sort(), [futuras]);
  const diaElegido = dia && dias.includes(dia) ? dia : dias[0] ?? hoy;

  const delDia = futuras.filter((f) => {
    if (f.inicio.slice(0, 10) !== diaElegido) return false;
    const tipo = salas.get(f.sala)?.tipo ?? "cineclub";
    return filtro === "todas" || (filtro === "cadena" ? tipo === "cadena" : tipo !== "cadena");
  });
  const nPeliculas = new Set(delDia.map((f) => f.pelicula)).size;
  const nSalas = new Set(delDia.map((f) => f.sala)).size;
  const nIndependientes = new Set(delDia.filter((f) => salas.get(f.sala)?.tipo !== "cadena").map((f) => f.pelicula)).size;

  if (error)
    return (
      <Marco>
        <div className="aviso error">No se pudo cargar la cartelera ({error}). Revisa tu conexión y recarga la página.</div>
      </Marco>
    );
  if (!datos)
    return (
      <Marco>
        <div className="pila">
          <div className="esqueleto" style={{ height: 32, width: 220 }} />
          <div className="esqueleto" style={{ height: 120 }} />
          <div className="esqueleto" style={{ height: 120 }} />
        </div>
      </Marco>
    );

  return (
    <Marco>
      <div className="encabezado">
        <div>
          <h1>Cartelera</h1>
          <p className="nota">
            {delDia.length
              ? `${plural(nPeliculas, "película", "películas")} en ${plural(nSalas, "sala", "salas")} ${etiquetaDia(diaElegido, hoy, true)}`
              : `Sin funciones ${etiquetaDia(diaElegido, hoy, true)} con este filtro`}
            {filtro === "todas" && nIndependientes > 0 && ` · ${nIndependientes} en salas independientes y cineclubes`}
          </p>
        </div>
        <Frescura fecha={datos.generado} prefijo="Actualizada" />
      </div>

      <div className="controles">
        <div className="dias" role="group" aria-label="Día">
          {dias.map((d) => (
            <button key={d} type="button" className="chip-filtro" aria-pressed={d === diaElegido} onClick={() => setDia(d)}>
              {etiquetaDia(d, hoy)}
            </button>
          ))}
        </div>
        <div className="controles-derecha">
          <Segmentado
            chico
            etiqueta="Salas"
            valor={filtro}
            onChange={setFiltro}
            opciones={[
              { valor: "todas", texto: "Todas" },
              { valor: "cadena", texto: "Cadenas" },
              { valor: "otras", texto: "Independientes" },
            ]}
          />
          <Segmentado
            chico
            etiqueta="Ver por"
            valor={vista}
            onChange={setVista}
            opciones={[
              { valor: "pelicula", texto: "Por película" },
              { valor: "sala", texto: "Por sala" },
            ]}
          />
        </div>
      </div>

      {delDia.length === 0 ? (
        <Vacio titulo="No hay funciones para este día" texto={filtro !== "todas" ? "Prueba con «Todas» las salas." : "Elige otro día arriba."}>
          {filtro !== "todas" && (
            <button className="boton" type="button" onClick={() => setFiltro("todas")}>
              Ver todas las salas
            </button>
          )}
        </Vacio>
      ) : vista === "pelicula" ? (
        <PorPelicula funciones={delDia} peliculas={datos.peliculas} salas={salas} />
      ) : (
        <PorSala funciones={delDia} peliculas={datos.peliculas} salas={salas} />
      )}

      {filtro !== "cadena" && <Avisos avisos={(datos.avisos ?? []).filter((a) => a.fechas.some((d) => d >= hoy))} salas={salas} hoy={hoy} />}

      <Fuentes fuentes={datos.fuentes} />
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="barra barra-app">
        <div className="barra-izquierda">
          <a className="marca" href="./">
            Cartelera Conce
          </a>
        </div>
        <div className="barra-acciones">
          <BotonTema />
        </div>
      </header>
      <main className="contenido pila">{children}</main>
    </>
  );
}

function PorPelicula({ funciones, peliculas, salas }: { funciones: Funcion[]; peliculas: Record<string, Pelicula>; salas: Map<string, Sala> }) {
  const grupos = agrupar(funciones, (f) => f.pelicula);
  // Primero lo que solo dan salas independientes y cineclubes (es lo difícil de encontrar), luego por cantidad de funciones
  const orden = [...grupos.entries()].sort(([, a], [, b]) => Number(soloOtras(b, salas)) - Number(soloOtras(a, salas)) || b.length - a.length);
  return (
    <ul className="peliculas">
      {orden.map(([id, lista]) => {
        const p = peliculas[id] ?? { titulo: id };
        return (
          <li key={id} className="pelicula">
            <Poster p={p} />
            <div className="pelicula-cuerpo">
              <h2>{p.titulo}</h2>
              <Ficha p={p} />
              <div className="pelicula-salas">
                {[...agrupar(lista, (f) => f.sala).entries()].map(([sala, fs]) => (
                  <div key={sala} className="fila-sala">
                    <span className="fila-sala-nombre">
                      {salas.get(sala)?.nombre ?? sala}
                      {fs[0].lugar && <span className="muted"> · {fs[0].lugar}</span>}
                    </span>
                    <Horarios funciones={fs} />
                  </div>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PorSala({ funciones, peliculas, salas }: { funciones: Funcion[]; peliculas: Record<string, Pelicula>; salas: Map<string, Sala> }) {
  const grupos = [...agrupar(funciones, (f) => f.sala).entries()].sort(
    ([a], [b]) => Number(salas.get(a)?.tipo === "cadena") - Number(salas.get(b)?.tipo === "cadena") || (salas.get(a)?.nombre ?? a).localeCompare(salas.get(b)?.nombre ?? b),
  );
  return (
    <div className="salas">
      {grupos.map(([id, lista]) => {
        const s = salas.get(id);
        return (
          <section key={id} className="sala">
            <header className="sala-cabecera">
              <h2>{s?.nombre ?? id}</h2>
              <span className="muted">
                {s ? `${s.direccion}, ${s.comuna}` : ""}
                {s?.instagram && (
                  <>
                    {" · "}
                    <a href={`https://www.instagram.com/${s.instagram}/`}>@{s.instagram}</a>
                  </>
                )}
              </span>
            </header>
            {[...agrupar(lista, (f) => f.pelicula).entries()].map(([pid, fs]) => (
              <div key={pid} className="fila-sala">
                <span className="fila-sala-nombre">
                  <b>{peliculas[pid]?.titulo ?? pid}</b>
                  <Ficha p={peliculas[pid]} corta />
                </span>
                <Horarios funciones={fs} />
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Poster({ p }: { p: Pelicula }) {
  const [falla, setFalla] = useState(false);
  if (!p.poster || falla)
    return (
      <div className="poster poster-vacio" aria-hidden="true">
        {p.titulo.charAt(0)}
      </div>
    );
  return <img className="poster" src={p.poster} alt="" loading="lazy" onError={() => setFalla(true)} />;
}

function Ficha({ p, corta }: { p?: Pelicula; corta?: boolean }) {
  if (!p) return null;
  const partes = [
    p.director && `${p.director}${p.anio ? `, ${p.anio}` : ""}`,
    !p.director && p.anio && String(p.anio),
    p.duracionMin && duracion(p.duracionMin),
    p.clasificacion,
    !corta && p.genero,
  ].filter(Boolean);
  if (!partes.length) return null;
  return <span className="ficha">{partes.join(" · ")}</span>;
}

function Horarios({ funciones }: { funciones: Funcion[] }) {
  return (
    <span className="horarios">
      {funciones.map((f) => {
        const formato = f.formato?.replace(/^2D\s+/, "");
        const detalle = [f.agotada ? "Agotada" : null, formato && formato !== "2D" ? formato : null, f.idioma === "Subtitulada" ? "Sub" : f.idioma === "Doblada" ? "Dob" : null, f.agotada ? null : f.precio]
          .filter(Boolean)
          .join(" · ");
        const contenido = (
          <>
            <b>{f.inicio.slice(11)}</b>
            {detalle && <small>{detalle}</small>}
          </>
        );
        const titulo = [f.agotada && "Sin cupos", f.formato, f.idioma, f.sala_numero && `Sala ${f.sala_numero}`, f.precio].filter(Boolean).join(" · ");
        const clase = f.agotada ? "horario agotado" : "horario";
        const nombre = [f.inicio.slice(11), titulo, f.compra && "abre la compra o el post"].filter(Boolean).join(", ");
        return f.compra ? (
          <a key={f.inicio + f.formato} className={clase} href={f.compra} target="_blank" rel="noreferrer" title={titulo || undefined} aria-label={nombre}>
            {contenido}
          </a>
        ) : (
          <span key={f.inicio + f.formato} className={clase} title={titulo || undefined}>
            {contenido}
          </span>
        );
      })}
    </span>
  );
}

function Avisos({ avisos, salas, hoy }: { avisos: Aviso[]; salas: Map<string, Sala>; hoy: string }) {
  if (!avisos.length) return null;
  return (
    <section className="avisos">
      <header>
        <h2>También anunciado en Instagram</h2>
        <p className="nota">Posts con fecha en que no se pudo leer la película, a menudo porque va solo en el afiche. Revisa el post.</p>
      </header>
      <ul>
        {avisos.map((a) => {
          const proxima = a.fechas.find((d) => d >= hoy) ?? a.fechas[0];
          const otras = a.fechas.filter((d) => d > proxima).length;
          return (
            <li key={a.url}>
              <span className="aviso-fecha">
                <b>{etiquetaDia(proxima, hoy)}</b>
                {a.hora && <span>{a.hora}</span>}
                {otras > 0 && <small>+{otras} {otras === 1 ? "día" : "días"}</small>}
              </span>
              <span className="aviso-cuerpo">
                <span className="aviso-titulo">{a.titulo}</span>
                <span className="muted">{[salas.get(a.sala)?.nombre ?? a.sala, a.lugar, a.precio].filter(Boolean).join(" · ")}</span>
              </span>
              <a className="aviso-enlace" href={a.url} target="_blank" rel="noreferrer">
                Ver post
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Fuentes({ fuentes }: { fuentes: EstadoFuente[] }) {
  return (
    <footer className="fuentes">
      <h2>De dónde salen los datos</h2>
      <ul>
        {fuentes.map((f) => (
          <li key={f.id}>
            <span>{NOMBRE_FUENTE[f.id] ?? f.id}</span>
            {f.estado === "sin-configurar" ? (
              <span className="muted">aún sin configurar</span>
            ) : f.estado === "error" ? (
              <span className="estado-fuente error" title={f.mensaje ?? undefined}>
                ✗ no se pudo leer; se muestran los datos anteriores
                {f.actualizado && <Frescura fecha={f.actualizado} prefijo="de" />}
              </span>
            ) : (
              <span className="muted">
                <Frescura fecha={f.actualizado ?? undefined} prefijo={f.estado === "parcial" ? "Algunos posts sin leer ·" : undefined} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="muted">
        Los horarios de Instagram se leen solos del texto de cada post: confírmalos en el post antes de ir. Código en{" "}
        <a href="https://github.com/Lucas-Vergara/cartelera-conce">GitHub</a>.
      </p>
      <CreditoEstilos />
    </footer>
  );
}

// ---------- utilidades ----------

function useAhoraChile() {
  const [ahora, setAhora] = useState(ahoraChile);
  useEffect(() => {
    const t = setInterval(() => setAhora(ahoraChile()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

function ahoraChile() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function restarMinutos(local: string, min: number) {
  const d = new Date(`${local}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() - min);
  return d.toISOString().slice(0, 16);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** "Hoy", "Mañana", "Dom 15"; en frase: "hoy", "mañana", "el domingo 15". */
function etiquetaDia(dia: string, hoy: string, enFrase = false) {
  const d = new Date(`${dia}T12:00:00Z`);
  const manana = new Date(`${hoy}T12:00:00Z`);
  manana.setUTCDate(manana.getUTCDate() + 1);
  if (dia === hoy) return enFrase ? "hoy" : "Hoy";
  if (dia === manana.toISOString().slice(0, 10)) return enFrase ? "mañana" : "Mañana";
  const nombre = DIAS[d.getUTCDay()];
  const lejos = d.getTime() - new Date(`${hoy}T12:00:00Z`).getTime() > 6 * 86_400_000;
  const texto = `${nombre} ${d.getUTCDate()}${lejos ? ` ${MESES[d.getUTCMonth()]}` : ""}`;
  return enFrase ? `el ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1, 3) + texto.slice(nombre.length);
}

function agrupar<T>(lista: T[], clave: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of lista) m.set(clave(x), [...(m.get(clave(x)) ?? []), x]);
  return m;
}

const soloOtras = (fs: Funcion[], salas: Map<string, Sala>) => fs.every((f) => salas.get(f.sala)?.tipo !== "cadena");
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const duracion = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`);

function leer(clave: string) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
