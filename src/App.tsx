import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BotonTema, CreditoEstilos, Frescura, PanelPestana, Pestanas, Segmentado, Vacio } from "@lucas-vergara/estilos";
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

type Ruta = { vista: "dia" } | { vista: "peliculas" } | { vista: "pelicula"; id: string };

export function App() {
  const [datos, setDatos] = useState<Cartelera | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const ruta = useRuta();
  const ahora = useAhoraChile();

  useEffect(() => {
    fetch("./cartelera.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`respondió ${r.status}`))))
      .then(setDatos)
      .catch((e: Error) => setError(e.message));
  }, []);

  const salas = useMemo(() => new Map((datos?.salas ?? []).map((s) => [s.id, s])), [datos]);
  const hoy = ahora.slice(0, 10);
  const limite = restarMinutos(ahora, 15);
  const futuras = useMemo(() => (datos?.funciones ?? []).filter((f) => f.inicio >= limite), [datos, limite]);
  const conFiltro = useMemo(() => futuras.filter((f) => pasaFiltro(f, filtro, salas)), [futuras, filtro, salas]);

  const tituloPelicula = ruta.vista === "pelicula" ? datos?.peliculas[ruta.id]?.titulo : null;
  useEffect(() => {
    document.title = [tituloPelicula ?? (ruta.vista === "peliculas" ? "Películas" : null), "Cartelera Conce"].filter(Boolean).join(" · ");
  }, [ruta.vista, tituloPelicula]);

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

  const filtroSalas = (
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
  );
  const avisos = filtro !== "cadena" && <Avisos avisos={(datos.avisos ?? []).filter((a) => a.fechas.some((d) => d >= hoy))} salas={salas} hoy={hoy} />;
  const pestana = ruta.vista === "dia" ? "dia" : "peliculas";

  return (
    <Marco>
      <Pestanas
        etiqueta="Vistas"
        activa={pestana}
        onCambio={(id) => (location.hash = id === "dia" ? "#/" : "#/peliculas")}
        pestanas={[
          { id: "dia", texto: "Cartelera del día" },
          { id: "peliculas", texto: "Películas" },
        ]}
      />
      <PanelPestana id={pestana}>
        <div className="pila">
          {ruta.vista === "dia" && (
            <VistaDia datos={datos} futuras={futuras} conFiltro={conFiltro} salas={salas} hoy={hoy} filtro={filtro} setFiltro={setFiltro} filtroSalas={filtroSalas} />
          )}
          {ruta.vista === "peliculas" && <VistaPeliculas datos={datos} funciones={conFiltro} salas={salas} hoy={hoy} filtro={filtro} setFiltro={setFiltro} filtroSalas={filtroSalas} />}
          {ruta.vista === "pelicula" && <VistaPelicula key={ruta.id} id={ruta.id} datos={datos} funciones={futuras} salas={salas} hoy={hoy} />}
          {ruta.vista !== "pelicula" && avisos}
          <Fuentes fuentes={datos.fuentes} />
        </div>
      </PanelPestana>
    </Marco>
  );
}

interface PropsVista {
  datos: Cartelera;
  salas: Map<string, Sala>;
  hoy: string;
  filtro: Filtro;
  setFiltro: (f: Filtro) => void;
  filtroSalas: React.ReactNode;
}

/** Lo que hay un día: por película o por sala. */
function VistaDia({ datos, futuras, conFiltro, salas, hoy, filtro, setFiltro, filtroSalas }: PropsVista & { futuras: Funcion[]; conFiltro: Funcion[] }) {
  const [dia, setDia] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>(() => (leer("vista") as Vista) ?? "pelicula");
  useEffect(() => {
    guardar("vista", vista);
  }, [vista]);

  const dias = useMemo(() => [...new Set(futuras.map((f) => f.inicio.slice(0, 10)))].sort(), [futuras]);
  const diaElegido = dia && dias.includes(dia) ? dia : dias[0] ?? hoy;
  const delDia = conFiltro.filter((f) => f.inicio.slice(0, 10) === diaElegido);
  const nPeliculas = new Set(delDia.map((f) => f.pelicula)).size;
  const nSalas = new Set(delDia.map((f) => f.sala)).size;
  const nIndependientes = new Set(delDia.filter((f) => salas.get(f.sala)?.tipo !== "cadena").map((f) => f.pelicula)).size;

  return (
    <>
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
          {filtroSalas}
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
    </>
  );
}

/** Todas las películas con funciones de hoy en adelante. */
function VistaPeliculas({ datos, funciones, salas, hoy, filtro, setFiltro, filtroSalas }: PropsVista & { funciones: Funcion[] }) {
  const [busqueda, setBusqueda] = useState("");
  const todas = useMemo(() => {
    const lista = [...agrupar(funciones, (f) => f.pelicula).entries()].map(([id, fs]) => ({
      id,
      p: datos.peliculas[id] ?? { titulo: id },
      funciones: fs,
      proxima: fs.reduce((a, b) => (b.inicio < a.inicio ? b : a)),
      salas: new Set(fs.map((f) => f.sala)),
      dias: new Set(fs.map((f) => f.inicio.slice(0, 10))).size,
      soloOtras: soloOtras(fs, salas),
    }));
    // Primero lo que pasa antes; el mismo día, lo que tiene más funciones
    return lista.sort((a, b) => a.proxima.inicio.slice(0, 10).localeCompare(b.proxima.inicio.slice(0, 10)) || b.funciones.length - a.funciones.length);
  }, [funciones, datos, salas]);

  const q = sinTildes(busqueda.trim());
  const visibles = q ? todas.filter((x) => sinTildes(`${x.p.titulo} ${x.p.director ?? ""}`).includes(q)) : todas;
  const nOtras = todas.filter((x) => x.soloOtras).length;
  const ultimo = todas.reduce((u, x) => (x.funciones.at(-1)!.inicio > u ? x.funciones.at(-1)!.inicio : u), "");

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Películas</h1>
          <p className="nota">
            {todas.length
              ? `${plural(todas.length, "película", "películas")} con funciones de hoy ${ultimo ? `al ${etiquetaDia(ultimo.slice(0, 10), hoy).toLowerCase()}` : ""}`
              : "Sin películas con este filtro"}
            {filtro === "todas" && nOtras > 0 && ` · ${nOtras} solo en salas independientes y cineclubes`}
          </p>
        </div>
        <Frescura fecha={datos.generado} prefijo="Actualizada" />
      </div>

      <div className="controles">
        <label className="buscador">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="Buscar película o director" aria-label="Buscar película o director" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <div className="controles-derecha">{filtroSalas}</div>
      </div>

      {visibles.length === 0 ? (
        <Vacio titulo={q ? `Ninguna película coincide con «${busqueda.trim()}»` : "No hay películas con este filtro"} texto={q ? "Revisa cómo se escribe o busca por el director." : "Prueba con «Todas» las salas."}>
          {q ? (
            <button className="boton" type="button" onClick={() => setBusqueda("")}>
              Borrar la búsqueda
            </button>
          ) : (
            <button className="boton" type="button" onClick={() => setFiltro("todas")}>
              Ver todas las salas
            </button>
          )}
        </Vacio>
      ) : (
        <ul className="grilla-peliculas">
          {visibles.map((x) => (
            <li key={x.id}>
              <a className="tarjeta-pelicula" href={`#/pelicula/${encodeURIComponent(x.id)}`}>
                <Poster p={x.p} />
                <span className="tarjeta-pelicula-cuerpo">
                  <h2>{x.p.titulo}</h2>
                  <Ficha p={x.p} corta />
                  <span className="proxima">
                    Próxima: <b>{etiquetaDia(x.proxima.inicio.slice(0, 10), hoy)}</b> {x.proxima.inicio.slice(11)}
                  </span>
                  <span className="muted">
                    {x.salas.size === 1 ? (salas.get([...x.salas][0])?.nombre ?? [...x.salas][0]) : plural(x.salas.size, "sala", "salas")}
                    {" · "}
                    {plural(x.dias, "día", "días")}
                  </span>
                  {x.soloOtras && <span className="chip chip-contorno">Independiente</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Una película: qué días, a qué hora y dónde. */
function VistaPelicula({ id, datos, funciones, salas, hoy }: { id: string; datos: Cartelera; funciones: Funcion[]; salas: Map<string, Sala>; hoy: string }) {
  const [sala, setSala] = useState<string | null>(null);
  const p = datos.peliculas[id];
  const todas = funciones.filter((f) => f.pelicula === id);
  const volver = (
    <nav className="migas" aria-label="Volver">
      <a href="#/peliculas">← Todas las películas</a>
    </nav>
  );

  if (!p || !todas.length)
    return (
      <>
        {volver}
        <Vacio titulo={p ? `${p.titulo} ya no tiene funciones` : "Esta película ya no está en cartelera"} texto="Las funciones pasadas no se guardan.">
          <a className="boton" href="#/peliculas">
            Ver las películas en cartelera
          </a>
        </Vacio>
      </>
    );

  const porSala = [...agrupar(todas, (f) => f.sala).entries()].sort(([, a], [, b]) => b.length - a.length);
  const visibles = sala ? todas.filter((f) => f.sala === sala) : todas;
  const dias = [...agrupar(visibles, (f) => f.inicio.slice(0, 10)).entries()];
  const ultimo = todas.at(-1)!.inicio.slice(0, 10);

  return (
    <>
      {volver}
      <header className="cabecera-pelicula">
        <Poster p={p} />
        <div className="cabecera-pelicula-texto">
          <h1>{p.titulo}</h1>
          <Ficha p={p} />
          <p className="nota">
            {plural(todas.length, "función", "funciones")} en {plural(porSala.length, "sala", "salas")}
            {ultimo === todas[0].inicio.slice(0, 10) ? ` ${etiquetaDia(ultimo, hoy, true)}` : `, ${etiquetaDia(todas[0].inicio.slice(0, 10), hoy, true)} al ${etiquetaDia(ultimo, hoy).toLowerCase()}`}
          </p>
        </div>
        {(p.sinopsis || p.trailer) && (
          <div className="cabecera-pelicula-sinopsis">
            {p.sinopsis && <p className="sinopsis">{p.sinopsis}</p>}
            {p.trailer && (
              <a href={p.trailer} target="_blank" rel="noreferrer">
                Ver el tráiler
              </a>
            )}
          </div>
        )}
      </header>

      {porSala.length > 1 && (
        <div className="dias" role="group" aria-label="Sala">
          <button type="button" className="chip-filtro" aria-pressed={sala === null} onClick={() => setSala(null)}>
            Todas las salas <b>{todas.length}</b>
          </button>
          {porSala.map(([s, fs]) => (
            <button key={s} type="button" className="chip-filtro" aria-pressed={sala === s} onClick={() => setSala(sala === s ? null : s)}>
              {salas.get(s)?.nombre ?? s} <b>{fs.length}</b>
            </button>
          ))}
        </div>
      )}

      <div className="dias-pelicula">
        {dias.map(([d, fs]) => (
          <section key={d} className="dia-pelicula" aria-label={diaLargo(d)}>
            <h2>
              {d === hoy || etiquetaDia(d, hoy) === "Mañana" ? (
                <>
                  {etiquetaDia(d, hoy)} <span className="muted">{diaLargo(d, false)}</span>
                </>
              ) : (
                diaLargo(d)
              )}
            </h2>
            <div className="dia-pelicula-salas">
              {[...agrupar(fs, (f) => f.sala).entries()].map(([s, lista]) => {
                const info = salas.get(s);
                return (
                  <div key={s} className="fila-sala">
                    <span className="fila-sala-nombre">
                      {info?.nombre ?? s}
                      <span className="muted">{lista[0].lugar ?? (info ? `${info.direccion}, ${info.comuna}` : "")}</span>
                    </span>
                    <Horarios funciones={lista} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
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
              <h2>
                <a href={`#/pelicula/${encodeURIComponent(id)}`}>{p.titulo}</a>
              </h2>
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
                  <b>
                    <a href={`#/pelicula/${encodeURIComponent(pid)}`}>{peliculas[pid]?.titulo ?? pid}</a>
                  </b>
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

function leerRuta(): Ruta {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (h === "peliculas") return { vista: "peliculas" };
  const m = /^pelicula\/(.+)$/.exec(h);
  return m ? { vista: "pelicula", id: m[1] } : { vista: "dia" };
}

/** Ruta en el hash (#/peliculas, #/pelicula/<id>): el botón atrás funciona y una ficha se puede compartir. */
const posiciones = new Map<string, number>();
function useRuta() {
  const [ruta, setRuta] = useState(leerRuta);
  useEffect(() => {
    let actual = location.hash;
    const cambio = () => {
      posiciones.set(actual, window.scrollY); // al volver a la lista, se vuelve al mismo lugar
      actual = location.hash;
      setRuta(leerRuta());
    };
    window.addEventListener("hashchange", cambio);
    return () => window.removeEventListener("hashchange", cambio);
  }, []);
  useLayoutEffect(() => {
    window.scrollTo(0, posiciones.get(location.hash) ?? 0);
  }, [ruta]);
  return ruta;
}

function pasaFiltro(f: Funcion, filtro: Filtro, salas: Map<string, Sala>) {
  const tipo = salas.get(f.sala)?.tipo ?? "cineclub";
  return filtro === "todas" || (filtro === "cadena" ? tipo === "cadena" : tipo !== "cadena");
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "Miércoles 26 de noviembre" (o en minúscula, para ir después de "Hoy"). */
function diaLargo(dia: string, mayuscula = true) {
  const d = new Date(`${dia}T12:00:00Z`);
  const t = `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]}`;
  return mayuscula ? t.charAt(0).toUpperCase() + t.slice(1) : t;
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
