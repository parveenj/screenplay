(function () {
  const S = window.SITE, $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const paras = s => String(s).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const url = i => (i.type === "case" ? "work/" : "blog/") + i.slug + "/";
  const art = i => `<div class="art" style="--h:${i.h}" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></div>`;
  const card = i => `<a class="card" href="${url(i)}">${art(i)}<div class="pad"><span class="tag">${esc(i.tag)}</span><h3>${esc(i.title)}</h3><p>${esc(i.summary)}</p></div></a>`;
  const cases = S.items.filter(i => i.type === "case"), posts = S.items.filter(i => i.type === "post");

  /* Header, footer, search */
  const page = document.body.dataset.nav || "";
  const link = (href, label, key) => `<a href="${href}"${page === key ? ' aria-current="page"' : ""}>${label}</a>`;
  $("#site-header").innerHTML = `<div class="bar wrap"><a class="brand" href="index.html">${S.name}</a>
    <nav aria-label="Main">${link("index.html", "Home", "home")}${link("case-studies.html", "Case studies", "cases")}${link("blog.html", "Blog", "blog")}</nav>
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
    $("#hero-title").textContent = S.name; $("#hero-intro").textContent = S.intro;
    const feat = S.items.slice(0, 5), stage = $("#stage"), thumbs = $("#thumbs");
    thumbs.innerHTML = feat.map((i, n) => `<button type="button" data-n="${n}" aria-label="${i.title}">${art(i)}</button>`).join("");
    const show = n => {
      const i = feat[n];
      stage.innerHTML = `<a href="${url(i)}">${art(i)}<div class="cap"><span class="tag">${i.tag}</span><strong>${i.title}</strong></div></a>`;
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
      ["blog.html", "Blog", `${posts.length} posts on craft, tooling, and working with AI.`, posts[0]],
      [url(cases[1]), "Featured: " + cases[1].title, cases[1].summary, cases[1]]
    ].map(c => `<a class="card" href="${c[0]}">${art(c[3])}<div class="pad"><h3>${c[1]}</h3><p>${c[2]}</p></div></a>`).join("");
  }

  /* Listings */
  if (page === "cases" && $("#list")) $("#list").innerHTML = cases.map(card).join("");
  if (page === "blog" && $("#list")) $("#list").innerHTML = posts.map(card).join("");

  /* Detail pages */
  const d = $("#detail");
  if (d && !d.dataset.astro) {
    const slug = new URLSearchParams(location.search).get("slug"), i = S.items.find(x => x.slug === slug);
    const back = d.dataset.back;
    if (!i) { d.innerHTML = `<h1>Not found</h1><p>That page doesn't exist. <a href="${back}">Go back to the list.</a></p>`; }
    else {
      document.title = i.title + " | " + S.name;
      d.innerHTML = `<a class="back" href="${back}">Back to list</a><span class="tag">${esc(i.tag)}, ${esc(i.year)}</span><h1>${esc(i.title)}</h1><p class="lede">${esc(i.summary)}</p>${art(i)}` +
        i.body.map(b => (b[0] ? `<h2>${esc(b[0])}</h2>` : "") + paras(b[1])).join("");
    }
  }
})();
