import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "nostatus",
        short_name: "nostatus",
        description: "Nostr client for browsing your friends' status.",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        theme_color: "#822ad2",
        background_color: "#f1f5f9",
        display: "standalone",
      },
      manifestFilename: 'manifest.json',
      devOptions: { enabled: true },
    }),
  ],
  // server: {
  //   port: 15173,
  //   host: "0.0.0.0",
  // },
});
