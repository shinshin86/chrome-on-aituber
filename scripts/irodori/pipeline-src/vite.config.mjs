import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    minify: true,
    sourcemap: false,
    lib: {
      entry: "src/adapter.js",
      formats: ["es"],
      fileName: () => "pipeline.mjs",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
