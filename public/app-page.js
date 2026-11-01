/* Laju — halaman setelah onboarding: Dashboard, Tangga milestone, Rapor.
   Butuh core.js dimuat lebih dulu. Navigasi lewat hash:
   #dashboard · #milestone · #milestone/<id> · #milestone/utang · #rapor */
(() => {
  "use strict";

  const view = $("#view");
  const LAST_ONBOARDING_STEP = 7;   // indeks langkah "Hasil" di onboarding.js
  let ms = [];                      // tangga yang sudah dihitung (termasuk rapor di ujung)
  const page = { filter: "all" };
  const sim = {};                   // nilai simulator yang sedang digeser (per langkah)

  const STATUS_TEXT = { done: "Selesai", active: "Sedang berjalan", next: "Berikutnya" };
  const statusTag = (m) => m.status === "done" ? statusPill("good", "Selesai")
    : m.status === "active" ? `<span class="tag lime">${ICON.badge} Langkah aktif</span>`
    : `<span class="tag warn">Berikutnya</span>`;
  const firstName = () => esc(S.account.fullName.split(" ")[0] || "Pak/Bu");
  const fmtDay = (d) => d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtShortDate = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const monthYear = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" }); };
  const IC = {
    flag: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4m0 0h12l-2 4 2 4H4"/></svg>',
    target: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm-3 1h3v3a3 3 0 0 1-3-3Zm14 0h-3v3a3 3 0 0 0 3-3ZM12 13v4m-4 4h8"/></svg>',
    lane: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h18M3 17h18M7 7v10M17 7v10"/></svg>',
    undo: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  };

  function route() {
    const [p, id] = location.hash.replace(/^#\/?/, "").split("/");
    return { p: p || "dashboard", id: id || "" };
  }

  // ---------- Render ----------
  function render(keepScroll = false) {
    const y = window.scrollY;
    let { p, id } = route();
    if (p === "milestone" && id === "rapor") p = "rapor";
    document.querySelectorAll("[data-tab]").forEach(a => {
      if (a.dataset.tab === p) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (!S.finished) { view.innerHTML = gate(); document.title = "Laju"; return; }
    ms = buildMilestones();
    logProgress();
    if (p === "rapor") { view.innerHTML = rapor(); document.title = "Rapor — Laju"; }
    else if (p === "milestone" && id === "utang") { view.innerHTML = laneDetail(); document.title = "Jalur pelunasan utang — Laju"; }
    else if (p === "milestone" && id) { view.innerHTML = detail(id); document.title = `${ms.find(m => m.id === id)?.title || "Tangga"} — Laju`; }
    else if (p === "milestone") { view.innerHTML = overview(); document.title = "Tangga milestone — Laju"; }
    else { view.innerHTML = dashboard(); document.title = "Dashboard — Laju"; }
    if (keepScroll) window.scrollTo(0, y);
    hideTip();
  }

  // Satu titik riwayat per hari: progres tiap langkah, jalur utang, dan skor.
  function logProgress() {
    const today = isoOf(new Date());
    let changed = false;
    const put = (log, v) => {
      const last = log[log.length - 1];
      if (last && last.d === today) { if (last.p !== v) { last.p = v; changed = true; } }
      else { log.push({ d: today, p: v }); changed = true; }
      if (log.length > 120) log.splice(0, log.length - 120);
    };
    for (const m of ms) put((S.milestones.log[m.id] ||= []), m.progress);
    const x = ms[0].x;
    if (x.lane.active) put((S.milestones.log.utang ||= []), x.lane.progress);
    const sl = S.scoreLog, last = sl[sl.length - 1];
    if (last && last.d === today) { if (last.s !== x.h.total) { last.s = x.h.total; changed = true; } }
    else { sl.push({ d: today, s: x.h.total }); changed = true; }
    if (!S.startSnap) { S.startSnap = snapshotMetrics(); changed = true; }
    if (changed) save();
  }

  function gate() {
    return `<div class="page-head">
        <p class="eyebrow">Laju</p>
        <h1 class="step-title">Selesaikan onboarding dulu</h1>
        <p class="step-desc">Dashboard, tangga milestone, dan rapor disusun dari data yang Anda isi saat onboarding.</p>
      </div>
      <div class="stack">${card("", "", `<div class="chips">
        <a class="btn" href="onboarding.html">Lanjutkan onboarding</a>
        <button type="button" class="btn secondary" data-act="demo">Lihat dengan data contoh</button>
      </div>`)}</div>`;
  }

  const mainSteps = () => ms.filter(m => m.id !== "rapor");
  const activeStep = () => mainSteps().find(m => m.status === "active");

  // ---------- Dashboard ----------
  function dashboard() {
    const x = ms[0].x, c = x.c, h = x.h;
    const doneN = mainSteps().filter(m => m.status === "done").length;
    return `<div class="page-head">
        <p class="eyebrow">Dashboard</p>
        <h1 class="step-title">Halo, ${firstName()}</h1>
        <p class="step-desc">Ringkasan keuangan Anda, ${fmtDay(new Date())}. ${c.verified ? `Data dari isian Anda dan ${aggregate().count} e-wallet terverifikasi.` : "Data dari isian manual — hubungkan e-wallet lewat Ubah data supaya terverifikasi."}</p>
      </div>
      <div class="dash-grid">
        ${activeCard(activeStep(), doneN)}
        ${allocCard(x)}
        ${vizScore(h)}
      </div>
      <div class="dash-cols">
        <div class="dash-col">${vizPillars(h)}${vizCashflow(c, h)}</div>
        <div class="dash-col">${vizEmergency(c, h)}${vizReliability(c)}</div>
      </div>`;
  }

  function activeCard(m, doneN) {
    const lane = ms[0].x.lane;
    const body = m ? `
        <a class="act-step" href="#milestone/${m.id}">
          <span class="mnum">${m.number}</span>
          <span><b>${esc(m.title)}</b><small>${esc(m.caption)}</small></span>
        </a>
        ${m.gap ? `<p class="goal-gap">${IC.target}<span>${esc(m.gap)}</span></p>` : ""}
        ${meter(m)}
        ${lane.active && !lane.done ? laneMini(lane) : ""}
        <div class="chips"><a class="btn sm" href="#milestone/${m.id}">Buka langkah ini</a><a class="btn sm secondary" href="#milestone">Lihat semua tangga</a></div>`
      : `<p class="hint" style="font-size:.9rem">Semua tangga sudah selesai.</p><div><a class="btn sm" href="#rapor">Lihat rapor akhir</a></div>`;
    return `<section class="card viz-card" aria-labelledby="act-h">
      <div class="card-head"><h2 id="act-h">Tangga milestone</h2><p>${doneN} dari ${mainSteps().length} tangga selesai</p></div>
      ${track(m?.id || "", true)}
      ${body}
    </section>`;
  }

  // Jalur utang ringkas (dipakai di dashboard & langkah lain)
  function laneMini(lane) {
    return `<a class="lane-mini" href="#milestone/utang">
      <span class="lane-ic">${IC.lane}</span>
      <span class="lane-txt"><b>Sambil jalan: pelunasan utang ${lane.progress}%</b><small>Sisa ${rp(lane.left)}${lane.months != null ? ` · perkiraan lunas ${monthYear(lane.months)}` : ""}</small></span>
      <span class="chev" aria-hidden="true">›</span>
    </a>`;
  }

  // Pembagian sisa uang bulan ini (mengikuti fase & tujuan utama)
  function allocCard(x) {
    const a = x.alloc;
    if (a.phase === "minus") {
      return `<section class="card viz-card" aria-labelledby="al-h">
        <div class="card-head"><h2 id="al-h">Rencana uang bulan ini</h2><p>${esc(a.title)}</p></div>
        <div class="note danger">${ICON.alert}<span>${esc(a.why)}</span></div>
        <div><a class="btn sm" href="#milestone/minus">Susun rencana keluar dari minus</a></div>
      </section>`;
    }
    return `<section class="card viz-card" aria-labelledby="al-h">
      <div class="card-head"><h2 id="al-h">Rencana uang bulan ini</h2><p>Sisa ${rp(a.net)} per bulan dibagi otomatis menurut fase Anda.</p></div>
      <p class="phase"><span class="tag lime">Fase</span><b>${esc(a.title)}</b></p>
      <div class="stack100 tall" role="img" aria-label="${esc(a.items.map(i => `${i.label} ${rp(i.amount)}`).join(", "))}">${a.items.map(i => `<span style="flex:${i.share};background:${i.color}" data-tip="${esc(i.label)}: ${rp(i.amount)}/bln" tabindex="0"></span>`).join("")}</div>
      <ul class="alloc-list">${a.items.map(i => `<li><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b class="num">${rp(i.amount)}<small>/bln</small></b><small class="num">≈ ${rp(i.perDay)}/hari narik</small></li>`).join("")}</ul>
      <p class="hint">${esc(a.why)}</p>
    </section>`;
  }

  // ---------- Tangga (overview) ----------
  function overview() {
    const act = activeStep(), x = ms[0].x;
    const steps = mainSteps(), doneN = steps.filter(m => m.status === "done").length;
    const p = Math.round((doneN / steps.length) * 100);
    const counts = { all: ms.length, done: ms.filter(m => m.status === "done").length, todo: ms.filter(m => m.status !== "done").length };
    const shown = ms.filter(m => page.filter === "all" || (page.filter === "done" ? m.status === "done" : m.status !== "done"));
    return `<div class="page-head">
        <p class="eyebrow">Tangga milestone</p>
        <h1 class="step-title">${act ? `Langkah ${act.number} dari ${steps.length}: ${esc(act.title)}` : "Semua tangga selesai"}</h1>
        <p class="step-desc">Naik satu langkah dalam satu waktu. Pelunasan utang berjalan di jalur sendiri, bersamaan dengan langkah lain.</p>
      </div>
      <section class="card viz-card" aria-labelledby="sum-h">
        <div class="kv" style="margin:0"><span id="sum-h">${doneN} dari ${steps.length} tangga selesai</span><span class="num">${p}%</span></div>
        <div class="meter" style="background:var(--secondary)" role="progressbar" aria-label="Tangga selesai" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><span class="meter-fill" style="width:${Math.max(p, 1)}%;background:var(--fg)"></span></div>
        ${track(act?.id || "")}
        ${act ? `<a class="act-step" href="#milestone/${act.id}"><span class="mnum">${act.number}</span><span><b>Sekarang: ${esc(act.title)}</b><small>${esc(act.gap || act.short)}</small></span></a>` : `<a class="act-step" href="#rapor"><span class="mnum">${IC.star}</span><span><b>Rapor akhir siap</b><small>Lihat kesimpulan perjalanan Anda</small></span></a>`}
      </section>
      ${x.lane.active ? laneCard(x.lane) : ""}
      <div class="filters" role="group" aria-label="Saring tangga">
        ${[["all", "Semua"], ["todo", "Belum selesai"], ["done", "Selesai"]].map(([k, l]) => `<button type="button" class="chip" aria-pressed="${page.filter === k}" data-filter="${k}">${l} (${counts[k]})</button>`).join("")}
      </div>
      <ol class="mlist">${shown.map(row).join("") || `<li class="hint">Belum ada tangga di kelompok ini.</li>`}</ol>`;
  }

  function laneCard(lane) {
    return `<section class="card viz-card lane-card" aria-labelledby="lane-h">
      <div class="card-head"><h2 id="lane-h">${IC.lane} Jalur paralel: pelunasan utang</h2><p>Berjalan bersamaan dengan langkah 2–8 — Anda tidak perlu menunggu lunas untuk naik tangga lain.</p></div>
      ${lane.done ? `<p class="goal-gap done">${ST_ICON.good}<span>Semua utang lunas</span></p>` : `<p class="goal-gap">${IC.target}<span>Sisa ${rp(lane.left)}${lane.months != null ? ` · perkiraan lunas ${monthYear(lane.months)}` : ""}</span></p>`}
      ${goalBar({ kind: "paid", paid: lane.paid, left: lane.left, fmt: rp })}
      <ul class="checkpoints">${lane.checkpoints.map(k => `<li class="${k.met ? "met" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${k.label}${!k.met && k.left ? ` <small>· sisa ${rp(k.left)}</small>` : ""}</span></li>`).join("")}</ul>
      <div><a class="btn sm secondary" href="#milestone/utang">Buka jalur utang</a></div>
    </section>`;
  }

  function row(m) {
    if (m.id === "rapor") {
      return `<li><a class="mrow rapor ${m.status}" href="#rapor" aria-label="Rapor dan kesimpulan. ${m.final ? "Rapor akhir siap" : "Rapor sementara"}.">
        <span class="mnum">${IC.star}</span>
        <span class="mrow-main"><span class="mrow-top"><b>${esc(m.title)}</b>${m.final ? statusPill("good", "Siap") : `<span class="tag warn">Sementara</span>`}</span>
          <small>${esc(m.caption)} Bisa dibuka kapan saja.</small></span>
        <span class="chev" aria-hidden="true">›</span></a></li>`;
    }
    return `<li><a class="mrow ${m.status}" href="#milestone/${m.id}" aria-label="Langkah ${m.number}: ${esc(m.title)}. ${STATUS_TEXT[m.status]}, ${m.progress}%. ${esc(m.short)}.">
      <span class="mnum">${m.status === "done" ? `<span class="ck">${ICON.check}</span>` : m.number}</span>
      <span class="mrow-main">
        <span class="mrow-top"><b>${esc(m.title)}</b>${statusTag(m)}</span>
        <span class="mrow-goal"><b>${esc(m.short)}</b>${m.gap && m.status !== "done" ? `<span class="gap-pill">${esc(m.gap)}</span>` : ""}</span>
        ${meter(m, true)}
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a></li>`;
  }

  const meterColor = (m) => m.status === "done" ? "var(--st-good)" : m.status === "active" ? "var(--fg)" : "var(--viz-self)";
  function meter(m, compact = false) {
    return `<span class="mmeter ${compact ? "compact" : ""}">
      <span class="meter" style="background:var(--secondary)" role="progressbar" aria-label="Progres ${esc(m.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.progress}"><span class="meter-fill" style="width:${Math.max(m.progress, 1)}%;background:${meterColor(m)}"></span></span>
      <b class="num">${m.progress}%</b>
    </span>`;
  }

  // Penanda bernomor semua tangga + pita jalur utang yang membentang di bawah langkah 2–8.
  function track(currentId, mini = false) {
    const lane = ms[0].x.lane, n = ms.length;
    const href = (m) => m.id === "rapor" ? "#rapor" : `#milestone/${m.id}`;
    const nodes = `<ol class="mtrack ${mini ? "mini" : ""}" aria-label="Semua tangga">${ms.map(m => `<li class="${m.status} ${m.id === currentId ? "current" : ""} ${m.id === "rapor" ? "rapor" : ""}">
        <a href="${href(m)}" ${m.id === currentId ? 'aria-current="step"' : ""} aria-label="${m.id === "rapor" ? "Rapor" : `Langkah ${m.number}: ${esc(m.title)}`} — ${STATUS_TEXT[m.status]}" data-tip="${m.id === "rapor" ? "Rapor & kesimpulan" : `${m.number}. ${esc(m.title)} · ${m.progress}%`}">
          <span class="node">${m.id === "rapor" ? IC.star : m.status === "done" ? ICON.check : m.number}</span>
        </a></li>`).join("")}</ol>`;
    if (!lane.active) return `<div class="mtrack-wrap">${nodes}</div>`;
    const left = (1.5 / n) * 100, width = (6 / n) * 100;   // dari tengah node 2 sampai tengah node 8
    return `<div class="mtrack-wrap has-lane">${nodes}
      <a class="lane-band ${lane.done ? "done" : ""} ${currentId === "utang" ? "current" : ""}" href="#milestone/utang" style="left:${left}%;width:${width}%" data-tip="Jalur utang ${lane.progress}% · sisa ${rp(lane.left)}" aria-label="Jalur paralel pelunasan utang, ${lane.progress}%">
        <i style="width:${Math.max(lane.progress, 2)}%"></i><span>Utang ${lane.progress}%</span>
      </a></div>`;
  }

  // ---------- Detail langkah ----------
  function crumbs(label) {
    return `<nav class="crumbs" aria-label="Navigasi tangga"><a class="link-btn" href="#milestone">‹ Semua tangga</a><span class="num">${label}</span></nav>`;
  }
  function pager(m) {
    const prev = ms[m.index - 1], next = ms[m.index + 1];
    const href = (s) => s.id === "rapor" ? "#rapor" : `#milestone/${s.id}`;
    return `<nav class="pager" aria-label="Tangga sebelum dan sesudah">
      ${prev ? `<a href="${href(prev)}"><small>‹ Sebelumnya</small><b>${prev.number}. ${esc(prev.title)}</b></a>` : "<span></span>"}
      ${next ? `<a class="nx" href="${href(next)}"><small>Berikutnya ›</small><b>${next.id === "rapor" ? "Rapor & kesimpulan" : `${next.number}. ${esc(next.title)}`}</b></a>` : "<span></span>"}
    </nav>`;
  }

  function detail(id) {
    const m = ms.find(s => s.id === id);
    if (!m) return `<div class="page-head"><h1 class="step-title">Tangga tidak ditemukan</h1></div><a class="btn secondary" href="#milestone">Kembali ke semua tangga</a>`;
    const lane = m.x.lane;
    return `${crumbs(`Langkah ${m.number} dari ${mainSteps().length}`)}
      <section class="card viz-card">${track(m.id)}</section>
      <div class="page-head">
        <p class="eyebrow">${esc(m.pillar)}</p>
        <h1 class="step-title">${esc(m.title)}</h1>
        <p class="step-desc">${esc(m.caption)}</p>
        <div style="margin-top:12px">${statusTag(m)}</div>
      </div>
      <div class="stack">
        ${goalCard(m)}
        ${lane.active && !lane.done && m.tool !== "debtgoal" ? laneMini(lane) : ""}
        ${updateCard(m)}
        ${planCard(m)}
        ${historyCard(m.id, m.progress)}
        ${pager(m)}
      </div>`;
  }

  // Target: sekarang vs target dengan kontras jelas + syarat selesai
  function goalCard(m) {
    return `<section class="card goal" aria-labelledby="goal-h">
      <div class="card-head"><h2 id="goal-h">Target langkah ini</h2></div>
      <div class="goal-tiles">
        <div class="goal-now ${m.status === "done" ? "done" : ""}"><span>${esc(m.cur.label)}</span><b>${esc(m.cur.value)}</b></div>
        <div class="goal-tgt"><span>${IC.flag}${esc(m.tgt.label)}</span><b>${esc(m.tgt.value)}</b></div>
      </div>
      ${m.gap ? `<p class="goal-gap">${IC.target}<span>${esc(m.gap)}</span></p>` : `<p class="goal-gap done">${ST_ICON.good}<span>Target tercapai</span></p>`}
      ${goalBar(m.bar)}
      <div class="criteria">
        <p class="lbl">Selesai jika</p>
        <ul>${m.criteria.map(k => `<li class="${k.met ? "met" : ""} ${k.optional ? "opt" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${esc(k.label)}${k.value ? ` <small>· ${esc(k.value)}</small>` : ""}</span></li>`).join("")}</ul>
      </div>
      <p class="hint">Progres <b>${m.progress}%</b> = ${esc(m.explain)}</p>
    </section>`;
  }

  // Batang target: isi = kondisi sekarang, arsiran = kekurangan, garis = target.
  function goalBar(b) {
    if (b.kind === "paid") {
      const total = b.paid + b.left;
      if (total <= 0) return "";
      const pp = (b.paid / total) * 100;
      return `<div class="gbar" role="img" aria-label="Sudah dibayar ${b.fmt(b.paid)}, sisa ${b.fmt(b.left)}">
        <div class="gbar-track">${pp > 0 ? `<span class="gbar-fill good" style="width:${pp}%"></span>` : ""}${b.left > 0 ? `<span class="gbar-gap" style="left:${pp}%;width:${100 - pp}%"></span>` : ""}<span class="gbar-target" style="left:100%"><span>Lunas</span></span></div>
        <div class="gbar-legend"><span><i class="sw good"></i>Sudah dibayar <b>${b.fmt(b.paid)}</b></span><span><i class="sw gap"></i>Sisa <b>${b.fmt(b.left)}</b></span></div>
      </div>`;
    }
    const max = Math.max(b.cur, b.tgt, 1);
    const cp = clamp((b.cur / max) * 100, 0, 100), tp = (b.tgt / max) * 100;
    const done = b.cur >= b.tgt;
    return `<div class="gbar" role="img" aria-label="${esc(b.curLabel || "Sekarang")} ${b.fmt(b.cur)} dari target ${b.fmt(b.tgt)}">
      <div class="gbar-track">
        <span class="gbar-fill ${done ? "good" : ""}" style="width:${Math.max(cp, 0.8)}%"></span>
        ${!done ? `<span class="gbar-gap" style="left:${cp}%;width:${tp - cp}%"></span>` : ""}
        <span class="gbar-target" style="left:${tp}%"><span>Target</span></span>
      </div>
      <div class="gbar-legend"><span><i class="sw ${done ? "good" : "cur"}"></i>${esc(b.curLabel || "Sekarang")} <b>${b.fmt(b.cur)}</b></span><span><i class="sw gap"></i>${done ? `${esc(b.tgtLabel || "Target")} <b>${b.fmt(b.tgt)}</b>` : `Kekurangan <b>${b.fmt(b.tgt - b.cur)}</b>`}</span></div>
    </div>`;
  }

  const pctOf = (v, min, max) => (max > min ? ((v - min) / (max - min)) * 100 : 0);
  const moneyIn = (id, value, placeholder = "0") =>
    `<div class="money"><span aria-hidden="true">Rp</span><input class="input num" id="${id}" inputmode="numeric" autocomplete="off" data-money value="${value ? fmt(value) : ""}" placeholder="${placeholder}"></div>`;
  const moneyVal = (id) => Number(($("#" + id)?.value || "").replace(/\D/g, "")) || 0;
  const POT = {
    emergency: { path: "resilience.savings", label: "Dana darurat", type: "deposit" },
    goal: { path: "resilience.goalSaved", label: "Tabungan tujuan", type: "goal-deposit" },
  };

  // Catatan terakhir untuk langkah ini + tombol urungkan (salah tekan bisa dibatalkan kapan saja)
  function lastEntryNote(stepIds) {
    const last = lastChange();
    const mine = [...S.ledger].reverse().find(e => !e.undone && stepIds.includes(e.step));
    if (!mine) return "";
    const canUndo = last && last.id === mine.id;
    return `<div class="last-entry"><span>Catatan terakhir: <b>${esc(mine.label)}</b> <small>· ${fmtShortDate(new Date(mine.at))}</small></span>
      ${canUndo ? `<button type="button" class="link-btn" data-undo="${mine.id}">${IC.undo} Urungkan</button>` : ""}</div>`;
  }

  // ---------- Perbarui data (selalu lewat konfirmasi) ----------
  function updateCard(m) {
    const x = m.x, c = x.c;
    if (m.tool === "cashflow") {
      const ov = S.overrides;
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Perbarui angka bulan ini</h2><p>Ubah lalu tekan Simpan — Anda akan melihat ringkasan perubahannya dulu.</p></div>
        <div class="field"><label for="upd-income">Pendapatan bersih per bulan</label>${moneyIn("upd-income", Math.round(c.income))}</div>
        <div class="field"><label for="upd-expense">Pengeluaran rutin per bulan</label>${moneyIn("upd-expense", Math.round(c.expMid))}<span class="hint">Di luar cicilan utang (sekarang ${rp(c.debtMonthly)}/bln — diperbarui di jalur utang).</span></div>
        <div class="chips"><button type="button" class="btn sm" data-act="save-cashflow">Simpan angka</button>${ov.income != null || ov.expense != null ? `<button type="button" class="btn sm secondary" data-act="reset-cashflow">Pakai perkiraan onboarding</button>` : ""}</div>
        ${lastEntryNote(["minus"])}
      </section>`;
    }
    if (m.tool === "savings" || m.tool === "goal") {
      const pot = POT[m.pot || "emergency"], now = Number(get(pot.path)) || 0;
      const needTarget = m.tool === "goal" && !m.target;
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">${m.tool === "goal" ? "Atur & catat tabungan tujuan" : "Catat setoran"}</h2><p>${pot.label} sekarang <b>${rp(now)}</b>. Pilih nominal, cek ringkasannya, lalu catat.</p></div>
        ${m.tool === "goal" ? `<div class="grid2">
            <div class="field"><label for="goal-amt">Nominal tujuan</label>${moneyIn("goal-amt", Number(S.resilience.goalAmount) || 0, "misal: 5.000.000")}</div>
            <div class="field"><label for="goal-months">Target waktu (bulan)</label><input class="input num" id="goal-months" inputmode="numeric" value="${Number(S.resilience.horizon) || 12}"></div>
          </div>
          <div><button type="button" class="btn sm ${needTarget ? "" : "secondary"}" data-act="save-goal">Simpan target</button></div>` : ""}
        ${needTarget ? "" : `
        <div class="chips">${[10000, 20000, 50000, 100000].map(a => `<button type="button" class="chip" data-act="deposit" data-amt="${a}">+ ${rpShort(a)}</button>`).join("")}</div>
        <div class="field"><label for="dep-custom">Jumlah lain</label><div class="adder-row">${moneyIn("dep-custom", 0, "misal: 35.000")}<button type="button" class="btn sm" data-act="deposit-custom">Setor</button></div></div>
        <details class="more"><summary>Ada yang terpakai? Koreksi total ${pot.label.toLowerCase()}</summary>
          <div class="adder-row" style="margin-top:10px">${moneyIn("sav-total", now)}<button type="button" class="btn sm secondary" data-act="set-total">Koreksi total</button></div>
        </details>`}
        ${lastEntryNote([m.id])}
      </section>`;
    }
    if (m.tool === "protect") {
      const row = (key, label, info) => {
        const on = !!S.profile[key];
        return `<div class="prot-row ${on ? "on" : ""}">
          <span class="ci">${on ? ST_ICON.good : IC.circle}</span>
          <span class="prot-txt"><b>${label}</b><small>${info}</small></span>
          <button type="button" class="btn sm ${on ? "secondary" : ""}" data-act="toggle-prot" data-key="${key}" data-label="${label}">${on ? "Ubah" : "Sudah aktif"}</button>
        </div>`;
      };
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Status proteksi Anda</h2><p>Tandai setelah kartu/kepesertaan Anda aktif.</p></div>
        ${row("hasBpjsKes", "BPJS Kesehatan", "Biaya berobat & rawat inap. Mandiri kelas 3 ±Rp35.000/bln, atau gratis bila terdaftar PBI.")}
        ${row("hasBpjsKet", "BPJS Ketenagakerjaan", "Kecelakaan kerja & santunan kematian (JKK + JKM). Iuran mulai ±Rp16.800/bln; ojol dapat diskon 50% s.d. Maret 2027.")}
        ${row("hasInsurance", "Asuransi lain (opsional)", "Asuransi kendaraan atau asuransi mikro.")}
        ${lastEntryNote(["proteksi"])}
      </section>`;
    }
    if (m.tool === "monthly") {
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Perbarui setoran bulanan</h2><p>Rencana menabung per bulan. Setoran yang Anda catat di Laju juga ikut dihitung (30 hari terakhir: ${rp(recentActivity().deposits)}).</p></div>
        <div class="adder-row">${moneyIn("upd-monthly", Number(S.resilience.monthlySave) || 0)}<button type="button" class="btn sm" data-act="save-monthly">Simpan</button></div>
        ${lastEntryNote(["rutin"])}
      </section>`;
    }
    if (m.tool === "debtgoal") return laneMini(x.lane);
    return "";
  }

  function debtRows(debts, step) {
    const rows = S.debts.map((d, i) => ({ d, i })).filter(({ d }) => debts.includes(d) || d.paidOff);
    const open = debtOrder(rows.filter(r => debtOpen(r.d)).map(r => r.d)).map(d => rows.find(r => r.d === d));
    const paid = rows.filter(r => !debtOpen(r.d));
    const guessed = open.some(r => !(Number(r.d.months) > 0));
    return `${open.length || paid.length ? "" : `<p class="hint">Tidak ada utang tercatat. Tambah utang lewat <a href="onboarding.html">Ubah data</a>.</p>`}
      ${open.map((r, k) => debtRow(r, k + 1, step)).join("")}${paid.map(r => debtRow(r, 0, step)).join("")}
      ${guessed ? `<p class="hint">* Lama cicilan belum diisi — cicilan diperkirakan sisa utang ÷ 12 bulan.</p>` : ""}`;
  }
  function debtRow({ d, i }, prio) {
    const open = debtOpen(d), rate = debtRate(d), inst = debtInstallment(d);
    return `<div class="drow ${open ? "" : "paid"}">
      <div class="drow-head">${open ? `<span class="prio">${prio}</span>` : ""}<b>${esc(debtTypeLabel(d))}</b>${open && isHighCost(d) ? '<span class="tag warn">Bunga tinggi</span>' : ""}${!open ? statusPill("good", "Lunas") : ""}</div>
      ${open ? `<dl class="drow-facts">
          <div><dt>Sisa</dt><dd class="num">${rp(Number(d.remaining))}</dd></div>
          <div><dt>Bunga</dt><dd>${rate ? `${String(rate).replace(".", ",")}%/bln${Number(d.rate) > 0 ? "" : " (perkiraan)"}` : "—"}</dd></div>
          <div><dt>Cicilan</dt><dd class="num">${rp(inst)}${Number(d.months) > 0 ? "" : "*"}</dd></div>
        </dl>
        ${d.due ? `<p class="hint">Jatuh tempo berikutnya: <b>${fmtDate(d.due)}</b></p>` : ""}
        <div class="field"><label for="pay-${i}">Sudah bayar berapa?</label><div class="adder-row">${moneyIn(`pay-${i}`, 0, "jumlah dibayar")}<button type="button" class="btn sm" data-act="pay" data-i="${i}">Catat bayar</button></div></div>
        <button type="button" class="link-btn" data-act="paidoff" data-i="${i}">Tandai lunas</button>` : ""}
    </div>`;
  }

  // ---------- Rencana per langkah ----------
  function planCard(m) {
    const x = m.x, c = x.c;
    if (m.tool === "cashflow") {
      if (x.net >= 0) return card("Rencana", "", `<div class="note">${ST_ICON.good}<span>Anda sudah tidak minus — sisa ${rp(x.net)} per bulan. Lihat pembagiannya di bawah.</span></div>`) + allocCard(x);
      const p = cashPlan(m);
      return `<section class="card viz-card" aria-labelledby="plan-h">
        <div class="card-head"><h2 id="plan-h">Rencana keluar dari minus</h2><p>Geser untuk mencoba kombinasi hemat pengeluaran dan tambah jam narik.</p></div>
        <div class="field"><span class="lbl">Pengeluaran terbesar Anda</span>${topExpenses(c)}</div>
        <div class="sim">
          <div class="field"><label for="sim-cut">Hemat pengeluaran: <output id="o-cut" class="num">${rp(p.cut)}</output> / bulan</label>
            <input type="range" id="sim-cut" style="--p:${pctOf(p.cut, 0, p.maxCut)}%" data-sim="cut" min="0" max="${p.maxCut}" step="25000" value="${p.cut}"></div>
          <div class="field"><label for="sim-hours">Tambah jam narik: <output id="o-hours" class="num">${p.hours}</output> jam / minggu</label>
            <input type="range" id="sim-hours" style="--p:${pctOf(p.hours, 0, 20)}%" data-sim="hours" min="0" max="20" step="1" value="${p.hours}">
            <span class="hint">Rata-rata pendapatan Anda ±${rp(p.hourly)} per jam narik.</span></div>
        </div>
        <div id="sim-result" aria-live="polite">${cashResult(m, p.cut, p.hours)}</div>
        <div class="chips"><button type="button" class="btn sm secondary" data-act="auto-plan">Isi rencana otomatis</button><button type="button" class="btn sm" data-act="save-plan">Simpan rencana</button></div>
        ${S.milestones.plans.minus ? `<p class="hint">Rencana tersimpan: hemat ${rp(S.milestones.plans.minus.cut)}/bln + ${S.milestones.plans.minus.hours} jam/minggu.</p>` : ""}
      </section>`;
    }
    if (m.tool === "savings" || m.tool === "goal") {
      const pot = POT[m.pot || "emergency"], now = Number(get(pot.path)) || 0, target = m.target || 0, gap = target - now;
      if (!target) return "";
      if (gap <= 0) return card("Rencana", "", `<div class="note">${ST_ICON.good}<span>Target tercapai. Lanjut ke tangga berikutnya.</span></div>`);
      const r = perDayRange(c);
      const perDay = clamp(sim[m.id]?.perday ?? S.milestones.plans[m.id]?.perDay ?? defaultPerDay(x, m), r.min, r.max);
      return `<section class="card viz-card" aria-labelledby="plan-h">
        <div class="card-head"><h2 id="plan-h">Rencana setoran</h2><p>Atur setoran per hari narik — batas atasnya rata-rata pendapatan ojol Anda per hari (${rp(r.max)}).</p></div>
        <div class="field"><label for="sim-perday">Setor per hari narik: <output id="o-perday" class="num">${rp(perDay)}</output></label>
          <input type="range" id="sim-perday" style="--p:${pctOf(perDay, r.min, r.max)}%" data-sim="perday" min="${r.min}" max="${r.max}" step="${r.step}" value="${perDay}">
          <div class="range-ends"><span>${rpShort(r.min)}</span><span>${rpShort(r.max)}</span></div>
          <div class="chips quick">${r.presets.map(v => `<button type="button" class="chip" data-act="perday" data-v="${v}">${rpShort(v)}</button>`).join("")}</div></div>
        <div id="sim-result" aria-live="polite">${savingsResult(m, perDay)}</div>
        <div class="chips"><button type="button" class="btn sm" data-act="save-plan">Jadikan rencana setoran</button></div>
        ${S.milestones.plans[m.id] ? `<p class="hint">Rencana tersimpan: ${rp(S.milestones.plans[m.id].perDay)} per hari narik.</p>` : ""}
      </section>`;
    }
    if (m.tool === "protect") {
      return card("Kenapa ini penting untuk driver", "", `<ul class="help-list">
        <li>${ICON.shield}<span>Satu kali rawat inap atau kecelakaan bisa menghabiskan tabungan berbulan-bulan — dan sering berujung pinjol.</span></li>
        <li>${ICON.shield}<span>BPJS Ketenagakerjaan untuk pekerja mandiri (BPU) melindungi kecelakaan kerja di jalan dan memberi santunan kematian bagi keluarga.</span></li>
        <li>${ICON.info}<span>Nominal iuran bisa berubah — cek kanal resmi BPJS sebelum mendaftar.</span></li>
      </ul>`);
    }
    if (m.tool === "monthly") {
      const t = Math.round((0.1 * c.income) / 1000) * 1000, gap = Math.max(0, t - x.monthlySave);
      const perDay = Math.round(gap / (S.profile.daysPerWeek * WEEKS) / 500) * 500;
      return card("Rencana", "", gap > 0
        ? `<p class="plan-big">Tambah <b>${rp(gap)}</b> per bulan</p><p class="hint" style="font-size:.88rem">= sekitar <b>${rp(perDay)}</b> setiap hari narik (${S.profile.daysPerWeek} hari/minggu). Setiap setoran yang Anda catat di langkah tabungan ikut dihitung.</p>`
        : `<div class="note">${ST_ICON.good}<span>Anda sudah menyisihkan ≥10% pendapatan.</span></div>`);
    }
    if (m.tool === "credit") return scoreGuide(x);
    if (m.tool === "debtgoal") return laneCard(x.lane);
    if (m.tool === "fondasi" && !c.verified) {
      return card("Langkah berikutnya", "", `<p style="font-size:.9rem">Hubungkan e-wallet supaya data Anda berstatus <b>terverifikasi</b> — ini yang nanti dibaca lembaga keuangan.</p><div><a class="btn sm" href="onboarding.html">Hubungkan e-wallet</a></div>`);
    }
    return "";
  }

  // Cara menaikkan skor: komponen yang paling banyak "kehilangan poin", dengan langkah yang memperbaikinya.
  const PART_STEP = {
    "Sisa uang per bulan": "minus", "Dana darurat": "darurat", "Tes guncangan Rp1 juta": "bantalan", "Menabung rutin": "rutin",
    "Porsi cicilan": "utang", "Utang bunga tinggi": "utang", "Total utang": "utang",
    "BPJS Kesehatan": "proteksi", "BPJS Ketenagakerjaan": "proteksi", "Asuransi lain": "proteksi", "Tujuan yang jelas": "tujuan",
  };
  function scoreGuide(x) {
    const h = x.h;
    const parts = h.pillars.flatMap(p => p.parts.map(pt => ({ ...pt, pillar: p.label }))).filter(pt => pt.pts < pt.max).sort((a, b) => (b.max - b.pts) - (a.max - a.pts));
    const need = Math.max(0, 70 - h.total);
    return `<section class="card viz-card" aria-labelledby="sg-h">
      <div class="card-head"><h2 id="sg-h">Cara naik ke skor 70</h2><p>Skor dihitung ulang setiap kali Anda mencatat sesuatu — angka di bawah selalu terbaru.</p></div>
      <div class="score-now"><span class="hero-num" style="font-size:3rem">${h.total}<small>/100</small></span>${statusPill(h.grade.id, h.grade.label)}<span class="hint">${need ? `butuh <b>+${need} poin</b> lagi` : "Skor sudah ≥ 70"}</span></div>
      <ol class="gain-list">${parts.slice(0, 6).map(pt => {
        const to = PART_STEP[pt.label];
        const inner = `<span class="gain">+${pt.max - pt.pts}</span><span><b>${pt.label}</b><small>${esc(pt.value)} · ${esc(pt.tip)}</small></span>${to ? '<span class="chev" aria-hidden="true">›</span>' : ""}`;
        return `<li>${to ? `<a href="#milestone/${to}">${inner}</a>` : `<div>${inner}</div>`}</li>`;
      }).join("")}</ol>
      <p class="hint">"+N" = poin maksimum yang bisa didapat dari komponen itu. Rincian semua komponen ada di grafik pilar pada Dashboard.</p>
    </section>`;
  }

  // --- rencana arus kas
  function hourlyIncome(c) {
    const hours = S.profile.hoursPerDay * S.profile.daysPerWeek * WEEKS;
    return hours > 0 ? (c.appIncome || c.income) / hours : 0;
  }
  function cashPlan(m) {
    const c = m.x.c, deficit = -m.x.net;
    const maxCut = Math.max(25000, Math.round((c.expMid * 0.3) / 25000) * 25000);
    const saved = S.milestones.plans.minus, s = sim.minus || {};
    return { maxCut, hourly: Math.round(hourlyIncome(c)), cut: s.cut ?? saved?.cut ?? 0, hours: s.hours ?? saved?.hours ?? 0, deficit };
  }
  // ±60% dari penghematan, ±40% dari jam tambahan, cadangan 10% supaya tidak pas-pasan.
  function autoCashPlan(m) {
    const p = cashPlan(m), perHour = p.hourly * WEEKS, need = p.deficit * 1.1;
    let hours = perHour > 0 ? Math.min(10, Math.round((need * 0.4) / perHour)) : 0;
    let cut = Math.min(p.maxCut, Math.ceil((need - hours * perHour) / 25000) * 25000);
    while (cut + hours * perHour < need && hours < 20 && perHour > 0) hours++;
    return { cut: Math.max(0, cut), hours };
  }
  function cashResult(m, cut, hours) {
    const c = m.x.c, extraIncome = hourlyIncome(c) * hours * WEEKS;
    const inc = c.income + extraIncome, exp = c.expense - cut, net = inc - exp;
    const max = Math.max(inc, c.income, c.expense, 1);
    const line = (label, v, color, note = "") => `<div><div class="wf-head"><span>${label}</span><b class="num">${rp(v)}</b></div>
      <div class="hb-track"><span class="hb-fill" style="width:${(v / max) * 100}%;background:${color}"></span></div>${note ? `<p class="hb-note">${note}</p>` : ""}</div>`;
    return `<div class="sim-out ${net >= 0 ? "ok" : "bad"}">
      ${line("Pendapatan", inc, "var(--viz-in)", extraIncome ? `+${rp(extraIncome)} dari ${hours} jam tambahan/minggu` : "")}
      ${line("Pengeluaran + cicilan", exp, "var(--viz-out)", cut ? `−${rp(cut)} dari penghematan` : "")}
      <p class="verdict">${net >= 0 ? `${ST_ICON.good}<span>Dengan rencana ini: sisa <b>${rp(net)}</b>/bulan — keluar dari minus.</span>` : `${ST_ICON.critical}<span>Masih kurang <b>${rp(-net)}</b>/bulan. Geser lagi atau pakai rencana otomatis.</span>`}</p>
    </div>`;
  }
  function topExpenses(c) {
    // nilai per kategori sama persis dengan hitungan (titik tengah + batas bawah e-wallet)
    const cats = EXPENSE_CATEGORIES.map(k => ({ k, v: catEffective(k.id, c) })).filter(a => a.v > 0);
    const raw = cats.reduce((s, a) => s + a.v, 0) || 1, scale = c.expMid / raw;
    const top = cats.map(a => ({ ...a, v: a.v * scale })).sort((a, b) => b.v - a.v).slice(0, 5);
    const max = Math.max(1, ...top.map(t => t.v));
    return `<div class="hbars tight">${top.map(t => `<div class="hrow"><span>${esc(t.k.label)}${t.k.group === "gaya" ? ' <span class="tag warn">bisa dikurangi</span>' : ""}</span><span class="num">${rp(t.v)}</span><div class="bar peach"><i style="width:${(t.v / max) * 100}%"></i></div></div>`).join("")}</div>`;
  }

  // --- rencana tabungan: rentang adaptif Rp1.000 s.d. rata-rata pendapatan ojol per hari
  function perDayRange(c) {
    const max = Math.max(2000, Math.ceil(dailyAppIncome(c) / 1000) * 1000);
    const presets = [0.05, 0.1, 0.2].map(f => Math.max(1000, Math.round((max * f) / 1000) * 1000)).filter((v, i, a) => a.indexOf(v) === i);
    return { min: 1000, max, step: 1000, presets };
  }
  function defaultPerDay(x, m) {
    const fromAlloc = x.alloc.items.find(i => i.key === (m.pot === "goal" ? "goal" : "emergency"))?.perDay;
    if (fromAlloc) return fromAlloc;
    const ms_ = x.monthlySave;
    return ms_ > 0 ? Math.max(1000, Math.round(ms_ / (S.profile.daysPerWeek * WEEKS) / 1000) * 1000) : Math.max(1000, Math.round(perDayRange(x.c).max * 0.1 / 1000) * 1000);
  }
  function savingsResult(m, perDay) {
    const pot = POT[m.pot || "emergency"], target = m.target, now = Number(get(pot.path)) || 0, gap = target - now;
    const eta = savingsEta(gap, perDay);
    const perMonth = perDay * S.profile.daysPerWeek * WEEKS;
    const months = Math.max(1, Math.ceil(gap / perMonth));
    const step = Math.max(1, Math.ceil(months / 12));
    const cols = []; for (let k = 0; k <= months; k += step) cols.push({ k, v: Math.min(target, now + perMonth * k) });
    if (cols[cols.length - 1].v < target) cols.push({ k: months, v: target });
    const weeks = Math.ceil(eta.days / 7);
    const late = m.deadline && eta.date > m.deadline;
    return `<div class="eta">
        <p class="plan-big">${weeks <= 8 ? `± <b>${weeks} minggu</b>` : `± <b>${Math.ceil(eta.days / 30)} bulan</b>`} lagi</p>
        <p class="hint" style="font-size:.86rem">Perkiraan tercapai <b>${fmtShortDate(eta.date)}</b> · ${rp(perDay * S.profile.daysPerWeek)}/minggu · ${rp(perMonth)}/bulan</p>
        ${m.deadline ? `<p class="verdict ${late ? "late" : "ontime"}">${late ? ST_ICON.serious : ST_ICON.good}<span>${late ? `Lewat dari target ${fmtShortDate(m.deadline)}. Butuh ±${rp(m.needPerMonth)}/bln supaya tepat waktu.` : `Tepat waktu — target ${fmtShortDate(m.deadline)}.`}</span></p>` : ""}
      </div>
      <div class="proj" role="img" aria-label="Proyeksi tabungan per bulan sampai target ${rp(target)}">
        <div class="proj-plot"><span class="proj-line"><span>Target ${rpShort(target)}</span></span>
          <div class="proj-cols">${cols.map(col => `<span class="${col.v >= target ? "hit" : ""}" style="height:${Math.max(4, (col.v / target) * 100)}%" data-tip="${col.k ? `Bulan ke-${col.k}` : "Sekarang"}: ${rp(col.v)}" tabindex="0"></span>`).join("")}</div></div>
        <div class="range-ends"><span>Sekarang</span><span>Bulan ke-${cols[cols.length - 1].k}</span></div>
      </div>`;
  }

  // ---------- Jalur paralel: pelunasan utang ----------
  function laneDetail() {
    const x = ms[0].x, lane = x.lane, c = x.c, h = x.h;
    const extra = clamp(sim.utang?.extra ?? lane.extra, 0, 2000000);
    const meth = DEBT_METHODS[lane.method];
    return `${crumbs("Jalur paralel")}
      <section class="card viz-card">${track("utang")}</section>
      <div class="page-head">
        <p class="eyebrow">Jalur paralel · berjalan bersamaan dengan langkah 2–8</p>
        <h1 class="step-title">Pelunasan utang</h1>
        <p class="step-desc">Utang bisa butuh berbulan-bulan, jadi tidak menahan tangga lain. Bayar cicilan tepat waktu, lunasi satu per satu, dan jangan menambah utang baru.</p>
      </div>
      <div class="stack">
        ${lane.active ? `<section class="card goal" aria-labelledby="goal-h">
          <div class="card-head"><h2 id="goal-h">Target jalur ini</h2></div>
          <div class="goal-tiles">
            <div class="goal-now ${lane.done ? "done" : ""}"><span>Sisa semua utang</span><b>${rp(lane.left)}</b></div>
            <div class="goal-tgt"><span>${IC.flag}Target</span><b>Rp0 (lunas)</b></div>
          </div>
          ${lane.done ? `<p class="goal-gap done">${ST_ICON.good}<span>Semua utang lunas</span></p>` : `<p class="goal-gap">${IC.target}<span>${lane.months != null ? `Perkiraan lunas ${monthYear(lane.months)} (${lane.months} bulan)` : "Belum turun — tambah pembayaran"}</span></p>`}
          ${goalBar({ kind: "paid", paid: lane.paid, left: lane.left, fmt: rp })}
          <div class="criteria"><p class="lbl">Titik pemeriksaan</p><ul>${lane.checkpoints.map(k => `<li class="${k.met ? "met" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${k.label}${!k.met ? ` <small>· sisa ${rp(k.left)}</small>` : ""}</span></li>`).join("")}</ul></div>
          <p class="hint">Progres <b>${lane.progress}%</b> = utang yang sudah dibayar ÷ jumlah tertinggi yang pernah tercatat (${rp(lane.base)}).</p>
        </section>` : card("Tidak ada utang tercatat", "", `<p class="hint">Bagus — jalur ini tidak aktif. Kalau ada utang, tambahkan lewat <a href="onboarding.html">Ubah data</a>.</p>`)}
        ${lane.active && !lane.done ? `<section class="card" aria-labelledby="gr-h">
          <div class="card-head"><h2 id="gr-h">Aturan selama jalur berjalan</h2></div>
          <ul class="checkpoints">
            <li class="${h.dsr <= 0.3 ? "met" : ""}"><span class="ci">${h.dsr <= 0.3 ? ST_ICON.good : ST_ICON.serious}</span><span>Cicilan ≤ 30% pendapatan <small>· sekarang ${pct(h.dsr)} (batas OJK untuk pinjol mulai 2026)</small></span></li>
            <li><span class="ci">${ICON.shield}</span><span>Jangan ambil pinjol/paylater baru — pakai dana darurat untuk biaya mendadak.</span></li>
            <li><span class="ci">${ICON.calendar}</span><span>Bayar tepat waktu — denda menambah utang.</span></li>
          </ul>
        </section>` : ""}
        ${lane.active ? `<section class="card" aria-labelledby="upd-h">
          <div class="card-head"><h2 id="upd-h">Catat pembayaran</h2><p>Urutan mengikuti metode yang Anda pilih (${meth.label.toLowerCase()}). Setiap catatan bisa dicek dulu sebelum disimpan.</p></div>
          ${debtRows(x.openDebts, "utang")}
          ${lastEntryNote(["utang"])}
        </section>` : ""}
        ${lane.active && !lane.done ? `<section class="card viz-card" aria-labelledby="plan-h">
          <div class="card-head"><h2 id="plan-h">Rencana pelunasan</h2><p>Semua cicilan tetap dibayar; uang tambahan diarahkan ke utang nomor 1.</p></div>
          <div class="field"><span class="lbl">Metode</span><div class="chips">${Object.entries(DEBT_METHODS).map(([k, v]) => `<button type="button" class="chip" aria-pressed="${lane.method === k}" data-act="method" data-m="${k}">${v.label}</button>`).join("")}</div><span class="hint">${esc(meth.why)}</span></div>
          <div class="field"><label for="sim-extra">Tambahan bayar per bulan: <output id="o-extra" class="num">${rp(extra)}</output></label>
            <input type="range" id="sim-extra" style="--p:${pctOf(extra, 0, 2000000)}%" data-sim="extra" min="0" max="2000000" step="50000" value="${extra}">
            <div class="range-ends"><span>Rp0</span><span>Rp2 juta</span></div>
            ${allocAmount(x, "debt") ? `<span class="hint">Saran dari pembagian sisa uang bulan ini: <b>${rp(allocAmount(x, "debt"))}</b>/bln.</span>` : ""}</div>
          <div id="sim-result" aria-live="polite">${debtResult(extra)}</div>
          <div class="chips"><button type="button" class="btn sm" data-act="save-lane">Simpan rencana</button></div>
          ${S.milestones.plans.lane ? `<p class="hint">Rencana tersimpan: tambahan ${rp(S.milestones.plans.lane.extra)} per bulan.</p>` : ""}
        </section>` : ""}
        ${lane.active ? historyCard("utang", lane.progress) : ""}
      </div>`;
  }

  function debtResult(extra) {
    const debts = ms[0].x.openDebts;
    const base = simulatePayoff(debts, 0), plan = simulatePayoff(debts, extra);
    const order = debtOrder(debts);
    const txt = base.months == null && plan.months == null
      ? `${ST_ICON.critical}<span>Cicilan sekarang hanya menutup bunga — utang tidak turun. Tambahkan bayar per bulan.</span>`
      : `${ST_ICON.good}<span>${base.months != null ? `Tanpa tambahan: lunas <b>${base.months} bulan</b> lagi (${monthYear(base.months)}).` : "Tanpa tambahan: tidak lunas dalam 10 tahun."} ${extra && plan.months != null ? `Dengan tambahan ${rp(extra)}/bln: <b>${plan.months} bulan</b> (${monthYear(plan.months)})${base.months != null ? ` — <b>${base.months - plan.months} bulan lebih cepat</b>` : ""}.` : ""}</span>`;
    return `<p class="lbl" style="font-size:.85rem;font-weight:700;margin-bottom:8px">Urutan pelunasan</p>
      <ol class="prio-list">${order.map((d, k) => `<li><span class="prio">${k + 1}</span><span><b>${esc(debtTypeLabel(d))}</b> <small>· sisa ${rp(Number(d.remaining))} · ${debtRate(d) ? `${String(debtRate(d)).replace(".", ",")}%/bln` : "tanpa bunga"}</small></span></li>`).join("")}</ol>
      <p class="verdict">${txt}</p>
      ${lineChart([{ label: "Tanpa tambahan", color: "var(--viz-self)", data: base.series }, ...(extra ? [{ label: `Tambah ${rpShort(extra)}/bln`, color: "var(--viz-in)", data: plan.series }] : [])], { yFmt: rpShort, xLabel: "bulan", title: "Sisa utang dari bulan ke bulan" })}`;
  }

  // ---------- Grafik garis ----------
  function lineChart(series, { yFmt = String, xLabel = "", yMax = null, yMin = 0, xFmt = null, title = "" } = {}) {
    const W = 320, H = 150, P = { l: 48, r: 12, t: 12, b: 26 };
    const n = Math.max(...series.map(s => s.data.length)) - 1 || 1;
    const top = yMax ?? Math.max(1, ...series.flatMap(s => s.data));
    const X = (i) => P.l + (i / n) * (W - P.l - P.r), Y = (v) => P.t + (1 - (v - yMin) / (top - yMin || 1)) * (H - P.t - P.b);
    const grid = [0, 0.5, 1].map(f => { const v = yMin + (top - yMin) * f; return `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="lc-grid"/><text x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end" class="lc-ax">${yFmt(v)}</text>`; }).join("");
    const lines = series.map(s => {
      const pts = s.data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
      const li = s.data.length - 1;
      return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(li)}" cy="${Y(s.data[li])}" r="4" fill="${s.color}" stroke="var(--card)" stroke-width="2"/>`;
    }).join("");
    const xl = `<text x="${P.l}" y="${H - 6}" class="lc-ax">${xFmt ? xFmt(0) : "0"}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end" class="lc-ax">${xFmt ? xFmt(n) : `${n} ${xLabel}`}</text>`;
    return `<figure class="lc">
      ${title ? `<figcaption>${esc(title)}</figcaption>` : ""}
      ${series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join("")}</div>` : ""}
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => `${s.label}: dari ${yFmt(s.data[0])} ke ${yFmt(s.data[s.data.length - 1])}`).join("; "))}">${grid}${lines}${xl}</svg>
    </figure>`;
  }

  function historyCard(id, progress) {
    const log = S.milestones.log[id] || [];
    const body = log.length < 2
      ? `<p class="hint" style="font-size:.86rem">Progres hari ini ${progress}%. Grafik muncul setelah ada catatan di hari lain — satu titik per hari.</p>`
      : lineChart([{ label: "Progres", color: "var(--fg)", data: log.map(p => p.p) }], { yMax: 100, yFmt: (v) => `${Math.round(v)}%`, xFmt: (i) => fmtShortDate(parseIso(log[i].d)) });
    return `<section class="card viz-card" aria-labelledby="hist-h"><div class="card-head"><h2 id="hist-h">Riwayat progres</h2></div>${body}</section>`;
  }

  // ---------- Rapor & kesimpulan ----------
  function conclusions(x) {
    const h = x.h, parts = h.pillars.flatMap(p => p.parts);
    const strong = parts.filter(p => p.max >= 4 && p.pts >= p.max * 0.8).sort((a, b) => b.max - a.max).slice(0, 3);
    const weak = parts.filter(p => p.pts < p.max).sort((a, b) => (b.max - b.pts) - (a.max - a.pts)).slice(0, 3);
    const act = activeStep();
    const prio = [];
    if (act) prio.push(`Selesaikan langkah ${act.number} "${act.title}"${act.gap ? ` — ${act.gap.charAt(0).toLowerCase()}${act.gap.slice(1)}` : ""}.`);
    if (x.alloc.items.length) prio.push(`Bagi sisa ${rp(x.alloc.net)}/bln: ${x.alloc.items.map(i => `${i.label.toLowerCase()} ${rp(i.amount)}`).join(", ")}.`);
    else if (x.alloc.phase === "minus") prio.push(`Tutup kekurangan ${rp(-x.alloc.net)}/bln dulu — kurangi pengeluaran atau tambah jam narik.`);
    if (x.lane.active && !x.lane.done) prio.push(`Jalur utang: sisa ${rp(x.lane.left)}${x.lane.months != null ? `, perkiraan lunas ${monthYear(x.lane.months)}` : ""}. Jangan ambil utang baru.`);
    const summary = {
      critical: "Kondisi keuangan masih rentan: satu guncangan kecil bisa memaksa berutang. Fokus pada arus kas dan bantalan dulu.",
      serious: "Keuangan mulai tertata, tetapi masih ada celah besar yang perlu ditutup sebelum aman.",
      warn: "Keuangan cukup sehat. Tinggal menguatkan bantalan dan konsisten menabung.",
      good: "Keuangan sehat: arus kas positif, ada bantalan, dan utang terkendali. Pertahankan kebiasaan ini.",
    }[h.grade.id];
    return { summary, strong, weak, prio };
  }

  function rapor() {
    const x = ms[0].x, h = x.h, steps = mainSteps();
    const final = ms[ms.length - 1].final;
    const start = S.startSnap, now = snapshotMetrics();
    const days = start ? Math.max(0, Math.round((parseIso(now.d) - parseIso(start.d)) / 864e5)) : 0;
    const k = conclusions(x);
    const sl = S.scoreLog;
    const cmp = [
      ["Skor kesehatan", "score", (v) => String(v), 1],
      ["Sisa per bulan", "net", rp, 1],
      ["Dana darurat", "emergency", rp, 1],
      ["Dana darurat (bulan)", "emergencyMonths", (v) => `${String(v).replace(".", ",")} bln`, 1],
      ["Tabungan tujuan", "goalSaved", rp, 1],
      ["Total utang", "totalDebt", rp, -1],
      ["Utang bunga tinggi", "highDebt", rp, -1],
      ["Porsi cicilan", "dsr", (v) => pct(v), -1],
      ["BPJS aktif", "bpjs", (v) => `${v} dari 2`, 1],
    ];
    const ledger = S.ledger.filter(e => !e.undone);
    const total = (types) => ledger.filter(e => types.includes(e.type)).reduce((s, e) => s + (e.amount || 0), 0);
    const ai = buildAIContext(), aiJson = JSON.stringify(ai, null, 2);
    return `<div class="page-head">
        <p class="eyebrow">${final ? "Rapor akhir" : "Rapor sementara"}</p>
        <h1 class="step-title">Rapor keuangan ${firstName()}</h1>
        <p class="step-desc">${start ? `Sejak ${fmtShortDate(parseIso(start.d))} (${days} hari).` : ""} ${steps.filter(m => m.status === "done").length} dari ${steps.length} tangga selesai${x.lane.active ? `, jalur utang ${x.lane.progress}%` : ""}. ${final ? "Semua tangga selesai — ini kesimpulan perjalanan Anda." : "Rapor akhir terbuka setelah semua tangga selesai; sampai saat itu rapor ini diperbarui terus."}</p>
      </div>
      <div class="stack">
        <section class="card viz-card concl" aria-labelledby="cc-h">
          <div class="card-head"><h2 id="cc-h">Kesimpulan</h2><p>Disusun otomatis dari data Anda. Nantinya dianalisis lebih dalam oleh asisten AI.</p></div>
          <div class="score-now"><span class="hero-num" style="font-size:3rem">${h.total}<small>/100</small></span>${statusPill(h.grade.id, h.grade.label)}</div>
          <p class="concl-sum">${esc(k.summary)}</p>
          ${k.strong.length ? `<div><p class="lbl">Yang sudah baik</p><ul class="concl-list good">${k.strong.map(p => `<li>${ST_ICON.good}<span><b>${p.label}</b> <small>· ${esc(p.value)}</small></span></li>`).join("")}</ul></div>` : ""}
          ${k.weak.length ? `<div><p class="lbl">Yang perlu diperbaiki</p><ul class="concl-list bad">${k.weak.map(p => `<li>${ST_ICON.serious}<span><b>${p.label}</b> <small>· ${esc(p.value)}. ${esc(p.tip)}</small></span></li>`).join("")}</ul></div>` : ""}
          ${k.prio.length ? `<div><p class="lbl">Prioritas 30 hari ke depan</p><ol class="concl-prio">${k.prio.map(t => `<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
        </section>

        <section class="card viz-card" aria-labelledby="sc-h">
          <div class="card-head"><h2 id="sc-h">Skor dari waktu ke waktu</h2></div>
          ${start ? `<div class="from-to"><span><small>Awal</small><b>${start.score}</b></span><span aria-hidden="true">→</span><span><small>Sekarang</small><b>${h.total}</b></span>${deltaPill(h.total - start.score, 1, (v) => `${v > 0 ? "+" : ""}${v} poin`)}</div>` : ""}
          ${sl.length >= 2 ? lineChart([{ label: "Skor", color: "var(--fg)", data: sl.map(p => p.s) }], { yMax: 100, yFmt: (v) => String(Math.round(v)), xFmt: (i) => fmtShortDate(parseIso(sl[i].d)) }) : `<p class="hint">Grafik skor muncul setelah ada catatan di hari lain.</p>`}
        </section>

        ${start ? `<section class="card" aria-labelledby="cmp-h">
          <div class="card-head"><h2 id="cmp-h">Awal vs sekarang</h2><p>Awal = saat onboarding selesai (${fmtShortDate(parseIso(start.d))}).</p></div>
          <div class="cmp">${cmp.map(([label, key, f, dir]) => `<div class="cmp-row"><span class="cmp-l">${label}</span><span class="cmp-v num">${f(start[key] ?? 0)} → <b>${f(now[key] ?? 0)}</b></span>${deltaPill((now[key] ?? 0) - (start[key] ?? 0), dir)}</div>`).join("")}</div>
        </section>` : ""}

        <section class="card" aria-labelledby="jr-h">
          <div class="card-head"><h2 id="jr-h">Perjalanan tangga</h2></div>
          <ol class="journey">${steps.map(m => `<li class="${m.status}"><span class="jn">${m.status === "done" ? ICON.check : m.number}</span><span><b>${esc(m.title)}</b><small>${m.status === "done" ? `Selesai ${S.milestones.doneAt[m.id] ? fmtShortDate(parseIso(S.milestones.doneAt[m.id])) : ""}` : `${m.progress}% · ${esc(m.gap || m.short)}`}</small></span></li>`).join("")}
            ${x.lane.active ? `<li class="lane ${x.lane.done ? "done" : ""}"><span class="jn">${IC.lane}</span><span><b>Jalur pelunasan utang</b><small>${x.lane.done ? "Semua utang lunas" : `${x.lane.progress}% · sisa ${rp(x.lane.left)}`}</small></span></li>` : ""}</ol>
        </section>

        <section class="card" aria-labelledby="ac-h">
          <div class="card-head"><h2 id="ac-h">Aktivitas tercatat</h2></div>
          <div class="statrow">${stat("Total setoran", rp(total(["deposit", "goal-deposit"])))}${stat("Bayar utang", rp(total(["pay", "paidoff"])))}${stat("Catatan", String(ledger.length))}</div>
          ${ledger.length ? `<ul class="tx-list">${ledger.slice(-8).reverse().map(e => `<li class="tx"><span class="d">${esc(e.label)}</span><span class="a num">${e.amount ? rp(e.amount) : ""}</span><span class="m">${fmtShortDate(new Date(e.at))}</span></li>`).join("")}</ul>` : `<p class="hint">Belum ada catatan. Catat setoran atau pembayaran di halaman tangga.</p>`}
        </section>

        <section class="card" aria-labelledby="ai-h">
          <div class="card-head"><h2 id="ai-h">Data untuk analisis AI</h2><p>Yang akan dibaca asisten AI untuk membimbing Anda. Tanpa nama, nomor HP, username, password, atau detail area narik.</p></div>
          <details class="more"><summary>Lihat data (${(aiJson.length / 1024).toFixed(1).replace(".", ",")} KB)</summary><pre class="ai-json">${esc(aiJson)}</pre></details>
        </section>
      </div>`;
  }

  function deltaPill(d, dir, f = null) {
    if (!d) return `<span class="st neutral">tetap</span>`;
    const good = d * dir > 0;
    return `<span class="st ${good ? "good" : "critical"}">${good ? ST_ICON.good : ST_ICON.critical}${f ? f(d) : good ? "membaik" : "memburuk"}</span>`;
  }

  // ---------- Konfirmasi → catat → urungkan ----------
  const cdlg = $("#confirmDlg");
  function confirmChange({ title, rows, ok = "Ya, catat", note = "" }) {
    return new Promise((resolve) => {
      cdlg.innerHTML = `<div class="sheet-body">
        <h2 id="cfTitle">${title}</h2>
        <dl class="cf-rows">${rows.map(([l, b, a]) => `<div><dt>${l}</dt><dd><span class="b num">${b}</span><span class="arr" aria-hidden="true">→</span><b class="num">${a}</b></dd></div>`).join("")}</dl>
        ${note ? `<p class="hint">${note}</p>` : ""}
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-c="0">Batal</button><button type="button" class="btn sm" data-c="1">${ok}</button></div>
      </div>`;
      const done = (v) => { cdlg.removeEventListener("click", onClick); cdlg.removeEventListener("close", onClose); if (cdlg.open) cdlg.close(); resolve(v); };
      const onClick = (e) => { if (e.target === cdlg) return done(false); const b = e.target.closest("[data-c]"); if (b) done(b.dataset.c === "1"); };
      const onClose = () => done(false);
      cdlg.addEventListener("click", onClick); cdlg.addEventListener("close", onClose);
      cdlg.showModal();
      cdlg.querySelector('[data-c="1"]').focus();
    });
  }

  async function commit({ title, rows, ok, note, type, label, amount = 0, step, paths, apply, msg }) {
    if (!(await confirmChange({ title, rows, ok, note }))) return;
    const before = health(calc()).total, prevStatus = Object.fromEntries(ms.map(m => [m.id, m.status]));
    const e = recordChange({ type, label, amount, step, paths, apply });
    for (const key of Object.keys(sim)) delete sim[key];
    save(); render(true);
    const after = health(calc()).total;
    const finished = ms.find(m => m.id !== "rapor" && m.status === "done" && prevStatus[m.id] !== "done");
    snack(`${finished ? `Tangga "${finished.title}" selesai! ` : ""}${msg}${after !== before ? ` · Skor ${before} → ${after}` : ""}`, e.id);
  }

  const snackEl = $("#snack");
  function snack(msg, undoId = null) {
    snackEl.innerHTML = `<span>${esc(msg)}</span>${undoId ? `<button type="button" class="snack-btn" data-undo="${undoId}">${IC.undo} Urungkan</button>` : ""}`;
    snackEl.classList.toggle("has-btn", !!undoId);   // tanpa tombol: tidak menghalangi ketukan ke konten di bawahnya
    snackEl.classList.add("show");
    clearTimeout(snack._t); snack._t = setTimeout(() => snackEl.classList.remove("show"), undoId ? 8000 : 2200);
  }
  function undo(id) {
    const before = health(calc()).total;
    const e = S.ledger.find(l => l.id === id);
    if (!undoChange(id)) return snack("Hanya catatan terakhir yang bisa diurungkan.");
    save(); render(true);
    const after = health(calc()).total;
    snack(`Dibatalkan: ${e.label}${after !== before ? ` · Skor ${before} → ${after}` : ""}`);
  }
  snackEl.addEventListener("click", (ev) => { const b = ev.target.closest("[data-undo]"); if (b) { snackEl.classList.remove("show"); undo(b.dataset.undo); } });

  // ---------- Aksi ----------
  const currentStep = () => { const { id } = route(); return ms.find(m => m.id === id); };
  function act(name, el) {
    const m = currentStep(), x = ms[0]?.x;
    switch (name) {
      case "demo": return loadDemo();
      case "save-cashflow": {
        const inc = moneyVal("upd-income"), exp = moneyVal("upd-expense");
        return commit({
          title: "Simpan angka bulan ini?", rows: [["Pendapatan / bln", rp(x.c.income), rp(inc)], ["Pengeluaran rutin / bln", rp(x.c.expMid), rp(exp)], ["Sisa / bln", rp(x.net), rp(inc - exp - x.c.debtMonthly)]],
          ok: "Ya, simpan", type: "cashflow", label: "Angka bulan ini diperbarui", step: "minus", paths: ["overrides"],
          apply: () => { S.overrides = { income: inc, expense: exp, updatedAt: new Date().toISOString() }; }, msg: "Angka bulan ini disimpan",
        });
      }
      case "reset-cashflow":
        return commit({ title: "Kembali ke perkiraan onboarding?", rows: [["Sumber angka", "Diperbarui", "Onboarding"]], ok: "Ya, kembalikan", type: "cashflow", label: "Kembali ke perkiraan onboarding", step: "minus", paths: ["overrides"], apply: () => { S.overrides = {}; }, msg: "Memakai perkiraan onboarding" });
      case "deposit": case "deposit-custom": {
        const amt = name === "deposit" ? Number(el.dataset.amt) : moneyVal("dep-custom");
        if (!amt) { $("#dep-custom")?.focus(); return; }
        const pot = POT[m.pot || "emergency"], now = Number(get(pot.path)) || 0;
        return commit({
          title: `Catat setoran ${rp(amt)}?`, rows: [[pot.label, rp(now), rp(now + amt)]], note: "Pastikan uangnya sudah benar-benar Anda pisahkan.",
          type: pot.type, label: `Setoran ${rp(amt)} ke ${pot.label.toLowerCase()}`, amount: amt, step: m.id, paths: [pot.path],
          apply: () => set(pot.path, now + amt), msg: `Setoran ${rp(amt)} dicatat`,
        });
      }
      case "set-total": {
        const pot = POT[m.pot || "emergency"], now = Number(get(pot.path)) || 0, v = moneyVal("sav-total");
        if (v === now) return;
        return commit({ title: `Koreksi total ${pot.label.toLowerCase()}?`, rows: [[pot.label, rp(now), rp(v)]], ok: "Ya, koreksi", type: "correct", label: `Koreksi ${pot.label.toLowerCase()} ke ${rp(v)}`, step: m.id, paths: [pot.path], apply: () => set(pot.path, v), msg: "Total dikoreksi" });
      }
      case "save-goal": {
        const amt = moneyVal("goal-amt"), months = clamp(Number($("#goal-months").value) || 12, 1, 120);
        return commit({
          title: "Simpan target tujuan?", rows: [["Nominal", rp(Number(S.resilience.goalAmount) || 0), rp(amt)], ["Target waktu", `${S.resilience.horizon} bln`, `${months} bln`]], ok: "Ya, simpan",
          type: "goal", label: `Target tujuan ${rp(amt)} dalam ${months} bln`, step: "tujuan", paths: ["resilience.goalAmount", "resilience.horizon"],
          apply: () => { S.resilience.goalAmount = amt; S.resilience.horizon = months; }, msg: "Target tujuan disimpan",
        });
      }
      case "save-monthly": {
        const v = moneyVal("upd-monthly"), now = Number(S.resilience.monthlySave) || 0;
        return commit({ title: "Perbarui setoran bulanan?", rows: [["Disisihkan / bln", rp(now), rp(v)]], ok: "Ya, simpan", type: "monthly", label: `Setoran bulanan ${rp(v)}`, step: "rutin", paths: ["resilience.monthlySave"], apply: () => { S.resilience.monthlySave = v; }, msg: "Setoran bulanan diperbarui" });
      }
      case "toggle-prot": {
        const key = el.dataset.key, label = el.dataset.label, on = !!S.profile[key];
        return commit({ title: on ? `Tandai ${label} tidak aktif?` : `Tandai ${label} sudah aktif?`, rows: [[label, on ? "Aktif" : "Belum", on ? "Belum" : "Aktif"]], ok: "Ya, ubah", type: "protect", label: `${label} ${on ? "dinonaktifkan" : "aktif"}`, step: "proteksi", paths: [`profile.${key}`], apply: () => { S.profile[key] = !on; }, msg: `${label} ${on ? "ditandai belum aktif" : "ditandai aktif"}` });
      }
      case "pay": {
        const i = Number(el.dataset.i), d = S.debts[i], v = moneyVal(`pay-${i}`);
        if (!v) { $(`#pay-${i}`)?.focus(); return; }
        const left = Math.max(0, Number(d.remaining) - v);
        return commit({
          title: `Catat bayar ${rp(v)}?`, rows: [[`Sisa ${debtTypeLabel(d)}`, rp(Number(d.remaining)), rp(left)]], note: left ? "" : "Utang ini akan tercatat lunas.",
          type: "pay", label: `Bayar ${debtTypeLabel(d)} ${rp(v)}`, amount: Math.min(v, Number(d.remaining)), step: "utang", paths: [`debts.${i}`],
          apply: () => { d.remaining = left; if (!left) d.paidOff = true; }, msg: left ? `Pembayaran ${rp(v)} dicatat` : `${debtTypeLabel(d)} lunas`,
        });
      }
      case "paidoff": {
        const i = Number(el.dataset.i), d = S.debts[i];
        return commit({ title: `Tandai ${debtTypeLabel(d)} lunas?`, rows: [[`Sisa ${debtTypeLabel(d)}`, rp(Number(d.remaining)), rp(0)]], ok: "Ya, sudah lunas", type: "paidoff", label: `${debtTypeLabel(d)} lunas`, amount: Number(d.remaining), step: "utang", paths: [`debts.${i}`], apply: () => { d.remaining = 0; d.paidOff = true; }, msg: `${debtTypeLabel(d)} ditandai lunas` });
      }
      case "method": S.milestones.debtMethod = el.dataset.m; save(); render(true); return;
      case "auto-plan": sim.minus = autoCashPlan(m); render(true); return snack("Rencana otomatis diisi — sesuaikan bila perlu");
      case "perday": { const v = Number(el.dataset.v); sim[m.id] = { perday: v }; render(true); return; }
      case "save-plan": {
        if (m.tool === "cashflow") { const p = cashPlan(m); S.milestones.plans.minus = { cut: p.cut, hours: p.hours }; }
        if (m.tool === "savings" || m.tool === "goal") S.milestones.plans[m.id] = { perDay: Number($("#sim-perday").value) };
        save(); render(true); return snack("Rencana disimpan");
      }
      case "save-lane": S.milestones.plans.lane = { extra: Number($("#sim-extra").value) }; save(); render(true); return snack("Rencana pelunasan disimpan");
    }
  }

  // ---------- Events ----------
  window.addEventListener("hashchange", () => {
    for (const key of Object.keys(sim)) delete sim[key];
    render();
    window.scrollTo({ top: 0 });
    view.focus({ preventScroll: true });
  });
  view.addEventListener("click", (ev) => {
    const f = ev.target.closest("[data-filter]");
    if (f) { page.filter = f.dataset.filter; render(true); view.querySelector(`[data-filter="${page.filter}"]`)?.focus(); return; }
    const u = ev.target.closest("[data-undo]"); if (u) return undo(u.dataset.undo);
    const a = ev.target.closest("[data-act]"); if (a) act(a.dataset.act, a);
  });
  view.addEventListener("keydown", (ev) => {   // Enter di kolom uang = tekan tombol di sebelahnya
    if (ev.key === "Enter" && ev.target.matches("[data-money]")) {
      ev.preventDefault();
      ev.target.closest(".adder-row, .field, .card")?.querySelector("[data-act]")?.click();
    }
  });
  view.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.matches("[data-money]")) { const n = Number(el.value.replace(/\D/g, "")) || 0; el.value = n ? fmt(n) : ""; return; }
    if (!el.dataset.sim) return;
    const v = Number(el.value), { id } = route();
    el.style.setProperty("--p", pctOf(v, Number(el.min), Number(el.max)) + "%");
    const out = $(`#o-${el.dataset.sim}`);
    if (out) out.textContent = el.dataset.sim === "hours" ? String(v) : rp(v);
    const res = $("#sim-result");
    if (id === "utang") { sim.utang = { extra: v }; res.innerHTML = debtResult(v); return; }
    const m = currentStep();
    if (m.tool === "cashflow") { sim.minus = { ...(sim.minus || {}), [el.dataset.sim]: v }; const p = cashPlan(m); res.innerHTML = cashResult(m, p.cut, p.hours); }
    if (m.tool === "savings" || m.tool === "goal") { sim[m.id] = { perday: v }; res.innerHTML = savingsResult(m, v); }
  });

  // tooltip (hover + fokus keyboard)
  const tipEl = $("#tip");
  function showTip(el) {
    tipEl.textContent = el.dataset.tip; tipEl.classList.add("show");
    const r = el.getBoundingClientRect(), t = tipEl.getBoundingClientRect();
    tipEl.style.left = clamp(r.left + r.width / 2 - t.width / 2, 8, innerWidth - t.width - 8) + "px";
    let top = r.top - t.height - 10; if (top < 8) top = r.bottom + 10;
    tipEl.style.top = top + "px";
  }
  function hideTip() { tipEl.classList.remove("show"); }
  view.addEventListener("pointerover", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTip(el); });
  view.addEventListener("pointerout", (e) => { if (e.target.closest("[data-tip]")) hideTip(); });
  view.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTip(el); });
  view.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });

  function loadDemo() {
    const wallets = S.wallets;
    S = nextDemoState();
    Object.assign(S, { wallets, finished: true, finishedAt: new Date().toISOString(), step: LAST_ONBOARDING_STEP, maxStep: LAST_ONBOARDING_STEP });
    S.consent.useWallet = wallets.some(w => w.summary);   // supaya "Ubah data" tidak tertahan di langkah E-wallet
    S.consent.useManual = true;
    for (const key of Object.keys(sim)) delete sim[key];
    S.startSnap = snapshotMetrics();
    save(); render();
    snack("Data contoh dipakai");
  }
  $("#demoBtn").addEventListener("click", loadDemo);

  // ---------- Boot ----------
  async function boot() {
    render();
    try {   // segarkan ringkasan e-wallet dari server bila tersedia
      ui.config = await api("/api/config");
      const { wallets } = await api("/api/wallets");
      if (wallets.length || S.wallets.length) {
        const m = mergeServerWallets(wallets);
        S.wallets = m.wallets; save(); render(true);
        if (m.lost.some(w => !w._told)) { snack(`Izin ${m.lost.map(w => walletMeta(w.walletId)?.label).join(", ")} berakhir di server — data transaksi terakhir tetap dipakai. Hubungkan lagi lewat Ubah data.`); S.wallets.forEach(w => { if (w.stale) w._told = true; }); save(); }
      }
    } catch (e) { /* server mati: pakai data terakhir yang tersimpan */ }
  }
  boot();
})();
