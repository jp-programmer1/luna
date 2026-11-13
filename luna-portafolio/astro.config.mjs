import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import { existsSync } from "node:fs";

// En local, levantar .env para leer REVALIDATE_TOKEN acá (en Vercel ya está en process.env).
if (existsSync(".env")) process.loadEnvFile(".env");

// REVALIDATE_TOKEN = bypassToken del ISR. El mismo valor va en luna-api/.env para
// que la API pueda pedir la regeneración al publicar. Sin él, no hay ISR.
const revalidateToken = process.env.REVALIDATE_TOKEN;

// https://docs.astro.build/en/guides/integrations-guide/vercel/
export default defineConfig({
  site: "https://www.lunakuyen.art",
  srcDir: "src",
  output: "server",

  adapter: vercel({
    isr: revalidateToken
      ? {
          bypassToken: revalidateToken,
          // Red de seguridad por si una revalidación falla: como mucho 1 h desactualizado.
          expiration: 60 * 60,
          // La vista previa y los endpoints nunca se cachean.
          exclude: [/^\/preview\//, /^\/api\//],
        }
      : false,
  }),

  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },

  vite: {
    resolve: {
      alias: {
        "@": "./",
      },
    },
  },
});
