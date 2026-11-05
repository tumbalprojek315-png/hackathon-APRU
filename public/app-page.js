/* Laju: halaman setelah onboarding: Dashboard, Tangga milestone, Rapor.
   Butuh core.js dimuat lebih dulu. Navigasi lewat hash:
   #dashboard · #milestone · #milestone/<id> · #milestone/utang · #rapor */
(() => {
  "use strict";

  const view = $("#view");
  const LAST_ONBOARDING_STEP = 7;   // indeks langkah "Hasil" di onboarding.js
  let ms = [];                      // tangga yang sudah dihitung (termasuk rapor di ujung)
  const page = { filter: "all" };
  const sim = {};                   // nilai simulator yang sedang digeser (per langkah)

  const statusTag = (m) => m.status === "selesai" ? statusPill("good", "Selesai")
    : m.status === "isi_ulang" ? statusPill("warn", "Sedang diisi ulang")
    : m.status === "dibuka_lagi" ? statusPill("serious", "Dibuka lagi")
    : m.status === "dijeda" ? statusPill("warn", "Dijeda")
    : m.status === "aktif" ? `<span class="tag lime">${ICON.badge} Step aktif</span>`
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
    lock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    undo: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  };

  function route() {
    const [p, id, sub] = location.hash.replace(/^#\/?/, "").split("/");
    return { p: p || "dashboard", id: id || "", sub: sub || "" };
  }

  // ---------- Render ----------
  function render(keepScroll = false) {
    const y = window.scrollY;
    let { p, id } = route();
    if (p === "milestone" && id === "rapor") p = "rapor";
    document.querySelectorAll("[data-tab]").forEach(a => {
      if (a.dataset.tab === p) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.body.classList.toggle("no-fab", !S.finished);
    if (!S.finished) { view.innerHTML = gate(); document.title = "Laju"; return; }
    ms = buildMilestones();
    logProgress();
    if (p === "profil") { view.innerHTML = profilePage(); document.title = "Profil · Laju"; }
    else if (p === "rapor") { view.innerHTML = rapor(); document.title = "Rapor · Laju"; }
    else if (p === "milestone" && id === "utang") { view.innerHTML = laneDetail(); document.title = "Jalur pelunasan utang · Laju"; }
    else if (p === "milestone" && id === "skor") { view.innerHTML = scorePage(); document.title = "Rincian skor · Laju"; }
    else if (p === "milestone" && id) { view.innerHTML = detail(id); document.title = `${ms.find(m => m.id === id)?.title || "Tangga"} · Laju`; }
    else if (p === "milestone") { view.innerHTML = overview(); document.title = "Tangga milestone · Laju"; }
    else { view.innerHTML = dashboard(); document.title = "Dashboard · Laju"; }
    tuckNotes(view, location.hash || "dashboard");
    if (route().sub === "rencana" && !keepScroll) {   // dari Dashboard: langsung ke kartu rencana di langkah itu
      const t = view.querySelector("#plan-h, #upd-h")?.closest("section");
      if (t) setTimeout(() => window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 70, behavior: "instant" }), 0);   // setelah hashchange menggulir ke atas
    }
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
  const activeStep = () => mainSteps().find(m => m.status === "aktif" || m.status === "dibuka_lagi");

  // ---------- Dashboard ----------
  function dashboard() {
    const x = ms[0].x, c = x.c, h = x.h;
    const doneN = mainSteps().filter(m => m.status === "selesai").length;
    return `<div class="page-head">
        <p class="eyebrow">Dashboard</p>
        <h1 class="step-title">Halo, ${firstName()}</h1>
        <p class="step-desc">Ringkasan keuangan Anda, ${fmtDay(new Date())}. ${c.verified ? `Data dari isian Anda dan ${aggregate().count} e-wallet terverifikasi.` : "Data dari isian manual. Hubungkan e-wallet lewat Profil supaya terverifikasi."}</p>
      </div>
      <div class="stack dash">
        ${focusCard(doneN)}
        ${pillarsMini(h)}
        ${planSummary(x)}
        ${cashCard(c)}
        ${goalSummary()}
      </div>`;
  }

  // 1. Hanya langkah sekarang (kontras) dan langkah berikutnya (terkunci)
  function focusCard(doneN) {
    const steps = mainSteps(), act = activeStep(), lane = ms[0].x.lane;
    if (!act) return `<section class="card focus-card"><div class="card-head"><h2>Semua langkah selesai</h2></div><div><a class="btn sm" href="#rapor">Lihat rapor akhir</a></div></section>`;
    const nxt = steps.find(m => m.index > act.index && stepLocked(m.status));
    return `<section class="card focus-card" aria-labelledby="fc-h">
      <div class="card-head"><h2 id="fc-h">Step Anda</h2><p>${doneN} dari ${steps.length} selesai</p></div>
      <a class="fc-now" href="#milestone/${act.id}">
        <span class="fc-tag">Kerjakan sekarang</span>
        <span class="fc-row"><span class="fc-num">${act.number}</span><b>${esc(act.title)}</b></span>
        ${act.gap ? `<span class="fc-gap">${IC.target}<span>${esc(act.gap)}</span></span>` : ""}
        <span class="fc-meter"><span class="fc-track"><i style="width:${Math.max(act.progress, 2)}%"></i></span><b class="num">${act.progress}%</b></span>
        <span class="fc-cta">Kerjakan ›</span>
      </a>
      ${lane.active && !lane.done ? laneMini(lane) : ""}
      ${nxt ? `<div class="fc-next"><span class="fc-lock">${IC.lock}</span><span><small>Berikutnya · terbuka setelah step ${act.number} selesai</small><b>${nxt.number}. ${esc(nxt.title)}</b></span></div>` : ""}
    </section>`;
  }

  // 3. Rencana uang dari isian pengguna di Tangga. Belum ada: tombol ke langkah sekarang.
  function planSummary(x) {
    const P = S.milestones.plans, days = S.profile.daysPerWeek * WEEKS, rows = [];
    const st = (id) => ms.find(m => m.id === id);
    const perDay = (v) => [`Setor ${rp(v)} setiap hari narik`, `Sekitar ${rp(Math.round(v * days / 1000) * 1000)} per bulan`];
    if (P.minus && x.net < 0) rows.push(["Keluar dari minus", [P.minus.cut ? `Hemat pengeluaran ${rp(P.minus.cut)} per bulan` : "", P.minus.hours ? `Tambah narik ${P.minus.hours} jam per minggu` : ""].filter(Boolean), "minus"]);
    const em = ["bantalan", "darurat"].find(id => P[id] && st(id)?.status !== "selesai");
    if (em) rows.push(["Dana darurat", perDay(P[em].perDay), em]);
    if (P.tumbuh && st("tumbuh")?.status !== "selesai") rows.push(["Tabungan tujuan", perDay(P.tumbuh.perDay), "tumbuh"]);
    if (st("investasi")?.target > 0 && st("investasi")?.status !== "terkunci") rows.push(["Uang tumbuh", [`Setor ${rp(st("investasi").target)} per bulan`], "investasi"]);
    if (P.lane && x.lane.active && !x.lane.done) rows.push(["Pelunasan utang", [`Bayar utang lebih ${rp(P.lane.extra)} per bulan`], "utang"]);
    const act = activeStep();
    return `<section class="card" aria-labelledby="pl-h">
      <div class="card-head"><h2 id="pl-h">Rencana uang bulan ini</h2></div>
      ${rows.length ? `<ul class="plan-list">${rows.map(([l, lines, id]) => `<li><a href="#milestone/${id}/rencana"><b>${l}</b><ul>${lines.map(t => `<li>${t}</li>`).join("")}</ul><span class="chev" aria-hidden="true">›</span></a></li>`).join("")}</ul>`
        : `<p class="hint">Belum ada rencana. Susun rencana di langkah yang sedang Anda kerjakan.</p>
           <div><a class="btn sm" href="#milestone/${act ? act.id : ""}/rencana">Susun rencana ›</a></div>`}
    </section>`;
  }

  // 2. Empat pilar kesehatan: poin dan kategorinya saja (tanpa skor total), dalam bentuk cincin.
  //    Tangga memakai batang horizontal, jadi Dashboard sengaja memakai bentuk lain.
  function pillarsMini(h) {
    const ring = (p, col) => { const r = 22, c = 2 * Math.PI * r, len = (Math.max(0, Math.min(p.pts / p.max, 1))) * c;
      return `<svg class="pr-ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--secondary)" stroke-width="7"/><circle cx="28" cy="28" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${len} ${c}" transform="rotate(-90 28 28)"/></svg>`; };
    return `<section class="card" aria-labelledby="pil-h">
      <div class="card-head"><h2 id="pil-h">Kesehatan keuangan</h2><p>Empat pilar, masing-masing maksimal 25 poin.</p></div>
      <ul class="pil-tiles">${h.pillars.map(p => { const b = band(p.score); return `<li>
        <span class="pt-ring">${ring(p, b.color)}<b class="num">${p.pts}</b></span>
        <span class="pt-txt"><b>${p.label}</b><small class="num">${p.pts} dari ${p.max} poin</small>${statusPill(b.id, b.label)}</span>
      </li>`; }).join("")}</ul>
      <a class="more-link" href="#milestone/skor">Rincian tiap pilar di Tangga ›</a>
    </section>`;
  }

  // 5. Arus kas: dua batang (masuk dan keluar) lalu satu angka hasil
  function cashCard(c) {
    const inc = c.income, exp = c.expMid, debt = c.debtMonthly, out = exp + debt, net = inc - out;
    const max = Math.max(inc, out, 1), w = (v) => (v / max) * 100;
    return `<section class="card" aria-labelledby="cash-h">
      <div class="card-head"><h2 id="cash-h">Arus kas per bulan</h2></div>
      <div class="cash-rows" role="img" aria-label="Pemasukan ${rp(inc)}, pengeluaran ${rp(out)}, ${net < 0 ? `kurang ${rp(-net)}` : `sisa ${rp(net)}`} per bulan">
        <div class="cash-row"><span class="cr-l">Pemasukan</span><span class="cr-bar"><i class="c-in" style="width:${Math.max(w(inc), 2)}%"></i></span><b class="num">${rpShort(inc)}</b></div>
        <div class="cash-row"><span class="cr-l">Pengeluaran</span><span class="cr-bar"><i class="c-exp" style="width:${Math.max(w(exp), 2)}%"></i>${debt ? `<i class="c-debt" style="width:${w(debt)}%"></i>` : ""}</span><b class="num">${rpShort(out)}</b></div>
      </div>
      <p class="cash-key"><span><i class="c-exp"></i>Kebutuhan ${rpShort(exp)}</span>${debt ? `<span><i class="c-debt"></i>Cicilan ${rpShort(debt)}</span>` : ""}</p>
      <div class="cash-net ${net < 0 ? "neg" : "pos"}"><span>${net < 0 ? "Kurang per bulan" : "Sisa per bulan"}</span><b class="num">${net < 0 ? "−" : ""}${rp(Math.abs(net))}</b></div>
    </section>`;
  }

  // 6. Tujuan keuangan pengguna + yang perlu dilakukan untuk mencapainya
  function goalSummary() {
    const r = S.resilience, ids = r.goals || [];
    if (!ids.length) return card("Tujuan keuangan", "", `<p class="hint">Belum ada tujuan.</p><div>${toProfil("tujuan", "Pilih tujuan di Profil")}</div>`);
    const row = (id) => {
      const d = (r.goalData || {})[id] || {}, amt = Number(d.amount) || 0, saved = Number(d.saved) || 0;
      const p = amt > 0 ? Math.min(100, Math.round((saved / amt) * 100)) : 0, wajib = goalGroup(id) === "wajib";
      return `<li>
        <span class="gs-top"><b>${esc(goalLabel(id))}</b><span class="tag ${wajib ? "warn" : "lime"}">${wajib ? "Wajib" : "Tumbuh"}</span></span>
        <span class="num">${amt ? `${rp(saved)} dari ${rp(amt)}` : "Nominal belum diisi"}${d.deadline ? ` · ${fmtDate(d.deadline)}` : ""}</span>
        ${amt ? `<span class="pt-bar"><i style="width:${Math.max(p, 2)}%"></i></span>` : ""}
      </li>`;
    };
    const wajibN = ids.filter(id => goalGroup(id) === "wajib").length;
    return `<section class="card" aria-labelledby="gs-h">
      <div class="card-head"><h2 id="gs-h">Tujuan keuangan</h2><p>${wajibN ? `${wajibN} tujuan wajib, mulai dikejar di Step 3.` : "Tujuan tumbuh dikejar setelah fondasi aman."}</p></div>
      <ul class="gs-list">${ids.map(row).join("")}</ul>
      <div>${toProfil("tujuan", "Ubah tujuan & nominal")}</div>
    </section>`;
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
      <div class="card-head"><h2 id="al-h">Rencana uang bulan ini</h2><p>Sisa ${rp(a.net)}/bln dibagi otomatis.</p></div>
      <p class="phase"><span class="tag lime">Fase</span><b>${esc(a.title)}</b></p>
      <div class="stack100 tall" role="img" aria-label="${esc(a.items.map(i => `${i.label} ${rp(i.amount)}`).join(", "))}">${a.items.map(i => `<span style="flex:${i.share};background:${i.color}" data-tip="${esc(i.label)}: ${rp(i.amount)}/bln" tabindex="0"></span>`).join("")}</div>
      <ul class="alloc-list">${a.items.map(i => `<li><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b class="num">${rp(i.amount)}<small>/bln</small></b><small class="num">≈ ${rp(i.perDay)}/hari narik</small></li>`).join("")}</ul>
      <p class="hint">${esc(a.why)}</p>
    </section>`;
  }

  // ---------- Tangga (overview) ----------
  // Langkah yang belum boleh dikerjakan (setelah langkah aktif): terlihat, tapi tidak bisa dibuka.
  const isLocked = (m) => stepLocked(m.status) && m.id !== "rapor";

  function overview() {
    const act = activeStep(), x = ms[0].x;
    const steps = mainSteps(), doneN = steps.filter(m => m.status === "selesai").length;
    const p = Math.round((doneN / steps.length) * 100), lane = x.lane.active && !x.lane.done;
    return `<div class="page-head">
        <p class="eyebrow">Tangga milestone</p>
        <h1 class="step-title">${act ? `Step ${act.number} dari ${steps.length - 1}: ${esc(act.title)}` : "Semua tangga selesai"}</h1>
        <p class="step-desc">Kerjakan berurutan. Step berikutnya terbuka setelah step sekarang selesai.</p>
        <div class="ov-prog"><span class="fc-track"><i style="width:${Math.max(p, 2)}%"></i></span><b class="num">${doneN}/${steps.length}</b></div>
      </div>
      <ol class="mlist ${lane ? "has-lane" : ""}">
        ${lane ? `<li class="lane-legend"><a href="#milestone/utang"><span class="lane-ic">${IC.lane}</span><span><b>Pelunasan utang</b><small>Utang bunga tinggi harus bersih untuk menyelesaikan Step 2 · ${x.lane.progress}% lunas</small></span><span class="chev" aria-hidden="true">›</span></a></li>` : ""}
        ${ms.map(row).join("")}
      </ol>
      ${x.lane.active ? laneCard(x.lane) : ""}
      <div class="score-sec">${vizPillars(x.h, { fix: scoreFix, title: `Rincian skor kesehatan ${x.h.total}/100` })}</div>`;
  }

  // Tempat memperbaiki tiap komponen skor: kartu Profil yang harus diisi, atau Catat untuk yang dihitung dari catatan.
  const SCORE_FIX = {
    "Sisa uang per bulan": ["keuangan", "Cek pendapatan & pengeluaran"],
    "Kestabilan pendapatan": ["keuangan", "Isi hari ramai & sepi"],
    "Kebiasaan mencatat": [{ act: "catat" }, "Catat sekarang"],
    "Dana darurat": [{ act: "catat", kind: "setor" }, "Setor dana darurat"],
    "Tes guncangan Rp1 juta": ["tabungan", "Ubah di Tabungan"],
    "Menabung rutin": ["tabungan", "Ubah di Tabungan"],
    "Porsi cicilan": ["utang", "Perbarui daftar utang"],
    "Utang bunga tinggi": ["utang", "Perbarui daftar utang"],
    "Total utang": ["utang", "Perbarui daftar utang"],
    "Asuransi lain": ["proteksi", "Ubah di Proteksi"],
    "Rekening bank": ["uang", "Ubah di Uang & rekening"],
    "Tujuan yang jelas": ["tujuan", "Isi tujuan & nominal"],
    "Simpanan di tempat aman": ["uang", "Ubah tempat menyimpan"],
  };
  const scoreFix = (pt) => {
    const f = SCORE_FIX[pt.label]; if (!f) return null;
    return typeof f[0] === "string" ? { href: editUrl(f[0]), label: f[1] } : { ...f[0], label: f[1] };
  };

  // Rincian skor (dibuka dari Dashboard: skor dan empat pilar)
  function scorePage() {
    const x = ms[0].x;
    return `${crumbs("Rincian skor")}
      <div class="page-head">
        <p class="eyebrow">Skor kesehatan finansial</p>
        <h1 class="step-title">Rincian skor ${x.h.total}/100</h1>
        <p class="step-desc">Ketuk bagian yang belum penuh untuk memperbaikinya.</p>
      </div>
      <div class="stack">${vizPillars(x.h, { fix: scoreFix })}</div>`;
  }

  function laneCard(lane) {
    return `<section class="card viz-card lane-card" aria-labelledby="lane-h">
      <div class="card-head"><h2 id="lane-h">${IC.lane} Pelunasan utang</h2><p>Bertahap, di setiap langkah, sampai lunas.</p></div>
      ${lane.done ? `<p class="goal-gap done">${ST_ICON.good}<span>Semua utang lunas</span></p>` : `<p class="goal-gap">${IC.target}<span>Sisa ${rp(lane.left)}${lane.months != null ? ` · perkiraan lunas ${monthYear(lane.months)}` : ""}</span></p>`}
      ${goalBar({ kind: "paid", paid: lane.paid, left: lane.left, fmt: rp })}
      <ul class="checkpoints">${lane.checkpoints.map(k => `<li class="${k.met ? "met" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${k.label}${!k.met && k.left ? ` <small>· sisa ${rp(k.left)}</small>` : ""}</span></li>`).join("")}</ul>
      <div><a class="btn sm lane-btn" href="#milestone/utang">${IC.lane} Buka pelunasan utang</a></div>
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
    const onLane = m.x.lane.active && !m.x.lane.done ? "on-lane" : "";
    if (isLocked(m)) {
      return `<li class="${onLane}"><div class="mrow locked" aria-label="Step ${m.number}: ${esc(m.title)}. Terkunci, selesaikan step sebelumnya dulu.">
        <span class="lock-mid" aria-hidden="true">${IC.lock}</span>
        <b class="lk-title">${m.number}. ${esc(m.title)}</b>
        <small class="lk-goal">${esc(m.short)}</small>
      </div></li>`;
    }
    return `<li class="${onLane}"><a class="mrow ${stepCls(m.status)}" href="#milestone/${m.id}" aria-label="Step ${m.number}: ${esc(m.title)}. ${m.meta?.label || ""}, ${m.progress}%. ${esc(m.short)}.">
      <span class="mnum">${m.status === "selesai" ? `<span class="ck">${ICON.check}</span>` : m.number}</span>
      <span class="mrow-main">
        <span class="mrow-top"><b>${esc(m.title)}</b>${statusTag(m)}</span>
        <span class="mrow-goal"><b>${esc(m.short)}</b>${m.gap && m.status !== "selesai" ? `<span class="gap-pill">${esc(m.gap)}</span>` : ""}</span>
        ${meter(m, true)}
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a></li>`;
  }

  const meterColor = (m) => m.status === "selesai" ? "var(--st-good)" : stepCls(m.status) === "active" ? "var(--fg)" : "var(--viz-self)";
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
    const nodes = `<ol class="mtrack ${mini ? "mini" : ""}" aria-label="Semua tangga">${ms.map(m => isLocked(m) ? `<li class="next locked"><span title="Step ${m.number}: terkunci" aria-label="Step ${m.number}: ${esc(m.title)}, terkunci"><span class="node">${m.number}</span></span></li>` : `<li class="${stepCls(m.status)} ${m.id === currentId ? "current" : ""} ${m.id === "rapor" ? "rapor" : ""}">
        <a href="${href(m)}" ${m.id === currentId ? 'aria-current="step"' : ""} aria-label="${m.id === "rapor" ? "Rapor" : `Step ${m.number}: ${esc(m.title)}`}, ${m.meta?.label || ""}" data-tip="${m.id === "rapor" ? "Rapor & kesimpulan" : `${m.number}. ${esc(m.title)} · ${m.progress}%`}">
          <span class="node">${m.id === "rapor" ? IC.star : m.status === "selesai" ? ICON.check : m.number}</span>
        </a></li>`).join("")}</ol>`;
    if (!lane.active) return `<div class="mtrack-wrap">${nodes}</div>`;
    const left = (1.5 / n) * 100, width = (6 / n) * 100;   // dari tengah node 2 sampai tengah node 8
    return `<div class="mtrack-wrap has-lane">${nodes}
      <a class="lane-band ${lane.done ? "done" : ""} ${currentId === "utang" ? "current" : ""}" href="#milestone/utang" style="left:${left}%;width:${width}%" data-tip="Jalur utang ${lane.progress}% · sisa ${rp(lane.left)}" aria-label="Pelunasan utang, ${lane.progress}%">
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
      ${next ? (isLocked(next) ? `<span class="nx locked"><small>${IC.lock} Berikutnya · terkunci</small><b>${next.number}. ${esc(next.title)}</b></span>` : `<a class="nx" href="${href(next)}"><small>Berikutnya ›</small><b>${next.id === "rapor" ? "Rapor & kesimpulan" : `${next.number}. ${esc(next.title)}`}</b></a>`) : "<span></span>"}
    </nav>`;
  }

  function detail(id) {
    const m = ms.find(s => s.id === id);
    if (!m) return `<div class="page-head"><h1 class="step-title">Tangga tidak ditemukan</h1></div><a class="btn secondary" href="#milestone">Kembali ke semua tangga</a>`;
    const lane = m.x.lane;
    if (isLocked(m)) {
      const act = activeStep();
      return `${crumbs(`Step ${m.number} dari ${mainSteps().length - 1}`)}
        <section class="card locked-page">
          <span class="lock-mid static" aria-hidden="true">${IC.lock}</span>
          <h1 class="step-title">${esc(m.title)}</h1>
          <p class="step-desc">Step ini terbuka setelah step ${act ? act.number : m.number - 1} selesai.</p>
          ${act ? `<div><a class="btn sm" href="#milestone/${act.id}">Kerjakan step ${act.number}: ${esc(act.title)}</a></div>` : ""}
        </section>`;
    }
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
        <div class="goal-now ${stepCls(m.status)}"><span>${esc(m.cur.label)}</span><b>${esc(m.cur.value)}</b></div>
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
    emergency: { path: "resilience.savings", label: "Uang beku", type: "deposit" },
    growth: { path: "resilience.growth", label: "Uang tumbuh", type: "growth-deposit" },
  };
  const goalPath = (id) => `resilience.goalData.${id}.saved`;

  // Catatan terakhir untuk langkah ini + tombol urungkan (salah tekan bisa dibatalkan kapan saja)
  function lastEntryNote(stepIds) {
    const last = lastChange();
    const mine = [...S.ledger].reverse().find(e => !e.undone && stepIds.includes(e.step));
    if (!mine) return "";
    const canUndo = last && last.id === mine.id;
    return `<div class="last-entry"><span>Catatan terakhir: <b>${esc(mine.label)}</b> <small>· ${fmtShortDate(new Date(mine.at))}</small></span>
      ${canUndo ? `<button type="button" class="link-btn" data-undo="${mine.id}">${IC.undo} Urungkan</button>` : ""}</div>`;
  }

  // ---------- Kartu di langkah tangga: data dibaca dari Profil, kejadian dicatat lewat + Catat ----------
  const toProfil = (sec, text) => `<a class="btn sm secondary" href="${editUrl(sec)}">${text}</a>`;
  function updateCard(m) {
    const x = m.x, c = x.c;
    if (m.tool === "cashflow") {
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Angka yang dipakai</h2></div>
        <dl class="kv-list">
          <div><dt>Pendapatan</dt><dd class="num">${rp(c.income)}/bln</dd></div>
          <div><dt>Pengeluaran rutin</dt><dd class="num">${rp(c.expMid)}/bln</dd></div>
          <div><dt>Cicilan</dt><dd class="num">${rp(c.debtMonthly)}/bln</dd></div>
        </dl>
        <div>${toProfil("keuangan", "Ubah di Profil")}</div>
      </section>`;
    }
    if (m.tool === "buffer") {
      const now = frozenMoney();
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Uang beku: ${rp(now)}</h2><p>Satu saldo untuk bantalan Step 2 dan dana darurat Step 3.</p></div>
        ${m.checkpoints ? `<ul class="ckpts">${m.checkpoints.map(k => `<li class="${k.met ? "met" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${k.label}</span></li>`).join("")}</ul>` : ""}
        <div class="chips">
          <button type="button" class="btn sm" data-act="catat" data-kind="setor">${ICON.plus} Setor</button>
          ${now > 0 ? `<button type="button" class="btn sm secondary" data-act="catat" data-kind="ambil">Ambil</button>` : ""}
        </div>
        ${m.id === "bantalan" && x.highDebts.length ? `<p class="hint">Masih ada ${x.highDebts.length} utang bunga tinggi. Selama belum lunas, ${pct(MILESTONE.STEP2_SPLIT_DEBT)} sisa uang diarahkan ke utang.</p>` : ""}
        ${lastEntryNote([m.id, "tabungan"])}
      </section>`;
    }
    if (m.tool === "growth") {
      const ym = isoOf(new Date()).slice(0, 7);
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Uang tumbuh: ${rp(growthMoney())}</h2><p>Setoran bulan ini ${rp(Number((S.growth || {})[ym]) || 0)} dari target ${rp(m.target)}.</p></div>
        ${m.warn ? `<div class="note accent">${ICON.info}<span>${esc(m.warn)}</span></div>` : ""}
        <div class="chips">
          <button type="button" class="btn sm" data-act="catat" data-kind="setor-tumbuh">${ICON.plus} Setor uang tumbuh</button>
          ${growthMoney() > 0 ? `<button type="button" class="btn sm secondary" data-act="catat" data-kind="ambil-tumbuh">Ambil</button>` : ""}
        </div>
        <p class="hint">Laju hanya menjelaskan jenis tempat menyimpan. Laju tidak menyarankan produk investasi tertentu.</p>
        ${lastEntryNote(["investasi"])}
      </section>`;
    }
    if (m.tool === "goals") {
      const list = m.goals || [];
      if (!list.length) return card("Belum ada tujuan tumbuh", "", `<p class="hint">Pilih tujuan di Profil supaya step ini punya target.</p><div>${toProfil("tujuan", "Pilih tujuan")}</div>`);
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Tabungan tujuan</h2></div>
        ${list.map(id => {
          const saved = Number(get(goalPath(id))) || 0, amt = Number(get(`resilience.goalData.${id}.amount`)) || 0;
          return `<div class="goal-row">
            <div class="kv" style="margin:0"><span><b>${esc(goalLabel(id))}</b></span><span class="num">${rp(saved)}${amt ? ` / ${rp(amt)}` : ""}</span></div>
            ${amt ? `<div class="pt-bar"><i style="width:${Math.min(100, Math.round((saved / amt) * 100))}%"></i></div>` : `<p class="hint">Nominal belum diisi.</p>`}
            <div class="chips"><button type="button" class="btn sm" data-act="catat" data-kind="setor-tujuan" data-goal="${esc(id)}">${ICON.plus} Setor</button></div>
          </div>`;
        }).join("")}
        <div>${toProfil("tujuan", "Ubah tujuan & nominal")}</div>
      </section>`;
    }
    return "";
  }

  function debtRows(debts, step) {
    const rows = S.debts.map((d, i) => ({ d, i })).filter(({ d }) => debts.includes(d) || d.paidOff);
    const open = debtOrder(rows.filter(r => debtOpen(r.d)).map(r => r.d)).map(d => rows.find(r => r.d === d));
    const paid = rows.filter(r => !debtOpen(r.d));
    const guessed = open.some(r => !(Number(r.d.months) > 0));
    return `${open.length || paid.length ? "" : `<p class="hint">Tidak ada utang tercatat. <a href="${editUrl("utang")}">Tambah di Profil</a>.</p>`}
      ${open.map((r, k) => debtRow(r, k + 1, step)).join("")}${paid.map(r => debtRow(r, 0, step)).join("")}
      ${guessed ? `<p class="hint">* Lama cicilan belum diisi. Laju memperkirakan cicilan dari sisa utang ÷ 12 bulan.</p>` : ""}`;
  }
  function debtRow({ d, i }, prio) {
    const open = debtOpen(d), rate = debtRate(d), inst = debtInstallment(d);
    return `<div class="drow ${open ? "" : "paid"}">
      <div class="drow-head">${open ? `<span class="prio">${prio}</span>` : ""}<b>${esc(debtTypeLabel(d))}</b>${open && isHighCost(d) ? '<span class="tag warn">Bunga tinggi</span>' : ""}${!open ? statusPill("good", "Lunas") : ""}</div>
      ${open ? `<dl class="drow-facts">
          <div><dt>Sisa</dt><dd class="num">${rp(Number(d.remaining))}</dd></div>
          <div><dt>Bunga</dt><dd>${rate ? `${String(rate).replace(".", ",")}%/bln${Number(d.rate) > 0 ? "" : " (perkiraan)"}` : "-"}</dd></div>
          <div><dt>Cicilan</dt><dd class="num">${rp(inst)}${Number(d.months) > 0 ? "" : "*"}</dd></div>
        </dl>
        ${d.due ? `<p class="hint">Jatuh tempo berikutnya: <b>${fmtDate(d.due)}</b></p>` : ""}
        <div><button type="button" class="btn sm" data-act="catat" data-kind="bayar" data-i="${i}">${ICON.plus} Catat bayar</button></div>` : ""}
    </div>`;
  }

  // ---------- Rencana per langkah ----------
  function planCard(m) {
    const x = m.x, c = x.c;
    if (m.tool === "cashflow") {
      if (x.net >= 0) return card("Rencana", "", `<div class="note">${ST_ICON.good}<span>Anda sudah tidak minus. Sisa ${rp(x.net)} per bulan, pembagiannya ada di bawah.</span></div>`) + allocCard(x);
      const p = cashPlan(m);
      return `<section class="card viz-card" aria-labelledby="plan-h">
        <div class="card-head"><h2 id="plan-h">Rencana uang bulan ini</h2><p>Geser untuk mencoba.</p></div>
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
    if (m.tool === "buffer") {
      const now = frozenMoney(), target = m.target || 0, gap = target - now;
      if (!target) return "";
      if (gap <= 0) return card("Rencana", "", `<div class="note">${ST_ICON.good}<span>Target tercapai. Lanjut ke step berikutnya.</span></div>`);
      const r = perDayRange(c);
      const perDay = clamp(sim[m.id]?.perday ?? S.milestones.plans[m.id]?.perDay ?? defaultPerDay(x, m), r.min, r.max);
      return `<section class="card viz-card" aria-labelledby="plan-h">
        <div class="card-head"><h2 id="plan-h">Rencana setoran</h2><p>Maksimal ${rp(r.max)}/hari (rata-rata pendapatan harian).</p></div>
        <div class="field"><label for="sim-perday">Setor per hari narik: <output id="o-perday" class="num">${rp(perDay)}</output></label>
          <input type="range" id="sim-perday" style="--p:${pctOf(perDay, r.min, r.max)}%" data-sim="perday" min="${r.min}" max="${r.max}" step="${r.step}" value="${perDay}">
          <div class="range-ends"><span>${rpShort(r.min)}</span><span>${rpShort(r.max)}</span></div>
          <div class="chips quick">${r.presets.map(v => `<button type="button" class="chip" data-act="perday" data-v="${v}">${rpShort(v)}</button>`).join("")}</div></div>
        <div id="sim-result" aria-live="polite">${savingsResult(m, perDay)}</div>
        <div class="chips"><button type="button" class="btn sm" data-act="save-plan">Jadikan rencana setoran</button></div>
        ${S.milestones.plans[m.id] ? `<p class="hint">Rencana tersimpan: ${rp(S.milestones.plans[m.id].perDay)} per hari narik.</p>` : ""}
      </section>`;
    }
    if (m.tool === "growth") {
      const gapM = Math.max(0, m.target - (m.thisMonth || 0));
      const perDay = Math.round(gapM / (S.profile.daysPerWeek * WEEKS) / 500) * 500;
      return card("Rencana", "", gapM > 0
        ? `<p class="plan-big">Setor lagi <b>${rp(gapM)}</b> bulan ini</p><p class="hint" style="font-size:.88rem">= sekitar <b>${rp(perDay)}</b> setiap hari narik. Setoran yang Anda catat bulan ini ikut dihitung untuk hitungan beruntun.</p>`
        : `<div class="note">${ST_ICON.good}<span>Target bulan ini sudah tercapai. Pertahankan ${MILESTONE.STEP4_STREAK_MONTHS} bulan berturut-turut.</span></div>`);
    }
    if (m.tool === "goals") {
      const late = (m.goals || []).filter(id => {
        const d = (S.resilience.goalData || {})[id] || {};
        return d.deadline && Number(d.amount) > 0 && Number(d.saved || 0) < Number(d.amount) && parseIso(d.deadline) < new Date();
      });
      return card("Rencana", "", late.length
        ? `<div class="note accent">${ICON.info}<span>Tenggat ${late.map(goalLabel).join(", ")} sudah lewat. Tambah setoran, mundurkan tenggat, atau kecilkan nominalnya di Profil.</span></div>`
        : `<p class="hint">Setor kapan pun lewat tombol Setor. Kalau tenggat terasa berat, Anda bisa mundurkan tenggat atau kecilkan nominal di Profil.</p>`);
    }
    if (m.tool === "fondasi" && !c.verified) {
      return card("Langkah berikutnya", "", `<p style="font-size:.9rem">Hubungkan e-wallet supaya data Anda berstatus <b>terverifikasi</b>. Lembaga keuangan membaca status ini.</p><div><a class="btn sm" href="${editUrl("ewallet")}">Hubungkan e-wallet</a></div>`);
    }
    return "";
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
      <p class="verdict">${net >= 0 ? `${ST_ICON.good}<span>Dengan rencana ini: sisa <b>${rp(net)}</b>/bulan, keluar dari minus.</span>` : `${ST_ICON.critical}<span>Masih kurang <b>${rp(-net)}</b>/bulan. Geser lagi atau pakai rencana otomatis.</span>`}</p>
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
        ${m.deadline ? `<p class="verdict ${late ? "late" : "ontime"}">${late ? ST_ICON.serious : ST_ICON.good}<span>${late ? `Lewat dari target ${fmtShortDate(m.deadline)}. Butuh ±${rp(m.needPerMonth)}/bln supaya tepat waktu.` : `Tepat waktu. Target ${fmtShortDate(m.deadline)}.`}</span></p>` : ""}
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
    return `${crumbs("Pelunasan utang")}
      <section class="card viz-card">${track("utang")}</section>
      <div class="page-head">
        <p class="eyebrow">Alat Step 2 · utang bunga tinggi harus bersih</p>
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
          ${lane.done ? `<p class="goal-gap done">${ST_ICON.good}<span>Semua utang lunas</span></p>` : `<p class="goal-gap">${IC.target}<span>${lane.months != null ? `Perkiraan lunas ${monthYear(lane.months)} (${lane.months} bulan)` : "Belum turun, tambah pembayaran"}</span></p>`}
          ${goalBar({ kind: "paid", paid: lane.paid, left: lane.left, fmt: rp })}
          <div class="criteria"><p class="lbl">Titik pemeriksaan</p><ul>${lane.checkpoints.map(k => `<li class="${k.met ? "met" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${k.label}${!k.met ? ` <small>· sisa ${rp(k.left)}</small>` : ""}</span></li>`).join("")}</ul></div>
          <p class="hint">Progres <b>${lane.progress}%</b> = utang yang sudah dibayar ÷ jumlah tertinggi yang pernah tercatat (${rp(lane.base)}).</p>
        </section>` : card("Tidak ada utang tercatat", "", `<p class="hint">Jalur ini tidak aktif. Kalau ada utang, <a href="${editUrl("utang")}">tambahkan di Profil</a>.</p>`)}
        ${lane.active && !lane.done ? `<section class="card" aria-labelledby="gr-h">
          <div class="card-head"><h2 id="gr-h">Aturan selama jalur berjalan</h2></div>
          <ul class="checkpoints">
            <li class="${h.dsr <= 0.3 ? "met" : ""}"><span class="ci">${h.dsr <= 0.3 ? ST_ICON.good : ST_ICON.serious}</span><span>Cicilan ≤ 30% pendapatan <small>· sekarang ${pct(h.dsr)} (batas OJK untuk pinjol mulai 2026)</small></span></li>
            <li><span class="ci">${ICON.shield}</span><span>Jangan ambil pinjol/paylater baru. Pakai dana darurat untuk biaya mendadak.</span></li>
            <li><span class="ci">${ICON.calendar}</span><span>Bayar tepat waktu supaya tidak kena denda.</span></li>
          </ul>
        </section>` : ""}
        ${lane.active ? `<section class="card" aria-labelledby="upd-h">
          <div class="card-head"><h2 id="upd-h">Catat pembayaran</h2><p>Urutan: ${meth.label.toLowerCase()}.</p></div>
          ${debtRows(x.openDebts, "utang")}
          ${lastEntryNote(["utang"])}
          <p class="hint">Utang baru atau salah isi? <a href="${editUrl("utang")}">Ubah di Profil</a></p>
        </section>` : ""}
        ${lane.active && !lane.done ? `<section class="card viz-card" aria-labelledby="plan-h">
          <div class="card-head"><h2 id="plan-h">Rencana pelunasan</h2><p>Uang tambahan masuk ke utang nomor 1.</p></div>
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
      ? `${ST_ICON.critical}<span>Cicilan sekarang hanya menutup bunga, jadi utang tidak turun. Tambah bayar per bulan.</span>`
      : `${ST_ICON.good}<span>${base.months != null ? `Tanpa tambahan: lunas <b>${base.months} bulan</b> lagi (${monthYear(base.months)}).` : "Tanpa tambahan: tidak lunas dalam 10 tahun."} ${extra && plan.months != null ? `Dengan tambahan ${rp(extra)}/bln: <b>${plan.months} bulan</b> (${monthYear(plan.months)})${base.months != null ? `, <b>${base.months - plan.months} bulan lebih cepat</b>` : ""}.` : ""}</span>`;
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
      ? `<p class="hint" style="font-size:.86rem">Progres hari ini ${progress}%. Grafik muncul setelah ada catatan di hari lain, satu titik per hari.</p>`
      : lineChart([{ label: "Progres", color: "var(--fg)", data: log.map(p => p.p) }], { yMax: 100, yFmt: (v) => `${Math.round(v)}%`, xFmt: (i) => fmtShortDate(parseIso(log[i].d)) });
    return `<section class="card viz-card" aria-labelledby="hist-h"><div class="card-head"><h2 id="hist-h">Riwayat progres</h2></div>${body}</section>`;
  }

  // ---------- Rapor & kesimpulan ----------
  function conclusions(x) {
    const h = x.h, parts = h.pillars.flatMap(p => p.parts);
    const strong = parts.filter(p => p.max >= 4 && p.pts >= p.max * 0.8).sort((a, b) => b.max - a.max).slice(0, 4);
    const weak = parts.filter(p => p.pts < p.max).sort((a, b) => (b.max - b.pts) - (a.max - a.pts)).slice(0, 3);
    const act = activeStep();
    // Prioritas berupa kartu aksi: judul, satu baris keterangan, dan tombol ke tempat mengerjakannya.
    const prio = [];
    if (act) prio.push({ t: `Langkah ${act.number}: ${act.title}`, s: act.gap || act.short, href: `#milestone/${act.id}`, cta: "Buka" });
    if (x.alloc.items.length) prio.push({ t: `Bagi sisa ${rpShort(x.alloc.net)}/bln`, s: x.alloc.items.map(i => `${i.label} ${rpShort(i.amount)}`).join(" · "), href: "#dashboard", cta: "Lihat" });
    else if (x.alloc.phase === "minus" && act?.id !== "minus") prio.push({ t: `Tutup kurang ${rpShort(-x.alloc.net)}/bln`, s: "Kurangi pengeluaran atau tambah jam narik", href: "#milestone/minus", cta: "Rencana" });
    if (x.lane.active && !x.lane.done) prio.push({ t: "Cicil utang", s: `Sisa ${rpShort(x.lane.left)}${x.lane.months != null ? ` · lunas ${monthYear(x.lane.months)}` : ""} · jangan ambil utang baru`, act: "catat", kind: "bayar", cta: "Catat bayar" });
    const summary = {
      critical: "Satu biaya mendadak bisa memaksa berutang. Fokus ke arus kas dan bantalan dulu.",
      serious: "Mulai tertata, tapi masih ada celah besar sebelum aman.",
      warn: "Kuatkan bantalan dan konsisten menabung.",
      good: "Arus kas positif, ada bantalan, utang terkendali.",
    }[h.grade.id];
    return { summary, strong, weak, prio };
  }

  // Cincin skor: busur sepanjang skor, warna mengikuti kategori.
  function scoreRing(score, color) {
    const r = 52, c = 2 * Math.PI * r, len = (clamp(score, 0, 100) / 100) * c;
    return `<svg class="ring" viewBox="0 0 128 128" role="img" aria-label="Skor ${score} dari 100">
      <circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--viz-track)" stroke-width="12"/>
      <circle cx="64" cy="64" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${len} ${c}" transform="rotate(-90 64 64)"/>
      <text x="64" y="66" text-anchor="middle" class="ring-num">${score}</text>
      <text x="64" y="88" text-anchor="middle" class="ring-of">dari 100</text>
    </svg>`;
  }

  function rapor() {
    const x = ms[0].x, h = x.h, steps = mainSteps();
    const final = ms[ms.length - 1].final;
    const start = S.startSnap, now = snapshotMetrics();
    const days = start ? Math.max(0, Math.round((parseIso(now.d) - parseIso(start.d)) / 864e5)) : 0;
    const k = conclusions(x);
    const sl = S.scoreLog;
    const ledger = S.ledger.filter(e => !e.undone);
    const total = (types) => ledger.filter(e => types.includes(e.type)).reduce((s, e) => s + (e.amount || 0), 0);
    const doneN = steps.filter(m => m.status === "selesai").length;
    const delta = start ? h.total - start.score : 0;
    const cmp = [
      ["Skor", "score", (v) => String(v), 1],
      ["Sisa / bulan", "net", rpShort, 1],
      ["Dana darurat", "emergency", rpShort, 1],
      ["Tabungan tujuan", "goalSaved", rpShort, 1],
      ["Total utang", "totalDebt", rpShort, -1],
      ["Utang bunga tinggi", "highDebt", rpShort, -1],
      ["Porsi cicilan", "dsr", (v) => pct(v), -1],
      ["BPJS aktif", "bpjs", (v) => `${v}/2`, 1],
    ];
    const arrow = (d, dir) => !d ? `<span class="dl same">=</span>` : (d * dir > 0 ? `<span class="dl up">${d > 0 ? "▲" : "▼"}</span>` : `<span class="dl down">${d > 0 ? "▲" : "▼"}</span>`);
    const ai = buildAIContext(), aiJson = JSON.stringify(ai, null, 2);
    return `<div class="page-head">
        <p class="eyebrow">${final ? "Rapor akhir" : "Rapor sementara"}${start ? ` · ${days} hari sejak ${fmtShortDate(parseIso(start.d))}` : ""}</p>
        <h1 class="step-title">Rapor ${firstName()}</h1>
      </div>
      <div class="stack">
        <section class="card rap-hero" aria-label="Ringkasan skor">
          <div class="rap-top">
            ${scoreRing(h.total, h.grade.color)}
            <div class="rap-side">
              ${statusPill(h.grade.id, h.grade.label)}
              ${start ? `<p class="rap-delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}">${delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "= 0"} <small>sejak awal</small></p>` : ""}
              <p class="rap-sum">${esc(k.summary)}</p>
            </div>
          </div>
          <div class="rap-stats">
            <div><b class="num">${doneN}/${steps.length}</b><span>Tangga</span></div>
            <div><b class="num">${x.lane.active ? `${x.lane.progress}%` : "-"}</b><span>Utang lunas</span></div>
            <div><b class="num">${ledger.length}</b><span>Catatan</span></div>
          </div>
          ${sl.length >= 2 ? lineChart([{ label: "Skor", color: "var(--fg)", data: sl.map(p => p.s) }], { yMax: 100, yFmt: (v) => String(Math.round(v)), xFmt: (i) => fmtShortDate(parseIso(sl[i].d)) }) : ""}
        </section>

        ${k.prio.length ? `<section class="card" aria-labelledby="fk-h">
          <div class="card-head"><h2 id="fk-h">Fokus 30 hari</h2></div>
          <ol class="focus-list">${k.prio.map((p, i) => `<li class="focus-item">
            <span class="fi-num">${i + 1}</span>
            <span class="fi-txt"><b>${esc(p.t)}</b><small>${esc(p.s)}</small></span>
            ${p.href ? `<a class="btn sm" href="${p.href}">${p.cta}</a>` : `<button type="button" class="btn sm" data-act="${p.act}" data-kind="${p.kind}">${p.cta}</button>`}
          </li>`).join("")}</ol>
        </section>` : ""}

        <section class="card" aria-labelledby="kd-h">
          <div class="card-head"><h2 id="kd-h">Kondisi Anda</h2></div>
          ${k.strong.length ? `<p class="rap-lbl good">${ST_ICON.good} Sudah baik</p>
          <div class="sw-chips">${k.strong.map(p => `<span class="sw-chip">${esc(p.label)}</span>`).join("")}</div>` : ""}
          ${k.weak.length ? `<p class="rap-lbl bad">${ST_ICON.serious} Perlu dibenahi</p>
          <ul class="weak-list">${k.weak.map(p => `<li>
            <div class="wk-top"><b>${esc(p.label)}</b><span class="num">${p.pts}/${p.max} poin</span></div>
            <div class="pt-bar"><i style="width:${(p.pts / p.max) * 100}%"></i></div>
            <small>${esc(p.value)}</small>
          </li>`).join("")}</ul>` : ""}
        </section>

        ${start ? `<section class="card" aria-labelledby="cmp-h">
          <div class="card-head"><h2 id="cmp-h">Awal vs sekarang</h2></div>
          <table class="cmp-table">
            <thead><tr><th scope="col"></th><th scope="col" class="n">Awal</th><th scope="col" class="n">Sekarang</th><th scope="col"><span class="sr-only">Arah</span></th></tr></thead>
            <tbody>${cmp.map(([label, key, f, dir]) => {
              const a = start[key] ?? 0, b = now[key] ?? 0, d = b - a;
              return `<tr class="${d ? "" : "same"}"><th scope="row">${label}</th><td class="n">${f(a)}</td><td class="n"><b>${f(b)}</b></td><td class="n">${arrow(d, dir)}</td></tr>`;
            }).join("")}</tbody>
          </table>
        </section>` : ""}

        <section class="card" aria-labelledby="jr-h">
          <div class="card-head"><h2 id="jr-h">Perjalanan tangga</h2><p>${doneN} dari ${steps.length} selesai</p></div>
          <ol class="journey">${steps.map(m => `<li class="${stepCls(m.status)}"><span class="jn">${m.status === "selesai" ? ICON.check : m.number}</span><span><b>${esc(m.title)}</b><small>${m.status === "selesai" ? `Selesai${S.milestones.doneAt[m.id] ? ` ${fmtShortDate(parseIso(S.milestones.doneAt[m.id]))}` : ""}` : `${m.progress}%`}</small></span></li>`).join("")}
            ${x.lane.active ? `<li class="lane ${x.lane.done ? "done" : ""}"><span class="jn">${IC.lane}</span><span><b>Jalur pelunasan utang</b><small>${x.lane.done ? "Semua utang lunas" : `${x.lane.progress}% · sisa ${rpShort(x.lane.left)}`}</small></span></li>` : ""}</ol>
        </section>

        <section class="card" aria-labelledby="ac-h">
          <div class="card-head"><h2 id="ac-h">Aktivitas</h2></div>
          <div class="rap-stats">
            <div><b class="num">${rpShort(total(["deposit", "goal-deposit"]))}</b><span>Disetor</span></div>
            <div><b class="num">${rpShort(total(["withdraw"]))}</b><span>Diambil</span></div>
            <div><b class="num">${rpShort(total(["pay", "paidoff"]))}</b><span>Bayar utang</span></div>
          </div>
          ${ledger.length ? `<ul class="tx-list">${ledger.slice(-5).reverse().map(e => `<li class="tx"><span class="d">${esc(e.label)}</span><span class="a num">${e.amount ? rp(e.amount) : ""}</span><span class="m">${fmtShortDate(new Date(e.at))}</span></li>`).join("")}</ul>` : `<p class="hint">Belum ada catatan. Tekan <b>+ Catat</b> saat ada setoran atau bayar utang.</p>`}
        </section>

        <details class="card more ai-card"><summary>Data untuk analisis AI <small>(${(aiJson.length / 1024).toFixed(1).replace(".", ",")} KB, tanpa nama, HP, password)</small></summary><pre class="ai-json">${esc(aiJson)}</pre></details>
      </div>`;
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
    const finished = ms.find(m => m.id !== "rapor" && m.status === "selesai" && prevStatus[m.id] !== "selesai");
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
      case "logout": setLoggedIn(false); location.href = "masuk.html"; return;
      case "catat": return openCatat(el.dataset.kind, el.dataset.i != null ? Number(el.dataset.i) : null, el.dataset.goal || "");
      case "save-monthly": {
        const v = moneyVal("upd-monthly"), now = Number(S.resilience.monthlySave) || 0;
        return commit({ title: "Perbarui setoran bulanan?", rows: [["Disisihkan / bln", rp(now), rp(v)]], ok: "Ya, simpan", type: "monthly", label: `Setoran bulanan ${rp(v)}`, step: "rutin", paths: ["resilience.monthlySave"], apply: () => { S.resilience.monthlySave = v; }, msg: "Setoran bulanan diperbarui" });
      }
      case "method": S.milestones.debtMethod = el.dataset.m; save(); render(true); return;
      case "auto-plan": sim.minus = autoCashPlan(m); render(true); return snack("Rencana otomatis terisi. Sesuaikan bila perlu");
      case "perday": { const v = Number(el.dataset.v); sim[m.id] = { perday: v }; render(true); return; }
      case "save-plan": {
        if (m.tool === "cashflow") { const p = cashPlan(m); S.milestones.plans.minus = { cut: p.cut, hours: p.hours }; }
        if (m.tool === "buffer") S.milestones.plans[m.id] = { perDay: Number($("#sim-perday").value) };
        save(); render(true); return snack("Rencana disimpan");
      }
      case "save-lane": S.milestones.plans.lane = { extra: Number($("#sim-extra").value) }; save(); render(true); return snack("Rencana pelunasan disimpan");
    }
  }

  // ---------- Profil: data yang jarang berubah ----------
  const svg = (d) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const SECTION_ICON = {
    identitas: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 14h3"/>'),
    kerja: svg('<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-3-7h4l2 3M12 10 10 6H7"/>'),
    keluarga: svg('<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M14 20c0-2.4 1.3-4 3-4s3 1.6 3 4"/>'),
    tabungan: svg('<path d="M5 11a7 6 0 0 1 13-2h2v4l-2 1v3h-3v-2H9v2H6v-3.5A6 6 0 0 1 5 11Z"/><path d="M12 6V4"/><circle cx="15" cy="10" r=".8"/>'),
    uang: svg('<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
    ewallet: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18h4M9 9.5l2 2 4-4"/>'),
    proteksi: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v6M9 11h6"/>'),
    keuangan: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    utang: svg('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/>'),
    tujuan: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
  };
  // Status data untuk bank: tier, pendapatan yang diakui bank vs isian (panduan), dan alasan + cara naik tier.
  function trustCard() {
    const t = dataTrust(), c = calc();
    return `<section class="card trust-card t${t.tier}" aria-labelledby="tr-h">
      <div class="card-head"><h2 id="tr-h">Status data untuk bank</h2></div>
      <div class="tr-top"><span class="tr-badge num">Tier ${t.tier}</span><span class="tr-txt"><b>${t.label}</b><small>${t.apply}</small></span></div>
      ${t.live ? `<dl class="kv-list">
          <div><dt>Pendapatan yang diakui bank</dt><dd class="num">${rp(t.bankIncome)}/bln</dd></div>
          <div><dt>Isian Anda (untuk panduan)</dt><dd class="num">${rp(c.income)}/bln</dd></div>
        </dl>
        ${t.bankIncome < c.income ? `<p class="hint">Bank hanya menghitung pencairan aplikasi di dompet yang terhubung. Tunai dan transfer dari orang tetap dipakai untuk panduan, tapi tidak untuk pinjaman.</p>` : ""}` : ""}
      ${t.reasons.length ? `<p class="sc-lbl">${t.tier === 1 ? "Yang perlu diperhatikan" : `Kenapa Tier ${t.tier}`}</p>
        <ul class="tr-list">${t.reasons.map(r => `<li><span>${esc(r.t)}</span>${r.act ? `<a class="link-btn inline" href="${r.act.href}">${r.act.label}</a>` : ""}</li>`).join("")}</ul>` : ""}
    </section>`;
  }
  function profilePage() {
    const p = S.profile, r = S.resilience, c = calc(), ch = channelStatus(c.agg);
    const openDebts = S.debts.filter(debtOpen), goal = (r.goals || []).map(goalLabel)[0];
    const sum = {
      identitas: `${S.account.fullName || "-"} · ${S.account.city ? cityLabel() : "-"}`,
      kerja: `${p.platforms.map(platformName).join(", ") || "-"} · ${p.vehicle === "mobil" ? "Mobil" : "Motor"} ${(OWNERSHIP.find(o => o.id === p.ownership)?.label || "").toLowerCase()} · ${p.hoursPerDay} jam × ${p.daysPerWeek} hari`,
      keluarga: `${p.dependents} tanggungan${p.sideJobs.length ? ` · ${p.sideJobs.join(", ")}` : ""}`,
      tabungan: `Uang beku ${rpShort(Number(r.savings) || 0)} · Uang tumbuh ${rpShort(Number(r.growth) || 0)}`,
      uang: `${(p.channels || []).map(channelLabel).join(", ") || "-"} · rekening bank ${hasBankEvidence() ? "terbukti" : "belum ada bukti"}`,
      ewallet: (() => { const w = ch.connected.length + ch.notConnected.length;
        return !ch.connected.length ? "Belum terhubung" : ch.notConnected.length ? `${ch.connected.length}/${w} terhubung · Belum: ${ch.notConnected.map(channelLabel).join(", ")}` : `Terhubung: ${ch.connected.map(channelLabel).join(", ")}`; })(),
      proteksi: p.hasInsurance ? "Asuransi" : "Belum ada",
      keuangan: `Pendapatan ${rpShort(c.income)} · pengeluaran ${rpShort(c.expMid)} per bulan`,
      utang: openDebts.length ? `${openDebts.length} utang · sisa ${rpShort(openDebts.reduce((t, d) => t + Number(d.remaining), 0))}` : "Tidak ada utang",
      tujuan: goal ? `${goal}${Number(r.goalAmount) ? ` · ${rpShort(Number(r.goalAmount))}` : ""} · ${r.horizon} bulan` : "-",
    };
    const start = S.startSnap;
    return `<div class="page-head">
        <p class="eyebrow">Profil</p>
        <h1 class="step-title">Data ${firstName()}</h1>
        <p class="step-desc">Hidup berubah? Ubah di sini. Uang berpindah? Tekan <b>+ Catat</b>.</p>
      </div>
      <div class="stack">
        ${trustCard()}
        <section class="card prof-list" aria-label="Bagian profil">${PROFILE_SECTIONS.map(sec => `<a class="prow" href="${editUrl(sec.id)}"><span class="prow-ic ic-${sec.id}" aria-hidden="true">${SECTION_ICON[sec.id]}</span><span class="prow-txt"><b>${sec.title}</b><small>${esc(sum[sec.id])}</small></span><span class="chev" aria-hidden="true">›</span></a>`).join("")}</section>
        <section class="card" aria-labelledby="awal-h">
          <div class="card-head"><h2 id="awal-h">Jawaban awal</h2><p>Titik awal rapor, tidak bisa diubah.</p></div>
          <dl class="kv-list">
            <div><dt>Mencatat pendapatan</dt><dd>${RECORDS_LABEL[p.recordsIncome] || "-"}</dd></div>
            <div><dt>Kebiasaan menabung</dt><dd>${HABITS.find(h => h.id === r.habit)?.label || "-"}</dd></div>
            <div><dt>Butuh Rp1 juta mendadak</dt><dd>${SHOCK_LABEL[r.shock] || "-"}</dd></div>
            <div><dt>Tabungan awal</dt><dd class="num">${start ? rp(start.emergency) : "-"}</dd></div>
          </dl>
        </section>
        ${S.account.pass ? `<div><button type="button" class="btn secondary sm" data-act="logout">Keluar dari akun</button></div>` : ""}
      </div>`;
  }

  // ---------- + Catat: kejadian yang memindahkan uang ----------
  const catatDlg = $("#catatDlg");
  const cat = { kind: null, i: null, reason: "", direct: false };
  const CATAT_TITLE = { setor: "Setor uang beku", "setor-tujuan": "Setor tabungan tujuan", ambil: "Ambil uang beku",
    "setor-tumbuh": "Setor uang tumbuh", "ambil-tumbuh": "Ambil uang tumbuh", bayar: "Bayar utang", sakit: "Mode Sakit" };
  const openDebtRows = () => S.debts.map((d, i) => ({ d, i })).filter(o => debtOpen(o.d));
  function catatKinds() {
    const r = S.resilience, open = openDebtRows(), goals = r.goals || [];
    const terkumpul = goals.reduce((t, id) => t + (Number((r.goalData || {})[id]?.saved) || 0), 0);
    return [
      { k: "setor", s: `Uang beku sekarang ${rp(Number(r.savings) || 0)}` },
      ...(goals.length ? [{ k: "setor-tujuan", s: `${goals.length} tujuan · terkumpul ${rpShort(terkumpul)}` }] : []),
      { k: "setor-tumbuh", s: `Uang tumbuh sekarang ${rp(Number(r.growth) || 0)}` },
      ...(Number(r.savings) > 0 ? [{ k: "ambil", s: "Wajib pilih alasannya" }] : []),
      ...(Number(r.growth) > 0 ? [{ k: "ambil-tumbuh", s: "Menghentikan hitungan beruntun Step 4" }] : []),
      ...(open.length ? [{ k: "bayar", s: `${open.length} utang · sisa ${rpShort(open.reduce((t, o) => t + Number(o.d.remaining), 0))}` }] : []),
      { k: "sakit", s: sickNow() ? "Sedang aktif, ketuk untuk mengakhiri" : "Tandai periode tidak bisa narik" },
    ];
  }
  function renderCatat() {
    let body;
    if (!cat.kind) {
      body = `<h2 id="catatTitle">Catat</h2>
        <div class="catat-list">${catatKinds().map(o => `<button type="button" class="catat-opt" data-ck="${o.k}"><b>${CATAT_TITLE[o.k]}</b><small>${esc(o.s)}</small></button>`).join("")}</div>
        <p class="hint">Hidup berubah? <a href="#profil" data-cclose>Ubah di Profil</a></p>
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-cclose>Tutup</button></div>`;
    } else if (cat.kind === "sakit") {
      const on = sickNow();
      body = `<h2 id="catatTitle">Mode Sakit</h2>
        <p style="font-size:.9rem">${on ? "Mode Sakit sedang aktif. Akhiri kalau Anda sudah bisa narik lagi." : "Tandai periode Anda tidak bisa narik. Selama periode ini, sisa uang yang minus tidak membuat Step 1 mundur."}</p>
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-cback>Kembali</button><button type="button" class="btn sm" data-csick>${on ? "Akhiri Mode Sakit" : "Mulai Mode Sakit"}</button></div>`;
    } else {
      const k = cat.kind, open = openDebtRows(), goals = S.resilience.goals || [];
      if (k === "bayar" && !open.some(o => o.i === cat.i)) cat.i = open[0]?.i ?? null;
      if (k === "setor-tujuan" && !goals.includes(cat.goal)) cat.goal = goals[0] || "";
      const d = cat.i != null ? S.debts[cat.i] : null;
      body = `<h2 id="catatTitle">${CATAT_TITLE[k]}</h2>
        ${k === "bayar" ? `<div class="field"><span class="lbl">Utang</span><div class="chips">${open.map(o => `<button type="button" class="chip" aria-pressed="${o.i === cat.i}" data-ci="${o.i}">${esc(debtTypeLabel(o.d))} · ${rpShort(Number(o.d.remaining))}</button>`).join("")}</div></div>` : ""}
        ${k === "setor-tujuan" ? `<div class="field"><span class="lbl">Tujuan</span><div class="chips">${goals.map(id => `<button type="button" class="chip" aria-pressed="${id === cat.goal}" data-cg="${esc(id)}">${esc(goalLabel(id))}</button>`).join("")}</div></div>` : ""}
        ${k === "ambil" ? `<div class="field"><span class="lbl">Alasan pengambilan</span><span class="hint">Darurat yang sah tidak menurunkan skor dan tidak membuat step mundur.</span>
          <div class="chips">${WITHDRAW_REASONS.map(([v, l]) => `<button type="button" class="chip ${v === "lainnya" ? "peach" : ""}" aria-pressed="${cat.reason === v}" data-cr="${v}">${l}</button>`).join("")}</div></div>` : ""}
        <div class="field"><label for="catat-amt">Jumlah</label>${moneyIn("catat-amt", cat.amt || 0)}
          <div class="chips quick">${k === "bayar" && d ? `<button type="button" class="chip" data-ca="${Number(d.remaining)}">Lunas ${rpShort(Number(d.remaining))}</button>` : [10000, 20000, 50000, 100000].map(a2 => `<button type="button" class="chip" data-ca="${a2}">${rpShort(a2)}</button>`).join("")}</div></div>
        ${k === "ambil" && !cat.reason ? `<p class="hint">Pilih alasan dulu sebelum lanjut.</p>` : ""}
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-cback>${cat.direct ? "Batal" : "Kembali"}</button><button type="button" class="btn sm" data-cgo ${k === "ambil" && !cat.reason ? "disabled" : ""}>Lanjut</button></div>`;
    }
    catatDlg.innerHTML = `<div class="sheet-body">${body}</div>`;
  }
  function openCatat(kind = null, i = null, goal = "") {
    Object.assign(cat, { kind, i, goal, reason: "", amt: 0, direct: !!kind });
    renderCatat();
    if (!catatDlg.open) catatDlg.showModal();
    (catatDlg.querySelector("#catat-amt") || catatDlg.querySelector("[data-ck]"))?.focus();
  }
  const ymNow = () => isoOf(new Date()).slice(0, 7);
  function submitCatat(amt) {
    const r = S.resilience;
    if (cat.kind === "setor") {
      const now = Number(r.savings) || 0;
      return commit({ title: `Catat setoran ${rp(amt)}?`, rows: [["Uang beku", rp(now), rp(now + amt)]], note: "Pastikan uangnya sudah Anda pisahkan.",
        type: "deposit", label: `Setoran ${rp(amt)} ke uang beku`, amount: amt, step: "tabungan", paths: ["resilience.savings"],
        apply: () => { r.savings = now + amt; }, msg: `Setoran ${rp(amt)} dicatat` });
    }
    if (cat.kind === "setor-tujuan" && cat.goal) {
      const path = `resilience.goalData.${cat.goal}.saved`, now = Number(get(path)) || 0;
      return commit({ title: `Catat setoran ${rp(amt)}?`, rows: [[goalLabel(cat.goal), rp(now), rp(now + amt)]], note: "Tabungan tujuan terpisah dari uang beku.",
        type: "goal-deposit", label: `Setoran ${rp(amt)} ke ${goalLabel(cat.goal)}`, amount: amt, step: "tumbuh", paths: [path],
        apply: () => set(path, now + amt), msg: `Setoran ${rp(amt)} dicatat` });
    }
    if (cat.kind === "setor-tumbuh") {
      const now = Number(r.growth) || 0, ym = ymNow(), bulanIni = Number((S.growth || {})[ym]) || 0;
      return commit({ title: `Catat setoran ${rp(amt)}?`, rows: [["Uang tumbuh", rp(now), rp(now + amt)], ["Setoran bulan ini", rp(bulanIni), rp(bulanIni + amt)]],
        note: "Setoran bulan ini dipakai untuk hitungan beruntun Step 4.",
        type: "growth-deposit", label: `Setoran ${rp(amt)} ke uang tumbuh`, amount: amt, step: "investasi", paths: ["resilience.growth", `growth.${ym}`],
        apply: () => { r.growth = now + amt; (S.growth ||= {})[ym] = bulanIni + amt; }, msg: `Setoran ${rp(amt)} dicatat` });
    }
    if (cat.kind === "ambil-tumbuh") {
      const now = Number(r.growth) || 0, v = Math.min(amt, now);
      return commit({ title: `Ambil ${rp(v)} dari uang tumbuh?`, rows: [["Uang tumbuh", rp(now), rp(now - v)]], note: "Mengambil uang tumbuh untuk belanja membuat Step 4 dibuka lagi.",
        type: "withdraw", label: `Ambil uang tumbuh ${rp(v)}`, amount: v, step: "investasi", paths: ["resilience.growth", "milestones.growthSpent"],
        apply: () => { r.growth = now - v; S.milestones.growthSpent = isoOf(new Date()); }, msg: `Pengambilan ${rp(v)} dicatat` });
    }
    if (cat.kind === "ambil") {
      const now = Number(r.savings) || 0, v = Math.min(amt, now), sah = isEmergencyReason(cat.reason);
      const label = (WITHDRAW_REASONS.find(w => w[0] === cat.reason) || ["", ""])[1];
      return commit({ title: `Ambil ${rp(v)} dari uang beku?`, rows: [["Uang beku", rp(now), rp(now - v)]],
        note: amt > now ? `Uang beku hanya ${rp(now)}.` : sah ? "Darurat yang sah. Step tidak mundur, dan skor tidak turun karena ini." : "Bukan darurat. Kalau uang beku turun lama, step bisa dibuka lagi.",
        type: "withdraw", label: `Ambil ${rp(v)} untuk ${label.toLowerCase()}`, amount: v, step: "tabungan", paths: ["resilience.savings", "withdrawals"],
        apply: () => { r.savings = now - v; (S.withdrawals ||= []).push({ at: new Date().toISOString(), amount: v, reason: cat.reason }); if (sah) S.milestones.refillSince = isoOf(new Date()); },
        msg: `Pengambilan ${rp(v)} dicatat` });
    }
    if (cat.kind === "bayar" && cat.i != null) {
      const i = cat.i, d = S.debts[i], rem = Number(d.remaining), v = Math.min(amt, rem), left = rem - v;
      return commit({ title: left ? `Catat bayar ${rp(v)}?` : `${debtTypeLabel(d)} lunas?`, rows: [[`Sisa ${debtTypeLabel(d)}`, rp(rem), rp(left)]], note: left ? "" : "Utang ini akan tercatat lunas.",
        type: left ? "pay" : "paidoff", label: left ? `Bayar ${debtTypeLabel(d)} ${rp(v)}` : `${debtTypeLabel(d)} lunas`, amount: v, step: "utang", paths: [`debts.${i}`],
        apply: () => { d.remaining = left; if (!left) d.paidOff = true; }, msg: left ? `Pembayaran ${rp(v)} dicatat` : `${debtTypeLabel(d)} lunas` });
    }
  }
  catatDlg.addEventListener("click", (e) => {
    if (e.target === catatDlg || e.target.closest("[data-cclose]")) return catatDlg.close();
    const t = e.target.closest("button"); if (!t) return;
    const d = t.dataset;
    if (d.ck) { cat.kind = d.ck; renderCatat(); catatDlg.querySelector("#catat-amt")?.focus(); return; }
    if (d.ci) { cat.i = Number(d.ci); cat.amt = moneyVal("catat-amt"); renderCatat(); return; }
    if (d.cr) { cat.reason = d.cr; cat.amt = moneyVal("catat-amt"); renderCatat(); return; }
    if (d.cg) { cat.goal = d.cg; cat.amt = moneyVal("catat-amt"); renderCatat(); return; }
    if ("csick" in d) {
      const list = (S.sick ||= []), open = list.find(z => !z.to);
      if (open) open.to = isoOf(new Date()); else list.push({ from: isoOf(new Date()), to: "" });
      save(); catatDlg.close(); render(true); snack(open ? "Mode Sakit diakhiri" : "Mode Sakit dimulai");
      return;
    }
    if (d.ca) { $("#catat-amt").value = fmt(Number(d.ca)); return; }
    if ("cback" in d) { if (cat.direct) return catatDlg.close(); cat.kind = null; renderCatat(); return; }
    if ("cgo" in d) {
      const amt = moneyVal("catat-amt");
      if (!amt) return $("#catat-amt").focus();
      catatDlg.close(); submitCatat(amt);
    }
  });
  catatDlg.addEventListener("input", (e) => {
    if (e.target.matches("[data-money]")) { const n = Number(e.target.value.replace(/\D/g, "")) || 0; e.target.value = n ? fmt(n) : ""; }
  });
  catatDlg.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("#catat-amt")) { e.preventDefault(); catatDlg.querySelector("[data-cgo]")?.click(); } });
  $("#catatBtn").addEventListener("click", () => openCatat());
  $("#demoBtn").addEventListener("click", loadDemo);

  // ---------- Events ----------
  window.addEventListener("hashchange", () => {
    for (const key of Object.keys(sim)) delete sim[key];
    render();
    window.scrollTo({ top: 0 });
    view.focus({ preventScroll: true });
  });

  // Tombol kembali (‹) di header: riwayat halaman di dalam aplikasi. Redup kalau belum ada halaman sebelumnya.
  const NAV_KEY = "laju-nav";
  const navStack = (() => { try { return JSON.parse(sessionStorage.getItem(NAV_KEY)) || []; } catch (e) { return []; } })();
  let lastHash = location.hash || "#dashboard", goingBack = false;
  const backBtn = $("#navBack");
  const navSync = () => {
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify(navStack.slice(-50))); } catch (e) { /* abaikan */ }
    backBtn?.setAttribute("aria-disabled", String(!navStack.length));
  };
  window.addEventListener("hashchange", () => {
    const now = location.hash || "#dashboard";
    if (!goingBack && now !== lastHash) navStack.push(lastHash);
    goingBack = false; lastHash = now; navSync();
  });
  backBtn?.addEventListener("click", () => {
    if (!navStack.length) return;
    goingBack = true; location.hash = navStack.pop();
  });
  navSync();
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
    if (m.tool === "buffer") { sim[m.id] = { perday: v }; res.innerHTML = savingsResult(m, v); }
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

  async function loadDemo() {
    if (S.finished && !(await confirmChange({ title: "Ganti semua data dengan data contoh?", rows: [["Data Anda", "sekarang", "data contoh"]], ok: "Ya, ganti" }))) return;
    const wallets = S.wallets;
    S = nextDemoState();
    Object.assign(S, { wallets, finished: true, finishedAt: new Date().toISOString(), step: LAST_ONBOARDING_STEP, maxStep: LAST_ONBOARDING_STEP });
    S.consent.useWallet = wallets.some(w => w.summary);   // supaya Profil › E-wallet tidak tertahan di langkah E-wallet
    S.consent.useManual = true;
    for (const key of Object.keys(sim)) delete sim[key];
    S.startSnap = snapshotMetrics();
    S.account.pass = await hashPass(S.account.password || "contoh1234");   // data contoh juga bisa keluar lalu masuk lagi
    setLoggedIn(true);
    save(); render();
    snack("Data contoh dipakai");
  }

  // ---------- Boot ----------
  async function boot() {
    if (needsLogin()) { location.replace("masuk.html"); return; }   // akun ada, tapi sedang keluar
    render();
    try { const f = sessionStorage.getItem("laju-flash"); if (f) { sessionStorage.removeItem("laju-flash"); snack(f); } } catch (e) { /* abaikan */ }
    try {   // segarkan ringkasan e-wallet dari server bila tersedia
      ui.config = await api("/api/config");
      const { wallets } = await api("/api/wallets");
      if (wallets.length || S.wallets.length) {
        const m = mergeServerWallets(wallets);
        S.wallets = m.wallets; save(); render(true);
        if (m.lost.some(w => !w._told)) { snack(`Izin ${m.lost.map(w => walletMeta(w.walletId)?.label).join(", ")} berakhir di server. Laju tetap memakai data transaksi terakhir. Hubungkan lagi lewat Profil.`); S.wallets.forEach(w => { if (w.stale) w._told = true; }); save(); }
      }
    } catch (e) { /* server mati: pakai data terakhir yang tersimpan */ }
  }
  boot();
})();
