import http from "node:http";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allArticles, syncData } from "./sync-data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 4350;

function json(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(obj));
}

function articlePath(type, slug) {
  const dir = type === "case" ? "work" : "blog";
  return join(root, "src/content", dir, `${slug}.json`);
}

function writeArticle(article) {
  const slug = (article.slug || "untitled").replace(/[^a-z0-9-]/gi, "-").replace(/^-|-$/g, "") || "untitled";
  const type = article.type === "case" ? "case" : "post";
  const file = articlePath(type, slug);
  mkdirSync(dirname(file), { recursive: true });
  const body = (article.body || []).map((s) => {
    if (Array.isArray(s)) return { heading: s[0] || "", text: s[1] || "" };
    return { heading: s.heading || "", text: s.text || "" };
  });
  const data = {
    title: article.title || "",
    tag: article.tag || (type === "case" ? "Design systems" : "Writing"),
    year: Number(article.year) || new Date().getFullYear(),
    h: Math.max(0, Math.min(360, Number(article.h) || 200)),
    summary: article.summary || "",
    draft: !!article.draft,
    order: article.order ?? Date.now() % 100000,
    body
  };
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  if (article.previousSlug && article.previousSlug !== slug) {
    for (const t of ["post", "case"]) {
      const old = articlePath(t, article.previousSlug);
      if (existsSync(old) && old !== file) unlinkSync(old);
    }
  }
  if (article.previousType && article.previousType !== type) {
    const old = articlePath(article.previousType, slug);
    if (existsSync(old) && old !== file) unlinkSync(old);
  }
  return { type, slug, url: type === "case" ? `work/${slug}/` : `blog/${slug}/` };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

let started = false;

export function startAuthorServer() {
  if (started) return;
  started = true;
  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      return res.end();
    }
    const path = (req.url || "").split("?")[0].replace(/\/$/, "");
    try {
      if (req.method === "GET" && path.endsWith("/api/articles")) {
        const site = JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8"));
        return json(res, 200, { site, items: allArticles() });
      }
      if (req.method === "POST" && path.endsWith("/api/article")) {
        const article = JSON.parse(await readBody(req) || "{}");
        if (article.site) {
          writeFileSync(join(root, "src/data/site.json"), JSON.stringify({
            name: article.site.name || "",
            role: article.site.role || "",
            intro: article.site.intro || ""
          }, null, 2) + "\n");
        }
        const saved = writeArticle(article);
        syncData();
        return json(res, 200, { ok: true, ...saved, draft: !!article.draft });
      }
      if (req.method === "POST" && path.endsWith("/api/article-delete")) {
        const { type, slug } = JSON.parse(await readBody(req) || "{}");
        const file = articlePath(type === "case" ? "case" : "post", slug);
        if (existsSync(file)) unlinkSync(file);
        syncData();
        return json(res, 200, { ok: true });
      }
      json(res, 404, { ok: false });
    } catch (err) {
      json(res, 500, { ok: false, error: String(err) });
    }
  });
  server.on("error", (err) => {
    if (err.code !== "EADDRINUSE") console.error(err);
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[author] writing API on http://127.0.0.1:${PORT}`);
  });
}
