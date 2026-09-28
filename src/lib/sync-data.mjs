import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadDir(dir, type) {
  const folder = join(root, "src/content", dir);
  return readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const data = JSON.parse(readFileSync(join(folder, file), "utf8"));
      return {
        type,
        slug: file.replace(/\.json$/, ""),
        title: data.title || "",
        tag: data.tag || "",
        year: data.year || new Date().getFullYear(),
        h: data.h ?? 200,
        summary: data.summary || "",
        draft: !!data.draft,
        order: data.order ?? 999,
        body: (data.body || []).map((s) => [s.heading || "", s.text || ""])
      };
    });
}

export function allArticles() {
  return [...loadDir("work", "case"), ...loadDir("blog", "post")].sort((a, b) => a.order - b.order || b.year - a.year);
}

export function syncData() {
  const site = JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8"));
  const items = allArticles()
    .filter((i) => !i.draft)
    .map(({ draft, order, ...item }) => item);
  const js = "window.SITE = " + JSON.stringify({ ...site, items }, null, 2) + ";\n";
  const out = join(root, "public/assets/js/data.js");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, js);
  return items;
}
