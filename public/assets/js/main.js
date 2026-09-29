(function () {
  const S = window.SITE, $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const paras = s => String(s).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const url = i => (i.type === "case" ? "work/" : "blog/") + i.slug + "/";
  const art = i => `<div class="art" style="--h:${i.h}" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></div>`;
  const tagColor = t => { let h = 5381; for (const c of String(t).toLowerCase()) h = (h * 33 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 65% 48%)`; };
  const pill = t => `<span class="tag" style="--tag-c:${tagColor(t)}">${esc(t)}</span>`;
  const fmtDate = i => i.date ? new Date(i.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : String(i.year);
  const dated = i => `<time class="date"${i.date ? ` datetime="${esc(i.date)}"` : ""}>${esc(fmtDate(i))}</time>`;
  const card = (i, withDate) => `<a class="card" href="${url(i)}">${art(i)}<div class="pad">${pill(i.tag)}<h3>${esc(i.title)}</h3><p>${esc(i.summary)}</p>${withDate === true ? dated(i) : ""}</div></a>`;
  document.querySelectorAll(".tag[data-tag]").forEach(el => el.style.setProperty("--tag-c", tagColor(el.dataset.tag)));
  const cases = S.items.filter(i => i.type === "case"), posts = S.items.filter(i => i.type === "post");

  /* Header, footer, search */
  const page = document.body.dataset.nav || "";
  const link = (href, label, key) => `<a href="${href}"${page === key ? ' aria-current="page"' : ""}>${label}</a>`;
  $("#site-header").innerHTML = `<div class="bar wrap"><a class="brand" href="index.html"${page === "home" ? ' aria-current="page"' : ""}>screenplay.design</a>
    <nav aria-label="Main">${link("blog.html", "Blog", "blog")}${link("about.html", "About", "about")}</nav>
    <div class="search"><input id="q" type="search" placeholder="Search" aria-label="Search case studies and posts" autocomplete="off"><div id="results" hidden></div></div></div>`;
  $("#site-footer").innerHTML = `<div class="wrap">&copy; ${new Date().getFullYear()} ${S.name}</div>`;
  const q = $("#q"), res = $("#results");
  q.addEventListener("input", () => {
    const t = q.value.trim().toLowerCase();
    if (!t) { res.hidden = true; return; }
    const hits = S.items.filter(i => (i.title + i.summary + i.tag).toLowerCase().includes(t)).slice(0, 6);
    res.innerHTML = hits.length ? hits.map(i => `<a href="${url(i)}">${i.title}<small>${i.type === "case" ? "Case study" : "Blog"}</small></a>`).join("") : "<p>No matches. Try a different word.</p>";
    res.hidden = false;
  });
  document.addEventListener("click", e => { if (!e.target.closest(".search")) res.hidden = true; });

  /* Keep hero height in sync with the sticky header (it wraps on small screens) */
  const hdr = $("#site-header"), setHdr = () => document.documentElement.style.setProperty("--hdr", hdr.offsetHeight + "px");
  setHdr(); addEventListener("resize", setHdr); document.fonts && document.fonts.ready.then(setHdr);

  /* Home */
  if (page === "home") {
    $("#hero-intro").textContent = S.intro;
    const feat = S.items.slice(0, 5), stage = $("#stage"), thumbs = $("#thumbs");
    thumbs.innerHTML = feat.map((i, n) => `<button type="button" data-n="${n}" aria-label="${i.title}">${art(i)}</button>`).join("");
    const show = n => {
      const i = feat[n];
      stage.innerHTML = `<a href="${url(i)}">${art(i)}<div class="cap">${pill(i.tag)}<strong>${esc(i.title)}</strong></div></a>`;
      thumbs.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-pressed", k === n));
    };
    thumbs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) show(+b.dataset.n); });
    show(0);

    const tags = ["All", ...new Set(S.items.map(i => i.tag))], chips = $("#chips"), grid = $("#grid");
    chips.innerHTML = tags.map((t, n) => `<button type="button" aria-pressed="${n === 0}">${t}</button>`).join("");
    const draw = t => { grid.innerHTML = S.items.filter(i => t === "All" || i.tag === t).map(card).join(""); };
    chips.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      chips.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      draw(b.textContent);
    });
    draw("All");

    $("#explore").innerHTML = [
      ["case-studies.html", "Case studies", `${cases.length} projects on design systems, AI interfaces, and enterprise platforms.`, cases[0]],
      ["blog.html", "Blog", `${S.items.length} posts on craft, tooling, and working with AI.`, posts[0]],
      [url(cases[1]), "Featured: " + cases[1].title, cases[1].summary, cases[1]]
    ].map(c => `<a class="card" href="${c[0]}">${art(c[3])}<div class="pad"><h3>${c[1]}</h3><p>${c[2]}</p></div></a>`).join("");
  }

  /* Listings */
  if (page === "cases" && $("#list")) $("#list").innerHTML = cases.map(card).join("");
  if (page === "blog" && $("#list")) {
    const list = $("#list"), per = 10, pages = Math.max(1, Math.ceil(S.items.length / per));
    const cur = Math.min(pages, Math.max(1, parseInt(new URLSearchParams(location.search).get("page"), 10) || 1));
    list.innerHTML = S.items.slice((cur - 1) * per, cur * per).map(i => card(i, true)).join("");
    if (S.items.length > per) {
      const href = n => n === 1 ? "blog.html" : `blog.html?page=${n}`;
      const step = (n, label, rel) => n >= 1 && n <= pages ? `<a href="${href(n)}" rel="${rel}">${label}</a>` : `<span aria-disabled="true">${label}</span>`;
      const nums = Array.from({ length: pages }, (_, k) => k + 1).map(n => `<a href="${href(n)}"${n === cur ? ' aria-current="page"' : ""}>${n}</a>`).join("");
      const bar = where => `<nav class="pager" aria-label="Pagination, ${where}">${step(cur - 1, "← Prev", "prev")}${nums}${step(cur + 1, "Next →", "next")}</nav>`;
      list.insertAdjacentHTML("beforebegin", bar("top"));
      list.insertAdjacentHTML("afterend", bar("bottom"));
    }
  }

  /* Detail pages */
  const d = $("#detail");
  if (d && !d.dataset.astro) {
    const slug = new URLSearchParams(location.search).get("slug"), i = S.items.find(x => x.slug === slug);
    const back = d.dataset.back;
    if (!i) { d.innerHTML = `<h1>Not found</h1><p>That page doesn't exist. <a href="${back}">Go back to the list.</a></p>`; }
    else {
      document.title = i.title + " | " + S.name;
      d.innerHTML = `<a class="back" href="${back}">← Back</a>${pill(i.tag)}<h1>${esc(i.title)}</h1><p class="lede">${esc(i.summary)}</p>${art(i)}` +
        i.body.map(b => (b[0] ? `<h2>${esc(b[0])}</h2>` : "") + paras(b[1])).join("");
    }
  }
})();
