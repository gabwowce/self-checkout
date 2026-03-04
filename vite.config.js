import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      manifest: {
        name: "Self Checkout",
        short_name: "Checkout",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {
            src: "/public/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/public/pwa-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "/public/pwa-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
