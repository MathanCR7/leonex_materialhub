// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // or '0.0.0.0' - for accessing on mobile
    port: 5002, // Add this line to specify the port
  },
});
