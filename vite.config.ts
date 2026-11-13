import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Rutas relativas: GitHub Pages sirve el sitio en /cartelera-conce/
export default defineConfig({ base: "./", plugins: [react()] });
