import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const PROD_BASE = "/extensions/comfyui_queue_manager/.gui/";

  return {
    base: mode === "production" ? PROD_BASE : "/",

    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname),
      },
    },

    server: {
      host: "localhost",
      port: 3000,
      strictPort: true,

      // watch: {
      //   usePolling: true,
      //   interval: 100,
      // },
      //
      // hmr: {
      //   overlay: true,
      // },
    },

    esbuild: {
      loader: "jsx",
      include: [/src\/.*\.jsx?$/],
    },

    css: {
      devSourcemap: true,
    },

    build: {
      minify: false, // Keep generated JavaScript readable
      cssMinify: true,
      sourcemap: true,
      outDir: "../../web/.gui",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  };
});
