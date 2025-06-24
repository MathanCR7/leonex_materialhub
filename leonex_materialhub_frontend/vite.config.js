// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // Make sure this line is present

export default defineConfig({
  plugins: [react()], // And this line
  server: {
    host: true, // or '0.0.0.0' - for accessing on mobile
  },
});
