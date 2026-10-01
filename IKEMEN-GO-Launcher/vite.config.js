import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

// The version shown in the app comes from package.json (keep it equal to
// src-tauri/tauri.conf.json and src-tauri/Cargo.toml).
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  clearScreen: false,
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  server: {
    strictPort: true,
    port: 1420,
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**"]
    }
  }
});
