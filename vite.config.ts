import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

console.log("Vite config loaded");

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    https: true,
  },
  plugins: [mkcert()],
});
