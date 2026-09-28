import { defineConfig } from "astro/config";
import { syncData } from "./src/lib/sync-data.mjs";
import { startAuthorServer } from "./src/lib/author-server.mjs";

syncData();
if (!process.argv.includes("build")) startAuthorServer();

const serveHomeIndex = {
  name: "serve-home-index",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === "/" || req.url?.startsWith("/?")) req.url = "/index.html" + req.url.slice(1);
      next();
    });
  }
};

export default defineConfig({
  site: "https://screenplay.design",
  base: "/",
  trailingSlash: "ignore",
  devToolbar: { enabled: false },
  vite: { plugins: [serveHomeIndex] }
});
