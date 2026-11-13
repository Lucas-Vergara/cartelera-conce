import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@lucas-vergara/estilos/tokens.css";
import "@lucas-vergara/estilos/acentos/petroleo.css";
import "@lucas-vergara/estilos/base.css";
import "@lucas-vergara/estilos/lineas/panel2.css";
import "./estilos.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
