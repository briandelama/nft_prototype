import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  preview: {
    open: true,
  },
  server: {
    open: true,
  },
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  publicDir: "public",
  assetsInclude: ["**/*.glb", "**/*.wasm"],
});
