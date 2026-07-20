import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import pagesConfig from "../vite.pages.config";
import { buildManifest } from "./build-manifest";

const projectRoot = resolve(import.meta.dirname, "..");
const isE2E = process.env.FLOATREAD_E2E === "true";

await build(pagesConfig);

await build({
  configFile: false,
  root: projectRoot,
  plugins: [react()],
  define: {
    __FLOATREAD_SHADOW_MODE__: JSON.stringify(isE2E ? "open" : "closed"),
    __FLOATREAD_MOCK_PROVIDER__: JSON.stringify(isE2E),
  },
  build: {
    outDir: resolve(projectRoot, "dist"),
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(projectRoot, "src/background/service-worker.ts"),
      formats: ["es"],
      fileName: () => "background/service-worker.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

await build({
  configFile: false,
  root: projectRoot,
  define: {
    __FLOATREAD_SHADOW_MODE__: JSON.stringify(isE2E ? "open" : "closed"),
    __FLOATREAD_MOCK_PROVIDER__: JSON.stringify(isE2E),
  },
  build: {
    outDir: resolve(projectRoot, "dist"),
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(projectRoot, "src/content/content-script.ts"),
      name: "FloatReadContent",
      formats: ["iife"],
      fileName: () => "content/content-script.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

await buildManifest();
