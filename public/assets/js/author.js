(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
  const api = (name) => {
    const host = location.hostname;
    if (host === "127.0.0.1" || host === "localhost") return "http://127.0.0.1:4350/api/" + name;
    return new URL("api/" + name, document.baseURI).toString();
  };
  const status = (msg) => { $("#save-status").textContent = msg || ""; };

  let live = false;
  let current = -1;
  let site = { name: "", role: "", intro: "" };
  let items = [];

  function toItem(raw) {
    const body = (raw.body || []).map((s) => Array.isArray(s) ? s : [s.heading || "", s.text || ""]);
    return { ...raw, body, draft: !!raw.draft };
  }

  async function load() {
    try {
      const res = await fetch(api("articles"));
      if (!res.ok) throw new Error("no api");
      const data = await res.json();
      live = true;
      site = data.site;
      items = data.items.map(toItem);
      $("#author-note").textContent = "Connected to the local Astro server. Save Draft and Publish write JSON into src/content/.";
    } catch (e) {
      live = false;
      site = { name: window.SITE.name, role: window.SITE.role, intro: window.SITE.intro };
      items = (window.SITE.items || []).map((i) => toItem({ ...i, draft: false }));
      $("#author-note").textContent = "Read-only copy of published stories. Run npm run dev and open this page locally to Save Draft or Publish.";
    }
    $("#site-name").value = site.name || "";
    $("#site-role").value = site.role || "";
    $("#site-intro").value = site.intro || "";
    header();
    list();
  }

  function header() {
    $("#site-header").innerHTML = `<div class="bar wrap"><a class="brand" href="index.html">${site.name || "Author"}</a>
      <nav aria-label="Main"><a href="index.html">Home</a><a href="blog.html">Blog</a></nav></div>`;
    $("#site-footer").innerHTML = `<div class="wrap">Author tools · ${live ? "local writing server" : "preview only"}</div>`;
  }

  function list() {
    $("#entry-list").innerHTML = items.map((i, n) =>
      `<button class="studio-item" type="button" data-n="${n}"${n === current ? ' aria-current="true"' : ""}>${i.title || "Untitled"}${i.draft ? " (draft)" : ""}<small>${i.type === "case" ? "Case study" : "Post"} · ${i.year || ""}</small></button>`
    ).join("");
  }

  function sectionsFrom(item) {
    const box = $("#sections");
    box.replaceChildren();
    (item.body && item.body.length ? item.body : [["", ""]]).forEach((b, n) => {
      const wrap = document.createElement("div");
      wrap.className = "studio-section";
      wrap.innerHTML = `<header><strong>Section ${n + 1}</strong><button type="button" class="ghost rm" data-rm="${n}">Remove</button></header>
        <label>Heading (optional) <input class="sec-h"></label>
        <label>Text <textarea class="sec-t"></textarea></label>`;
      wrap.querySelector(".sec-h").value = b[0] || "";
      wrap.querySelector(".sec-t").value = b[1] || "";
      box.appendChild(wrap);
    });
  }

  function readForm(item) {
    item.previousType = item.previousType || item.type;
    item.previousSlug = item.previousSlug || item.slug;
    item.type = $("#f-type").value;
    item.year = +$("#f-year").value || new Date().getFullYear();
    item.tag = $("#f-tag").value.trim();
    item.h = Math.max(0, Math.min(360, +$("#f-h").value || 200));
    item.title = $("#f-title").value.trim();
    item.slug = $("#f-slug").value.trim() || slugify(item.title);
    item.summary = $("#f-summary").value.trim();
    item.body = [...document.querySelectorAll(".studio-section")].map((sec) => [
      sec.querySelector(".sec-h").value.trim(),
      sec.querySelector(".sec-t").value.trim()
    ]).filter((b) => b[0] || b[1]);
    if (!item.body.length) item.body = [["", ""]];
  }

  function show(n) {
    if (current >= 0 && items[current]) readForm(items[current]);
    current = n;
    const item = items[n];
    $("#editor").hidden = !item;
    $("#empty-editor").hidden = !!item;
    if (!item) { list(); return; }
    $("#editor-title").textContent = (item.type === "case" ? "Case study" : "Post") + (item.draft ? " · draft" : "");
    $("#f-type").value = item.type;
    $("#f-year").value = item.year;
    $("#f-tag").value = item.tag || "";
    $("#f-h").value = item.h;
    $("#f-title").value = item.title || "";
    $("#f-slug").value = item.slug || "";
    $("#f-slug").dataset.locked = item.slug ? "1" : "";
    $("#f-summary").value = item.summary || "";
    sectionsFrom(item);
    list();
  }

  function add(type) {
    if (current >= 0 && items[current]) readForm(items[current]);
    items.unshift({
      type, slug: "", title: "", tag: type === "case" ? "Design systems" : "Writing",
      year: new Date().getFullYear(), h: Math.floor(Math.random() * 360), summary: "",
      body: [["", ""]], draft: true, order: Date.now()
    });
    current = -1;
    show(0);
  }

  function payload(draft) {
    if (current >= 0) readForm(items[current]);
    const item = items[current];
    return {
      site: { name: $("#site-name").value, role: $("#site-role").value, intro: $("#site-intro").value },
      type: item.type,
      slug: item.slug,
      previousSlug: item.previousSlug || item.slug,
      previousType: item.previousType || item.type,
      title: item.title,
      tag: item.tag,
      year: item.year,
      h: item.h,
      summary: item.summary,
      order: item.order,
      draft,
      body: item.body.map((b) => ({ heading: b[0], text: b[1] }))
    };
  }

  async function save(draft) {
    if (current < 0) {
      status("Pick or create an entry first.");
      return;
    }
    if (!live) {
      status("Start the writing server with npm run dev, then open /author/ on that local URL.");
      return;
    }
    status(draft ? "Saving draft…" : "Publishing…");
    const res = await fetch(api("article"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(draft))
    });
    const data = await res.json();
    if (!res.ok) {
      status("Could not save.");
      return;
    }
    items[current].draft = draft;
    items[current].slug = data.slug;
    items[current].type = data.type;
    items[current].previousSlug = data.slug;
    items[current].previousType = data.type;
    $("#f-slug").value = data.slug;
    list();
    status(draft ? "Draft saved in src/content/." : "Published. Cards on Home, Case studies, and Blog will link here after the next build.");
  }

  $("#new-post").addEventListener("click", () => add("post"));
  $("#new-case").addEventListener("click", () => add("case"));
  $("#entry-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-n]");
    if (b) show(+b.dataset.n);
  });
  $("#add-section").addEventListener("click", () => {
    if (current < 0) return;
    readForm(items[current]);
    items[current].body.push(["", ""]);
    sectionsFrom(items[current]);
  });
  $("#sections").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (!rm || current < 0) return;
    readForm(items[current]);
    items[current].body.splice(+rm.dataset.rm, 1);
    if (!items[current].body.length) items[current].body = [["", ""]];
    sectionsFrom(items[current]);
  });
  $("#f-title").addEventListener("input", () => {
    if (!$("#f-slug").dataset.locked) $("#f-slug").value = slugify($("#f-title").value);
  });
  $("#f-slug").addEventListener("input", () => { $("#f-slug").dataset.locked = "1"; });
  $("#delete-entry").addEventListener("click", async () => {
    if (current < 0 || !confirm("Delete this entry from src/content/?")) return;
    const item = items[current];
    if (live && item.slug) {
      await fetch(api("article-delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, slug: item.slug })
      });
    }
    items.splice(current, 1);
    current = -1;
    show(-1);
    status("Deleted.");
  });
  $("#save-draft").addEventListener("click", () => save(true));
  $("#publish").addEventListener("click", () => save(false));

  load();
})();
