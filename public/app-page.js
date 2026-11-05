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

  const STATUS_TEXT = { done: "Selesai", active: "Sedang berjalan", next: "Berikutnya", open: "Perlu dilengkapi" };
  const statusTag = (m) => m.status === "done" ? statusPill("good", "Selesai")
    : m.status === "active" ? `<span class="tag lime">${ICON.badge} Tahap aktif</span>`
    : m.status === "open" ? `<span class="tag warn">Perlu dilengkapi</span>`
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
    else if (p === "milestone" && id === "utang") { view.innerHTML = laneDetail(); document.title = "Jalur cicilan jangka panjang · Laju"; }
    else if (p === "milestone" && id === "darurat-jalur") { view.innerHTML = emergencyPath(); document.title = "Jalur darurat · Laju"; }
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
        ${simMode() ? `<button type="button" class="btn secondary" data-act="scenario">Skenario demo: e-wallet + e statement</button>` : ""}
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
        <p class="step-desc">Ringkasan keuangan Anda, ${fmtDay(new Date())}. ${c.verified ? `Data dari isian Anda dan ${aggregate().count} akun terverifikasi.` : "Data dari isian sendiri. Hubungkan e-wallet lewat Profil supaya terverifikasi."}</p>
      </div>
      <div class="stack dash">
        ${remindCard()}
        ${journeyCard(doneN)}
        ${budgetCard(x)}
        ${pillarsMini(h)}
        ${planSummary(x)}
        ${cashCard(c)}
        ${goalSummary()}
      </div>`;
  }

  // ---------- Cek bulanan (Beranda) ----------
  // Satu cek tiap 30 hari: perbarui data, jawab dua pertanyaan, simpan potret. Mode simulasi punya tombol
  // "Majukan 30 hari" supaya pergerakan beberapa bulan bisa didemokan dalam beberapa menit.
  const chk = { busy: false, synced: false, msg: "", err: "", debt: null, shock: null, result: null };
  const simMode = () => ui.config?.mode === "simulasi";
  const hasData = () => S.wallets.some(w => w.summary);
  const CHECK_ROWS = [
    ["Skor", "score", (v) => String(v), 1],
    ["Sisa / bulan", "net", rpShort, 1],
    ["Dana darurat", "emergency", rpShort, 1],
    ["Total utang", "totalDebt", rpShort, -1],
  ];
  function checkCard() {
    const st = monthlyChecks();
    const simBtn = simMode()
      ? `<div class="chk-sim"><div class="chips"><button type="button" class="btn sm" data-act="sim-plan">Jalankan rencana + majukan 30 hari</button><button type="button" class="btn secondary sm" data-act="sim-advance">Majukan saja</button></div>
          <p class="hint">Jalankan rencana: Laju mencatat 30 hari ke depan seolah driver mengikuti rencananya, yaitu setoran harian ke bantalan, dana darurat, atau tujuan, bayar tagihan tepat waktu, dan setor uang tumbuh setelah dana darurat penuh. Semua tercatat di Aktivitas.</p>
          <p class="hint"><span>Mode simulasi: transaksi bulan berikutnya dibuat generator, dengan anggapan driver mengikuti rencana sehingga belanja turun sekitar 8% per bulan.</span>${window.LajuSim?.days ? ` <span>Jam sudah dimajukan ${window.LajuSim.days} hari.</span>` : ""}</p></div>` : "";
    if (chk.result) return checkResultCard(chk.result);
    if (!st.pending) {
      const left = st.nextAt ? Math.max(0, Math.ceil((st.nextAt - Date.now()) / 864e5)) : null;
      const body = st.done >= CHECK_TOTAL
        ? `<p>${CHECK_TOTAL} cek bulanan selesai. Rekam jejak 6 bulan Anda sudah lengkap.</p><div><a class="btn sm" href="#rapor">Lihat Rapor 6 bulan</a></div>${simBtn}`
        : `<p><span>Cek ke ${st.n} dari ${CHECK_TOTAL}${st.nextAt ? `: ${fmtShortDate(st.nextAt)}, ${left} hari lagi` : ""}.</span> <span>Tiap cek sekitar 3 menit: perbarui data, jawab dua pertanyaan, simpan.</span></p>${simBtn}`;
      return `<section class="card chk-card" aria-labelledby="chk-h"><div class="card-head"><h2 id="chk-h">Cek bulanan</h2><p>${st.done} dari ${CHECK_TOTAL} selesai</p></div>${body}</section>`;
    }
    const yn = (key, label) => `<div class="field"><span class="lbl">${label}</span><div class="chips">${[["ya", "Ya"], ["tidak", "Tidak"]].map(([v, t]) => `<button type="button" class="chip" aria-pressed="${chk[key] === v}" data-act="chk-answer" data-k="${key}" data-v="${v}">${t}</button>`).join("")}</div></div>`;
    const needSync = hasData() && !chk.synced;
    const ready = !needSync && chk.debt && chk.shock;
    return `<section class="card chk-card due" aria-labelledby="chk-h">
      <div class="card-head"><h2 id="chk-h">Cek bulan ke ${st.n} dari ${CHECK_TOTAL}</h2><p>${st.late ? "Terlambat, tetap dihitung" : "Sudah waktunya"}</p></div>
      <ol class="chk-steps">
        <li class="${needSync ? "" : "done"}"><b>Perbarui data</b>
          ${hasData() ? (chk.synced ? `<small>${esc(chk.msg)}</small>` : `<small>Sinkron ulang e-wallet${S.wallets.some(w => w.source === "statement") ? " dan e statement" : ""} supaya angka bulan ini terbaca.</small>
            <div><button type="button" class="btn sm" data-act="chk-sync" ${chk.busy ? "disabled" : ""}>${chk.busy ? "Memperbarui…" : "Perbarui data sekarang"}</button></div>`)
          : `<small>Belum ada e-wallet atau e statement. Perbarui isian pendapatan dan pengeluaran lewat <a href="#profil">Profil</a> kalau berubah.</small>`}
          ${chk.err ? `<p class="err" role="alert">${esc(chk.err)}</p>` : ""}</li>
        <li class="${chk.debt && chk.shock ? "done" : ""}"><b>Jawab dua pertanyaan</b>
          ${yn("debt", "Ada utang atau pinjaman baru bulan ini?")}
          ${chk.debt === "ya" ? `<p class="hint">Tambahkan di <a href="onboarding.html?edit=utang">Daftar utang</a> supaya ikut dihitung.</p>` : ""}
          ${yn("shock", "Ada kejadian mendadak yang memakai dana darurat atau pinjaman?")}</li>
        <li><b>Simpan cek</b><div><button type="button" class="btn sm" data-act="chk-save" ${ready ? "" : "disabled"}>Simpan cek bulan ke ${st.n}</button></div></li>
      </ol>
    </section>`;
  }
  function checkResultCard(e) {
    const list = monthlyChecks().list, prev = list.length >= 2 ? list[list.length - 2].snap : S.startSnap;
    const arrow = (d, dir) => !d ? `<span class="dl same">=</span>` : `<span class="dl ${d * dir > 0 ? "up" : "down"}">${d > 0 ? "▲" : "▼"}</span>`;
    return `<section class="card chk-card" aria-labelledby="chk-h">
      <div class="card-head"><h2 id="chk-h">Cek bulan ke ${e.n} tersimpan</h2><p>Dibanding ${list.length >= 2 ? `cek bulan ke ${e.n - 1}` : "awal onboarding"}</p></div>
      ${prev ? `<table class="cmp-table"><tbody>${CHECK_ROWS.map(([l, k, f, dir]) => { const a = prev[k] ?? 0, b = e.snap[k] ?? 0; return `<tr><th scope="row">${l}</th><td class="n">${f(a)}</td><td class="n"><b>${f(b)}</b></td><td class="n">${arrow(b - a, dir)}</td></tr>`; }).join("")}</tbody></table>` : ""}
      <p class="hint"><span>${e.steps.activeTitle ? `Tahap ${e.steps.activeNumber} sekarang: ${esc(e.steps.activeTitle)}, ${e.steps.progress}%.` : "Semua tahap selesai."}</span> <span>${e.steps.done} dari ${e.steps.total} tahap selesai.</span></p>
      <div class="chips"><a class="btn sm" href="#rapor">Lihat rapor bulanan</a><button type="button" class="btn secondary sm" data-act="chk-close">Tutup</button></div>
    </section>`;
  }
  async function checkSync() {
    chk.busy = true; chk.err = ""; render(true);
    let n = 0; const fail = [];
    for (const w of [...S.wallets]) {
      if (!w.summary) continue;
      try {
        let view;
        if (w.source === "statement") {
          if (!simMode()) { fail.push(`${w.accountName} (unggah e statement bulan ini lewat Profil)`); continue; }
          view = await api("/api/statements/sample", { method: "POST", body: { name: w.accountName } });
        } else {
          if (w.stale) { fail.push(`${channelLabel(w.walletId)} (izin berakhir, hubungkan lagi lewat Profil)`); continue; }
          view = await api(`/api/wallets/${w.walletId}/sync`, { method: "POST", body: {} });
        }
        const { others, ...v } = view;
        const i = S.wallets.findIndex(x => x.walletId === v.walletId);
        if (i >= 0) S.wallets[i] = { ...v, stale: false };
        for (const o of others || []) { const j = S.wallets.findIndex(x => x.walletId === o.walletId); if (j >= 0 && o.summary) S.wallets[j] = { ...o, stale: false }; }
        n += v.summary?.txCount || 0;
      } catch (err) { fail.push(`${w.accountName || channelLabel(w.walletId)} (${err.message})`); }
    }
    // angka bulan ini masuk ke isian, sama seperti saat onboarding: tangga bergerak karena datanya, bukan aturannya
    if (n) autofillFromVerified();
    chk.busy = false; chk.synced = n > 0 || !hasData();
    chk.msg = n ? `Data diperbarui · ${n} transaksi 30 hari terakhir` : "";
    chk.err = fail.length ? `Belum bisa diperbarui: ${fail.join(", ")}.` : "";
    save(); render(true);
  }

  // ---------- Skenario demo (mode simulasi) ----------
  // Driver ojol yang memakai GoPay dan OVO (terhubung) dan rekening BRI (e statement), mulai dari minus dengan
  // utang jangka pendek. Dengan "Jalankan rencana + majukan 30 hari" semua tahap bisa dilalui dalam beberapa bulan.
  async function startScenario() {
    if (S.finished && !(await confirmChange({ title: "Mulai skenario demo?", rows: [["Data di perangkat ini", "sekarang", "skenario demo"]], ok: "Ya, mulai" }))) return;
    snack("Menyiapkan skenario…");
    try { await buildScenario({ finish: true }); } catch (e) { return snack(`Skenario gagal disiapkan: ${e.message}`); }
    Object.assign(S, { step: LAST_ONBOARDING_STEP, maxStep: LAST_ONBOARDING_STEP });
    setLoggedIn(true);
    save(); location.hash = "#dashboard"; render();
    snack("Skenario demo siap: GoPay, OVO, dan e statement BRI");
  }

  async function startScenarioDirect() {   // dari tombol Data contoh, konfirmasi sudah ditanya
    snack("Menyiapkan skenario e-wallet + e statement…");
    try { await buildScenario({ finish: true }); } catch (e) { return snack(`Skenario gagal disiapkan: ${e.message}`); }
    Object.assign(S, { step: LAST_ONBOARDING_STEP, maxStep: LAST_ONBOARDING_STEP });
    setLoggedIn(true); save(); location.hash = "#dashboard"; render();
    snack("Data contoh: Rudi, GoPay + OVO + e statement BRI");
  }

  // Simulasi 30 hari ke depan kalau driver mengikuti rencana. Dipanggil sebelum jam dimajukan, jadi tagihan yang
  // jatuh tempo dalam 30 hari tercatat dibayar tepat waktu. Mengembalikan jumlah catatan.
  function runPlanMonth() {
    const x = ladderContext(); let n = 0;
    const log = (type, label, amount, step, paths, apply) => { recordChange({ type, label: `Simulasi: ${label}`, amount, step, paths, apply }); n++; };
    // 1. setoran harian x 30 hari, dibagi sesuai rencana bulan ini
    for (const it of x.alloc.items) {
      if (!it.amount) continue;
      if (it.key === "cushion" || it.key === "emergency") log("deposit", `setoran ${rp(it.amount)} ke ${it.key === "cushion" ? "bantalan" : "dana darurat"}`, it.amount, "tabungan", ["resilience.savings"], () => { S.resilience.savings = (Number(S.resilience.savings) || 0) + it.amount; });
      if (it.key === "goal" && primaryGoal()) { const path = `resilience.goalData.${primaryGoal()}.saved`; log("goal-deposit", `setoran ${rp(it.amount)} ke tujuan`, it.amount, "tujuan", [path], () => set(path, (Number(get(path)) || 0) + it.amount)); }
    }
    // 2. bagian utang: dibayarkan ke utang jangka pendek sesuai urutan pelunasan
    let pool = allocAmount(x, "debt");
    const pay = (d, v, step) => {
      const i = S.debts.indexOf(d), rem = Number(d.remaining), amt = Math.min(v, rem), left = rem - amt;
      const bill = !!d.due && daysUntil(d.due) <= 30 && (amt >= dueAmount(d) * 0.99 || !left);
      log(left ? "pay" : "paidoff", left ? `bayar ${debtTypeLabel(d)} ${rp(amt)}` : `${debtTypeLabel(d)} lunas`, amt, step, [`debts.${i}`, "payments"], () => {
        if (bill) (S.payments ||= []).push({ type: debtTypeLabel(d), due: d.due, paidAt: isoOf(new Date()), amount: amt, onTime: true });
        d.remaining = left; if (!left) d.paidOff = true; else if (bill) { rollDue(d); if (Number(d.months) > 1) d.months = Number(d.months) - 1; }
      });
      return amt;
    };
    for (const r of x.payoff.rows) { if (pool <= 0) break; const d = S.debts[r.i]; if (!d || !debtOpen(d)) continue; pool -= pay(d, Math.min(pool, Number(d.remaining)), "pendek"); }
    // tagihan jangka pendek yang jatuh tempo dan belum tertutup bagian utang tetap dibayar sebesar cicilannya
    for (const d of x.shortDebts) if (debtOpen(d) && d.due && daysUntil(d.due) <= 30) pay(d, dueAmount(d), "pendek");
    // 3. cicilan jangka panjang dibayar sesuai jadwal
    for (const d of x.longDebts) if (debtOpen(d) && (!d.due || daysUntil(d.due) <= 30)) pay(d, dueAmount(d), "utang");
    // 4. setelah dana darurat 30 hari penuh: setor uang tumbuh 10% pendapatan (tahap investasi)
    if (x.emergency >= FULL_DAYS * x.pokok) {
      const target = Math.round(MILESTONE.STEP4_INVEST_RATIO * x.c.income / 1000) * 1000, ym = isoOf(new Date(Date.now() + 15 * 864e5)).slice(0, 7);
      if (target > 0) log("growth-deposit", `setoran ${rp(target)} ke uang tumbuh`, target, "investasi", ["resilience.growth", `growth.${ym}`], () => { S.resilience.growth = (Number(S.resilience.growth) || 0) + target; (S.growth ||= {})[ym] = (Number((S.growth || {})[ym]) || 0) + target; });
    }
    return n;
  }

  // ---------- Pergerakan per bulan ----------
  function movementCard() {
    const rows = monthlyMovement();
    const head = `<div class="card-head"><h2 id="mv-h">Pergerakan per bulan</h2><p>Dari transaksi akun terhubung, per 30 hari</p></div>`;
    if (!rows) return `<section class="card" aria-labelledby="mv-h">${head}<p class="hint">Muncul setelah semua akun terhubung punya riwayat minimal 2 bulan penuh.</p></section>`;
    const chg = (v) => { if (v == null) return "-"; const r = Math.round(v * 100); return `<span class="dl ${r > 0 ? "up" : r < 0 ? "down" : "same"}">${r > 0 ? "▲" : r < 0 ? "▼" : "="}</span> ${r > 0 ? "+" : ""}${r}%`; };
    const hasOut = rows.every(r => r.out != null);
    const series = [{ label: "Pendapatan aplikasi", color: "var(--viz-in)", data: rows.map(r => r.income) }, ...(hasOut ? [{ label: "Uang keluar", color: "var(--viz-out)", data: rows.map(r => r.out) }] : [])];
    const last = rows[rows.length - 1];
    return `<section class="card" aria-labelledby="mv-h">${head}
      ${last.incomeChange != null ? `<p class="mv-sum">Pendapatan bulan terakhir ${rp(last.income)}, ${last.incomeChange >= 0 ? "naik" : "turun"} ${Math.abs(Math.round(last.incomeChange * 100))}% dari bulan sebelumnya.${last.net != null ? ` Sisa uang ${rp(last.net)}.` : ""}</p>` : ""}
      ${lineChart(series, { yFmt: rpShort, xFmt: (i) => rows[i].label, title: "Pendapatan dan uang keluar per bulan" })}
      <div class="tbl-wrap"><table class="cmp-table mr-table">
        <thead><tr><th scope="col">Bulan</th><th scope="col" class="n">Pendapatan</th><th scope="col" class="n">Perubahan</th>${hasOut ? `<th scope="col" class="n">Uang keluar</th><th scope="col" class="n">Sisa</th>` : ""}</tr></thead>
        <tbody>${rows.map(r => `<tr><th scope="row">${r.label}</th><td class="n">${rpShort(r.income)}</td><td class="n">${chg(r.incomeChange)}</td>${hasOut ? `<td class="n">${rpShort(r.out)}</td><td class="n">${rpShort(r.net)}</td>` : ""}</tr>`).join("")}</tbody>
      </table></div>
      <p class="hint">Uang keluar = semua uang keluar dari akun terhubung, termasuk tarik saldo atau transfer ke rekening yang belum terhubung. Sisa = semua uang masuk dikurangi uang keluar, jadi bisa beda dengan sisa per bulan di rapor yang memakai isian Anda.</p>
    </section>`;
  }

  // Satu cerita di Beranda: perjalanan 6 bulan, langkah sekarang beserta alasannya dari data, lalu cek bulan ini.
  function journeyCard(doneN) {
    const j = journey(ms), act = j.act, steps = mainSteps(), lane = ms[0].x.lane;
    const nxt = act ? steps.find(m => m.index > act.index && m.status === "next") : null;
    return `<section class="card focus-card jy-card" aria-labelledby="jy-h">
      <div class="card-head"><h2 id="jy-h">Perjalanan 6 bulan Anda</h2><p>Bulan ${j.month} dari ${CHECK_TARGET} · ${doneN} dari ${steps.length} tahap selesai · skor ${j.score}</p></div>
      <span class="fc-meter jy-meter" aria-hidden="true">${Array.from({ length: CHECK_TARGET }, (_, i) => `<i class="${i < j.month ? "on" : ""}"></i>`).join("")}</span>
      ${act ? `<a class="fc-now" href="#milestone/${act.id}">
        <span class="fc-tag">Tahap sekarang</span>
        <span class="fc-row"><span class="fc-num">${act.number}</span><b>${esc(act.title)}</b></span>
        <span class="fc-why">${esc(stepReason(act))}</span>
        ${act.gap ? `<span class="fc-gap">${IC.target}<span>Bulan ini: ${esc(act.gap)}</span></span>` : ""}
        <span class="fc-meter"><span class="fc-track"><i style="width:${Math.max(act.progress, 2)}%"></i></span><b class="num">${act.progress}%</b></span>
        <span class="fc-cta">Kerjakan ›</span>
      </a>` : `<div><a class="btn sm" href="#rapor">Semua tahap selesai. Lihat rapor akhir</a></div>`}
      ${(() => { const f = steps.find(m => m.id === "fondasi"); if (!f || f.status !== "open") return "";
        const todo = f.criteria.filter(k => !k.met), t = dataTrust();
        return `<a class="fc-fix" href="#milestone/fondasi">${ICON.alert}<span><b>Tahap 1 belum lengkap${t.partial ? ", status data Tier 2" : ""}</b><small>${esc(todo.map(k => k.value ? `${k.label}: ${k.value}` : k.label).join(" · "))}</small></span><span class="chev" aria-hidden="true">›</span></a>`; })()}
      ${lane.active && !lane.done ? laneMini(lane) : ""}
      ${nxt ? `<div class="fc-next"><span class="fc-lock">${IC.lock}</span><span><small>Berikutnya · terbuka setelah tahap ${act.number} selesai</small><b>${nxt.number}. ${esc(nxt.title)}</b></span></div>` : ""}
      ${checkCard()}
    </section>`;
  }


  // 3. Rencana uang: budget harian, setoran harian dan ke mana perginya. Semua per hari.
  function planSummary(x) {
    const rows = [], act = activeStep(), a = x.alloc;
    rows.push(["Budget belanja harian", [`${rp(a.items.length ? x.setor.spendBudget : x.budget)} per hari${a.items.length ? ` (budget ${rpShort(x.budget)} − setoran ${rpShort(x.setor.value)})` : ""}`], "minus"]);
    if (a.items.length) rows.push([`Setoran ${rp(x.setor.value)} per hari`, a.items.map(i => `${i.label} ${rp(i.perDay)}/hari`), a.phase === "pendek" ? "pendek" : a.phase === "tujuan" ? "tujuan" : "darurat"]);
    if (x.lane.active && !x.lane.done) rows.push(["Cicilan jangka panjang", [`${rp(x.lane.monthly)} per bulan, bayar tepat waktu`], "utang"]);
    return `<section class="card" aria-labelledby="pl-h">
      <div class="card-head"><h2 id="pl-h">Rencana uang</h2></div>
      <ul class="plan-list">${rows.map(([l, lines, id]) => `<li><a href="#milestone/${id}/rencana"><b>${l}</b><ul>${lines.map(t => `<li>${t}</li>`).join("")}</ul><span class="chev" aria-hidden="true">›</span></a></li>`).join("")}</ul>
      ${a.phase === "minus" && act ? `<p class="hint">${esc(a.why)}</p>` : ""}
    </section>`;
  }

  // Pengingat bayar: 3 hari sebelum jatuh tempo (dan yang sudah lewat). "Sudah bayar" mencatat dan memajukan jatuh tempo.
  function remindCard() {
    const list = dueReminders();
    if (!list.length) return "";
    return `<section class="card remind-card" aria-labelledby="rm-h">
      <div class="card-head"><h2 id="rm-h">${ICON.calendar} Tagihan dekat</h2></div>
      <ul class="rm-list">${list.map(o => `<li class="${o.days < 0 ? "late" : ""}">
        <span class="rm-txt"><b>${esc(debtTypeLabel(o.d))} ${rp(o.amt)}</b><small>${o.days < 0 ? `Lewat ${-o.days} hari dari jatuh tempo ${fmtShortDate(parseIso(o.d.due))}` : o.days === 0 ? `Jatuh tempo hari ini` : `Jatuh tempo ${countdown(o.days)}`}</small></span>
        <span class="chips"><button type="button" class="btn sm" data-act="paid" data-i="${o.i}">Sudah bayar</button><a class="btn sm secondary" href="#milestone/darurat-jalur">Belum bisa</a></span>
      </li>`).join("")}</ul>
      ${S.consent.useWallet ? `<p class="hint">Pinjol yang tidak terdaftar tidak bisa dikenali dari transaksi, jadi tetap ditanyakan ke Anda.</p>` : ""}
    </section>`;
  }

  // Budget hari ini: sudah keluar berapa dan 7 hari terakhir. Mode isian sendiri: satu angka "keluar hari ini".
  function budgetCard(x) {
    const c = x.c, act = activeStep(), strict = act?.id === "minus" || x.net < 0;
    const fixed = r1k(fixedPerDay(c)), b = (x.alloc.items.length ? x.setor.spendBudget : x.budget) - fixed;
    const today = spentOn(isoOf(new Date()), c), log = spendLog(c, 7);
    const dot = (v) => v == null ? "none" : v <= b ? "ok" : v <= b * 1.15 ? "near" : "over";
    const dots = `<ol class="bd-week" aria-label="7 hari terakhir">${log.map(d => `<li class="${dot(d.spent)}" data-tip="${esc(d.d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }))}: ${d.spent == null ? "belum dicatat, dianggap sesuai budget" : rp(d.spent)}" tabindex="0"><i></i><small>${d.d.toLocaleDateString(document.documentElement.lang === "en" ? "en-US" : "id-ID", { weekday: "short" })}</small></li>`).join("")}</ol>`;
    const mc = monthlyChecks();
    return `<section class="card budget-card" aria-labelledby="bd-h">
      <div class="card-head"><h2 id="bd-h">Budget hari ini</h2><p>${strict ? "Dicek tiap hari sampai satu bulan penuh di bawah budget." : "Berjalan di latar. Laju memberi tahu kalau 3 hari berturut lewat budget."}</p></div>
      <div class="bd-top"><b class="num">${rp(b)}</b><span>${today != null ? `sudah keluar <b class="num">${rp(today)}</b> · ${today <= b ? `sisa ${rp(b - today)}` : `lewat ${rp(today - b)}`}` : c.auto ? "belum ada transaksi hari ini" : "belum dicatat"}</span></div>
      ${dots}
      ${fixed ? `<p class="hint">Di luar tagihan bulanan (sewa, listrik, sekolah) ${rp(fixed)}/hari, yang dibayar sekali sebulan.</p>` : ""}
      ${!c.auto ? `<div class="adder-row">${moneyIn("bd-today", today || 0)}<button type="button" class="btn sm" data-act="daily-save">Simpan keluar hari ini</button></div>
        <p class="hint">${strict ? "Isi total uang keluar hari ini. Tidak diisi = dianggap sesuai budget, ditandai perkiraan." : "Cukup seminggu sekali: isi total minggu ini di hari terakhir."}</p>` : ""}
      ${ms.find(m => m.id === "minus")?.relapse ? `<div class="note danger">${ICON.alert}<span>Bulan ini belanja lewat budget ${rp(c.expMid - (c.income - x.lane.monthly))}. Tahap yang sudah selesai tidak dibatalkan. Kembali cek harian sampai satu bulan positif.</span></div>` : ""}
      ${mc.nextAt ? `<p class="hint">Cek bulanan ${countdown(Math.max(0, Math.ceil((mc.nextAt - Date.now()) / 864e5)))}.</p>` : ""}
    </section>`;
  }

  // 2. Empat pilar kesehatan: poin dan kategorinya saja (tanpa skor total), dalam bentuk cincin.
  //    Tangga memakai batang horizontal, jadi Dashboard sengaja memakai bentuk lain.
  function pillarsMini(h) {
    const ring = (p, col) => { const r = 22, c = 2 * Math.PI * r, len = (Math.max(0, Math.min(p.pts / p.max, 1))) * c;
      return `<svg class="pr-ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--secondary)" stroke-width="7"/><circle cx="28" cy="28" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${len} ${c}" transform="rotate(-90 28 28)"/></svg>`; };
    return `<section class="card" aria-labelledby="pil-h">
      <div class="card-head"><h2 id="pil-h">Kesehatan keuangan</h2><p>Arus kas 30, tabungan 30, utang 30, rencana 10 poin.</p></div>
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
    const r = S.resilience, g = GOALS.find(k => k.id === primaryGoal()), m = ms.find(s => s.id === "tujuan");
    if (!g || !m) return card("Tujuan keuangan", "", `<p class="hint">Belum ada tujuan utama.</p><div>${toProfil("tujuan", "Pilih tujuan di Profil")}</div>`);
    const others = (r.goals || []).filter(id => id !== primaryGoal()).map(id => GOALS.find(k => k.id === id)?.label).filter(Boolean);
    const act = activeStep(), lane = m.x.lane, todo = [];
    if (m.status === "done") todo.push("Tujuan tercapai. Pertahankan.");
    else {
      if (m.goalKind === "pot" && !m.target) todo.push(`Tentukan nominal tujuan di Profil.`);
      else if (m.goalKind === "pot") todo.push(`Sisihkan ±${rp(m.needPerMonth)} per bulan supaya tercapai ${m.deadline.toLocaleDateString("id-ID", { month: "short", year: "numeric" })}.`);
      else if (m.goalKind === "debtall") todo.push(lane.months != null ? `Lunasi sisa ${rp(lane.left)}. Perkiraan lunas ${monthYear(lane.months)}.` : `Lunasi sisa ${rp(lane.left)}. Tambah pembayaran supaya utang turun.`);
      else if (m.gap) todo.push(`${m.gap}.`);
      if (m.status === "next" && act) todo.push(`Tahap tujuan ada di nomor ${m.number}. Selesaikan dulu tahap ${act.number}: ${act.title}.`);
    }
    return `<section class="card" aria-labelledby="gs-h">
      <div class="card-head"><h2 id="gs-h">Tujuan keuangan</h2>${others.length ? `<p>Juga: ${esc(others.join(", "))}</p>` : ""}</div>
      <p class="gs-title">${IC.flag}<b>${esc(g.label)}</b><small>${primaryGoalAmount() ? `${rp(primaryGoalAmount())}` : "Nominal belum diisi"}${primaryGoalDeadline() ? ` · ${fmtDate(primaryGoalDeadline())}` : ""}</small></p>
      <span class="fc-meter"><span class="fc-track muted"><i style="width:${Math.max(m.progress, 2)}%"></i></span><b class="num">${m.progress}%</b></span>
      <p class="sc-lbl">Yang perlu dilakukan</p>
      <ul class="gs-todo">${todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
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
        <div class="chips"><a class="btn sm" href="#milestone/${m.id}">Buka tahap ini</a><a class="btn sm secondary" href="#milestone">Lihat semua tangga</a></div>`
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
      <span class="lane-txt"><b>Sambil jalan: cicilan jangka panjang ${lane.progress}%</b><small>Sisa ${rp(lane.left)} · ${rp(lane.monthly)}/bln${lane.months != null ? ` · lunas ${monthYear(lane.months)}` : ""}</small></span>
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
  const isLocked = (m) => m.status === "next" && m.id !== "rapor";

  function overview() {
    const act = activeStep(), x = ms[0].x;
    const steps = mainSteps(), doneN = steps.filter(m => m.status === "done").length;
    const p = Math.round((doneN / steps.length) * 100), lane = x.lane.active && !x.lane.done;
    return `<div class="page-head">
        <p class="eyebrow">Tangga milestone</p>
        <h1 class="step-title">${act ? `Tahap ${act.number} dari ${steps.length}: ${esc(act.title)}` : "Semua tangga selesai"}</h1>
        <p class="step-desc">Satu tahap fokus dalam satu waktu. Tahap yang syaratnya sudah terpenuhi langsung selesai. ${(() => { const mc = monthlyChecks(); return `Bulan ${Math.min(mc.done, CHECK_TARGET)} dari ${CHECK_TARGET}${mc.pending ? ". Cek bulan ini sudah bisa dilakukan di Beranda." : mc.nextAt ? `. Cek bulanan berikutnya ${fmtShortDate(mc.nextAt)} menggerakkan tangga.` : "."}`; })()}</p>
        <div class="ov-prog"><span class="fc-track"><i style="width:${Math.max(p, 2)}%"></i></span><b class="num">${doneN}/${steps.length}</b></div>
      </div>
      <ol class="mlist ${lane ? "has-lane" : ""}">
        ${lane ? `<li class="lane-legend"><a href="#milestone/utang"><span class="lane-ic">${IC.lane}</span><span><b>Garis ungu = cicilan jangka panjang</b><small>Berjalan terus di samping tahap · ${x.lane.progress}% lunas</small></span><span class="chev" aria-hidden="true">›</span></a></li>` : ""}
        ${ms.map(row).join("")}
      </ol>
      ${x.lane.active ? laneCard(x.lane) : ""}
      <a class="card score-link" href="#milestone/skor"><span><b>Rincian skor kesehatan</b><small>Poin tiap pilar dan cara menaikkannya</small></span><span class="chev" aria-hidden="true">›</span></a>`;
  }

  // Rincian skor (dibuka dari Dashboard: skor dan empat pilar)
  function scorePage() {
    const x = ms[0].x;
    return `${crumbs("Rincian skor")}
      <div class="page-head">
        <p class="eyebrow">Skor kesehatan finansial</p>
        <h1 class="step-title">Rincian skor ${x.h.total}/100</h1>
        <p class="step-desc">Ketuk "Rincian poin" di tiap pilar untuk melihat komponennya.</p>
      </div>
      <div class="stack">${vizPillars(x.h)}</div>`;
  }

  function laneCard(lane) {
    return `<section class="card viz-card lane-card" aria-labelledby="lane-h">
      <div class="card-head"><h2 id="lane-h">${IC.lane} Cicilan jangka panjang</h2><p>Cicilan kendaraan, bank, koperasi. Bayar tepat waktu, jangan tambah cicilan baru.</p></div>
      ${lane.done ? `<p class="goal-gap done">${ST_ICON.good}<span>Semua utang lunas</span></p>` : `<p class="goal-gap">${IC.target}<span>Sisa ${rp(lane.left)}${lane.months != null ? ` · perkiraan lunas ${monthYear(lane.months)}` : ""}</span></p>`}
      ${goalBar({ kind: "paid", paid: lane.paid, left: lane.left, fmt: rp })}
      <ul class="checkpoints">${lane.checkpoints.map(k => `<li class="${k.met ? "met" : ""}"><span class="ci">${k.met ? ST_ICON.good : IC.circle}</span><span>${k.label}${!k.met && k.left ? ` <small>· sisa ${rp(k.left)}</small>` : ""}</span></li>`).join("")}</ul>
      <div><a class="btn sm lane-btn" href="#milestone/utang">${IC.lane} Buka jalur cicilan</a></div>
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
      return `<li class="${onLane}"><div class="mrow locked" aria-label="Tahap ${m.number}: ${esc(m.title)}. Terkunci, selesaikan tahap sebelumnya dulu.">
        <span class="lock-mid" aria-hidden="true">${IC.lock}</span>
        <b class="lk-title">${m.number}. ${esc(m.title)}</b>
        <small class="lk-goal">${esc(m.short)}</small>
      </div></li>`;
    }
    return `<li class="${onLane}"><a class="mrow ${m.status}" href="#milestone/${m.id}" aria-label="Tahap ${m.number}: ${esc(m.title)}. ${STATUS_TEXT[m.status]}, ${m.progress}%. ${esc(m.short)}.">
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
    const nodes = `<ol class="mtrack ${mini ? "mini" : ""}" aria-label="Semua tangga">${ms.map(m => isLocked(m) ? `<li class="next locked"><span title="Tahap ${m.number}: terkunci" aria-label="Tahap ${m.number}: ${esc(m.title)}, terkunci"><span class="node">${m.number}</span></span></li>` : `<li class="${m.status} ${m.id === currentId ? "current" : ""} ${m.id === "rapor" ? "rapor" : ""}">
        <a href="${href(m)}" ${m.id === currentId ? 'aria-current="step"' : ""} aria-label="${m.id === "rapor" ? "Rapor" : `Tahap ${m.number}: ${esc(m.title)}`}, ${STATUS_TEXT[m.status]}" data-tip="${m.id === "rapor" ? "Rapor & kesimpulan" : `${m.number}. ${esc(m.title)} · ${m.progress}%`}">
          <span class="node">${m.id === "rapor" ? IC.star : m.status === "done" ? ICON.check : m.number}</span>
        </a></li>`).join("")}</ol>`;
    if (!lane.active) return `<div class="mtrack-wrap">${nodes}</div>`;
    const left = (1.5 / n) * 100, width = ((n - 2) / n) * 100;   // dari tengah node 2 sampai tengah node terakhir sebelum rapor
    return `<div class="mtrack-wrap has-lane">${nodes}
      <a class="lane-band ${lane.done ? "done" : ""} ${currentId === "utang" ? "current" : ""}" href="#milestone/utang" style="left:${left}%;width:${width}%" data-tip="Cicilan jangka panjang ${lane.progress}% · sisa ${rp(lane.left)}" aria-label="Jalur cicilan jangka panjang, ${lane.progress}%">
        <i style="width:${Math.max(lane.progress, 2)}%"></i><span>Cicilan ${lane.progress}%</span>
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
      return `${crumbs(`Tahap ${m.number} dari ${mainSteps().length}`)}
        <section class="card locked-page">
          <span class="lock-mid static" aria-hidden="true">${IC.lock}</span>
          <h1 class="step-title">${esc(m.title)}</h1>
          <p class="step-desc">Tahap ini terbuka setelah tahap ${act ? act.number : m.number - 1} selesai.</p>
          ${act ? `<div><a class="btn sm" href="#milestone/${act.id}">Kerjakan tahap ${act.number}: ${esc(act.title)}</a></div>` : ""}
        </section>`;
    }
    return `${crumbs(`Tahap ${m.number} dari ${mainSteps().length}`)}
      <section class="card viz-card">${track(m.id)}</section>
      <div class="page-head">
        <p class="eyebrow">${esc(m.pillar)}</p>
        <h1 class="step-title">${esc(m.title)}</h1>
        <p class="step-desc">${esc(m.caption)}</p>
        ${m.status === "active" || m.status === "open" ? `<p class="why-line">${IC.target}<span><b>Kenapa tahap ini:</b> ${esc(stepReason(m))}</span></p>` : ""}
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
      <div class="card-head"><h2 id="goal-h">Target tahap ini</h2></div>
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
    get goal() { return { path: `resilience.goalData.${primaryGoal()}.saved`, label: "Tabungan tujuan", type: "goal-deposit" }; },
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

  // ---------- Kartu di langkah tangga: data dibaca dari Profil, kejadian dicatat lewat + Catat ----------
  const toProfil = (sec, text) => `<a class="btn sm secondary" href="${editUrl(sec)}">${text}</a>`;
  function updateCard(m) {
    const x = m.x, c = x.c;
    if (m.tool === "budget") {
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">Angka yang dipakai</h2><p>Budget harian = (pendapatan − cicilan jangka panjang) ÷ 30.</p></div>
        <dl class="kv-list">
          <div><dt>Pendapatan</dt><dd class="num">${rp(c.income)}/bln</dd></div>
          <div><dt>Cicilan jangka panjang</dt><dd class="num">${rp(x.lane.monthly)}/bln</dd></div>
          <div><dt>Budget harian</dt><dd class="num">${rp(x.budget)}/hari</dd></div>
          <div><dt>Belanja rata-rata</dt><dd class="num">${rp(r1k(c.expMid / 30))}/hari</dd></div>
          <div><dt>Pengeluaran pokok</dt><dd class="num">${rp(x.pokok)}/hari</dd></div>
        </dl>
        <p class="hint">Utang jangka pendek dibayar dari setoran di tahap 3, jadi tidak dipotong di sini.</p>
        <div>${toProfil("keuangan", "Ubah di Profil")}</div>
      </section>`;
    }
    if (m.tool === "savings" || m.tool === "goal") {
      const goal = m.pot === "goal", pot = POT[goal ? "goal" : "emergency"], now = Number(get(pot.path)) || 0;
      if (m.tool === "goal" && !m.target) return card("Nominal tujuan belum diisi", "", `<div>${toProfil("tujuan", "Isi di Profil")}</div>`);
      return `<section class="card" aria-labelledby="upd-h">
        <div class="card-head"><h2 id="upd-h">${pot.label}: ${rp(now)}</h2>${goal ? "" : `<p>${fmtDays(x.days)} bertahan · pokok ${rp(x.pokok)}/hari</p>`}</div>
        <div class="chips">
          <button type="button" class="btn sm" data-act="catat" data-kind="${goal ? "setor-tujuan" : "setor"}">${ICON.plus} Setor</button>
          ${!goal && now > 0 ? `<button type="button" class="btn sm secondary" data-act="catat" data-kind="ambil">Ambil</button>` : ""}
          ${m.tool === "goal" ? toProfil("tujuan", "Ubah target") : ""}
        </div>
        ${!goal ? `<p class="hint">Dipakai untuk keadaan darurat? Tidak apa-apa, tahap ini tidak gagal. Catat lewat Ambil, hitung mundurnya disesuaikan.</p>` : ""}
        ${lastEntryNote([m.id, goal ? "tujuan" : "tabungan"])}
      </section>`;
    }
    if (m.tool === "shortdebt") return shortDebtCard(x);
    if (m.tool === "growth") {   // tahap investasi (dari main)
      return card("Setoran uang tumbuh bulan ini", "", `
        <div class="kv"><span>Bulan ini</span><b class="num">${rp(m.thisMonth || 0)} dari ${rp(m.target || 0)}</b></div>
        ${m.warn ? `<div class="note warn">${ST_ICON.serious}<span>${esc(m.warn)}</span></div>` : ""}
        <div class="chips"><button type="button" class="btn sm" data-act="catat" data-kind="setor-tumbuh">${ICON.plus} Setor uang tumbuh</button></div>
        <p class="hint">Uang tumbuh terpisah dari dana darurat. Mengambilnya untuk belanja membuat hitungan beruntun mulai dari nol.</p>`);
    }
    if (m.tool === "debtgoal") return laneMini(x.lane);
    return "";
  }

  // Tahap 3: satu angka besar, setoran per hari dan pembagiannya, lalu utang sesuai urutan rekomendasi Laju.
  function shortDebtCard(x) {
    const pay = x.payoff, mini = MINI_DAYS * x.pokok;
    const cushPerDay = Math.round(x.setor.value * (x.shortDebts.length ? x.cushion.share : 1));
    const big = !x.shortDebts.length ? "Tidak ada utang jangka pendek"
      : pay.allDays != null ? `${pay.allDays} hari lagi <small>· semua lunas sekitar ${dayMonth(inDays(pay.allDays))}</small>` : "Belum ada setoran ke utang";
    // titik pencapaian di garis: bantalan mini penuh, tiap utang lunas
    const marks = [...(x.emergency < mini && cushPerDay > 0 ? [{ d: Math.ceil((mini - x.emergency) / cushPerDay), l: "Bantalan mini penuh" }] : []),
      ...pay.rows.filter(r => r.finishDays != null).map(r => ({ d: r.finishDays, l: `${debtTypeLabel(r.d)} lunas` }))].sort((a, b) => a.d - b.d);
    const span = Math.max(1, ...marks.map(k => k.d));
    return `<section class="card sd-card" aria-labelledby="upd-h">
      <div class="card-head"><h2 id="upd-h">Hitung mundur</h2></div>
      <p class="sd-big num">${big}</p>
      ${marks.length ? `<div class="sd-line" role="img" aria-label="${esc(marks.map(k => `${k.l} ${countdown(k.d)}`).join(". "))}"><span class="sd-rail"></span>${marks.map(k => `<span class="sd-mark" style="left:${(k.d / span) * 100}%" data-tip="${esc(k.l)} · ${countdown(k.d)}" tabindex="0"></span>`).join("")}</div>
        <ul class="sd-marks">${marks.map(k => `<li><b>${esc(k.l)}</b><small>${countdown(k.d)}</small></li>`).join("")}</ul>` : ""}
      <dl class="kv-list">
        <div><dt>Setoran per hari</dt><dd class="num">${rp(x.setor.value)}</dd></div>
        ${x.shortDebts.length ? `<div><dt>Ke utang</dt><dd class="num">${rp(pay.perDay)}/hari</dd></div>` : ""}
        <div><dt>Ke bantalan mini</dt><dd class="num">${rp(cushPerDay)}/hari${x.emergency >= mini ? " · sudah penuh" : ""}</dd></div>
        <div><dt>Bantalan mini</dt><dd class="num">${rp(x.emergency)} dari ${rp(mini)}</dd></div>
      </dl>
      <p class="hint">${esc(x.alloc.phase === "pendek" ? x.alloc.why : `Tagihan terdekat ${x.cushion.tone}. Pembagian dihitung ulang setiap jatuh tempo lewat atau ada pembayaran.`)}</p>
      ${x.setor.shortfall ? `<div class="note danger">${ICON.alert}<span>Setoran maksimal ${rp(x.setor.max)}/hari belum cukup: kurang ${rp(x.setor.shortfall)} untuk ${esc(debtTypeLabel(x.setor.near.d))} ${dayMonth(parseIso(x.setor.near.d.due))}. Pilihan: bayar sebagian, minta keringanan ke pemberi pinjaman, atau <a href="#milestone/darurat-jalur">jalur darurat</a>.</span></div>` : ""}
    </section>
    ${x.shortDebts.length ? `<section class="card" aria-labelledby="sdl-h">
      <div class="card-head"><h2 id="sdl-h">Bayar ini dulu</h2><p>Urutan dari Laju, dicek ulang setiap ada pembayaran.</p></div>
      ${pay.rows.map(r => shortRow(r, pay)).join("")}
      ${lastEntryNote(["utang", "pendek"])}
      <p class="hint">Utang baru? Tidak apa-apa, <a href="${editUrl("utang")}">tambahkan di Profil</a>. Hitung mundurnya disesuaikan.</p>
    </section>` : ""}`;
  }
  function shortRow(r, pay) {
    const d = r.d, rem = Number(d.remaining), base = Math.max(rem, Number(d.peak) || 0);
    const tone = { aman: "good", "agak mepet": "warn", mepet: "serious", kurang: "critical" }[r.tone];
    return `<div class="drow">
      <div class="drow-head"><span class="prio">${r.n}</span><b>${esc(debtTypeLabel(d))}</b>${isRisky(d) ? '<span class="tag warn">Berisiko</span>' : ""}</div>
      <p class="sd-why">${esc(r.why)}</p>
      <dl class="kv-list">
        <div><dt>Sisa</dt><dd class="num">${rp(rem)}</dd></div>
        <div><dt>Tagihan berikutnya</dt><dd class="num">${d.due ? `${rp(r.amt)} · ${dayMonth(parseIso(d.due))}` : "-"}${tone ? ` ${statusPill(tone, r.tone)}` : ""}</dd></div>
        <div><dt>Lunas semua</dt><dd class="num">${r.finishDays != null ? countdown(r.finishDays) : "-"}</dd></div>
      </dl>
      <div class="pt-bar" aria-hidden="true"><i style="width:${base > 0 ? Math.max(2, (1 - rem / base) * 100) : 0}%"></i></div>
      <div><button type="button" class="btn sm" data-act="catat" data-kind="bayar" data-i="${r.i}">${ICON.plus} Catat bayar</button></div>
    </div>`;
  }

  function debtRows(debts, step) {
    const rows = S.debts.map((d, i) => ({ d, i })).filter(({ d }) => debts.includes(d) || (d.paidOff && !isShort(d)));
    const open = debtOrder(rows.filter(r => debtOpen(r.d)).map(r => r.d)).map(d => rows.find(r => r.d === d));
    const paid = rows.filter(r => !debtOpen(r.d));
    const guessed = open.some(r => !(Number(r.d.months) > 0));
    return `${open.length || paid.length ? "" : `<p class="hint">Tidak ada cicilan jangka panjang. <a href="${editUrl("utang")}">Ubah di Profil</a>.</p>`}
      ${open.map((r, k) => debtRow(r, k + 1, step)).join("")}${paid.map(r => debtRow(r, 0, step)).join("")}
      ${guessed ? `<p class="hint">* Lama cicilan belum diisi. Laju memperkirakan cicilan dari sisa utang ÷ 12 bulan.</p>` : ""}`;
  }
  function debtRow({ d, i }, prio) {
    const open = debtOpen(d), rate = debtRate(d), inst = debtInstallment(d);
    return `<div class="drow ${open ? "" : "paid"}">
      <div class="drow-head">${open ? `<span class="prio">${prio}</span>` : ""}<b>${esc(debtTypeLabel(d))}</b>${!open ? statusPill("good", "Lunas") : ""}</div>
      ${open ? `<dl class="drow-facts">
          <div><dt>Sisa</dt><dd class="num">${rp(Number(d.remaining))}</dd></div>
          <div><dt>Bunga</dt><dd>${rate ? `${String(rate).replace(".", ",")}%/bln${Number(d.rate) > 0 ? "" : " (perkiraan)"}` : "-"}</dd></div>
          <div><dt>Cicilan</dt><dd class="num">${rp(inst)}${Number(d.months) > 0 ? "" : "*"}</dd></div>
        </dl>
        ${d.due ? `<p class="hint">Jatuh tempo berikutnya: <b>${countdown(daysUntil(d.due))}</b></p>` : ""}
        <div><button type="button" class="btn sm" data-act="catat" data-kind="bayar" data-i="${i}">${ICON.plus} Catat bayar</button></div>` : ""}
    </div>`;
  }

  // ---------- Rencana per tahap ----------
  function planCard(m) {
    const x = m.x, c = x.c;
    if (m.tool === "budget") {
      const tips = card("Cara menutup selisih", "", `<ul class="help-list">
        <li>${ICON.info}<span>Narik di jam ramai (pagi berangkat kerja, makan siang, sore pulang kerja) biasanya memberi order lebih banyak per jam.</span></li>
        <li>${ICON.info}<span>Pengeluaran gaya hidup dan sosial adalah pos yang paling mudah ditekan. Pengeluaran pokok jangan dikorbankan.</span></li>
      </ul>`);
      if (c.expMid <= c.income - x.lane.monthly) return card("Rencana", "", `<div class="note">${ST_ICON.good}<span>Belanja Anda sudah di bawah budget. Selesai di cek bulanan berikutnya kalau tetap begitu.</span></div>`);
      const p = cashPlan(m);
      return `<section class="card viz-card" aria-labelledby="plan-h">
        <div class="card-head"><h2 id="plan-h">Rencana keluar dari minus</h2><p>Geser untuk mencoba.</p></div>
        <div class="field"><span class="lbl">Pengeluaran per bulan</span>${topExpenses(c)}</div>
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
      </section>${tips}`;
    }
    if (m.tool === "shortdebt" || m.tool === "savings" || m.tool === "goal") {
      if ((m.tool === "savings" || m.tool === "goal") && m.status === "done") return card("Rencana", "", `<div class="note">${ST_ICON.good}<span>Target tercapai.</span></div>`);
      if (m.tool === "goal" && !m.target) return "";
      return setoranCard(m);
    }
    if (m.tool === "credit") return trustCard();
    if (m.tool === "debtgoal") return laneCard(x.lane);
    if (m.tool === "fondasi") {
      const todo = m.criteria.filter(k => !k.met);
      if (!todo.length) return "";
      return card("Yang perlu dilengkapi", "", `<ul class="checkpoints">${todo.map(k => `<li><span class="ci">${IC.circle}</span><span>${esc(k.label)}${k.value ? ` <small>· ${esc(k.value)}</small>` : ""}</span></li>`).join("")}</ul>
        <div class="chips"><a class="btn sm" href="${editUrl(todo.some(k => /dompet|pencairan/i.test(k.label)) ? "ewallet" : todo.some(k => /utang/i.test(k.label)) ? "utang" : "keuangan")}">Lengkapi</a></div>`);
    }
    return "";
  }

  // Penggeser setoran harian (satu angka untuk tahap 3, 4, 5). Batas bawah = kebutuhan tagihan terdekat,
  // batas atas = budget harian − pengeluaran pokok.
  function setoranCard(m) {
    const x = m.x, r = x.setor;
    if (r.max <= 0) return card("Setoran harian", "", `<div class="note danger">${ICON.alert}<span>Budget harian ${rp(r.budget)} habis untuk pengeluaran pokok ${rp(r.pokok)}. Selesaikan tahap Keluar dari minus dulu supaya ada ruang menyetor.</span></div>`);
    // Kebutuhan tagihan terdekat sudah sama atau lebih dari batas atas: tidak ada yang bisa dipilih, jadi penggeser tidak ditampilkan.
    if (r.min >= r.max) {
      const n = r.near;
      return `<section class="card viz-card" aria-labelledby="plan-h">
        <div class="card-head"><h2 id="plan-h">Setoran harian</h2><p>Diambil dari budget harian ${rp(r.budget)}. Batas atas ${rp(r.max)} supaya pengeluaran pokok tetap aman.</p></div>
        <p class="plan-big">Setor <b>${rp(r.max)}</b> per hari</p>
        <p class="hint">Tagihan ${n ? `${esc(debtTypeLabel(n.d))} ${rp(n.amt)} jatuh tempo ${dayMonth(parseIso(n.d.due))} (${n.days} hari lagi)` : "terdekat"} butuh ${rp(r.need)} per hari. Itu sudah sama dengan atau lebih dari batas atas, jadi setoran dipakai penuh dan belum bisa dipilih.</p>
        ${r.shortfall ? `<div class="note danger">${ICON.alert}<span>Masih kurang ${rp(r.shortfall)} untuk tagihan itu. Pilihan: bayar sebagian dulu, minta keringanan atau mundur jatuh tempo ke pemberi pinjaman sebelum telat, atau <a href="#milestone/darurat-jalur">jalur darurat</a>.</span></div>` : ""}
        <div id="sim-result" aria-live="polite">${setoranResult(x, r.max)}</div>
        <p class="hint">Setelah tagihan ini dibayar, penggeser terbuka lagi dan bisa diatur.</p>
      </section>`;
    }
    const v = clamp(sim.setor ?? r.value, r.min, r.max);
    return `<section class="card viz-card" aria-labelledby="plan-h">
      <div class="card-head"><h2 id="plan-h">Setoran harian</h2><p>Diambil dari budget harian ${rp(r.budget)}. Batas atas ${rp(r.max)} supaya pengeluaran pokok tetap aman.</p></div>
      <div class="field"><label for="sim-setor">Setor per hari: <output id="o-setor" class="num">${rp(v)}</output></label>
        <input type="range" id="sim-setor" style="--p:${pctOf(v, r.min, r.max)}%" data-sim="setor" min="${r.min}" max="${r.max}" step="1000" value="${v}">
        <div class="range-ends"><span>${rpShort(r.min)}${r.need ? " · tagihan terdekat" : ""}</span><span>${rpShort(r.max)}</span></div></div>
      <div id="sim-result" aria-live="polite">${setoranResult(x, v)}</div>
      <div class="chips"><button type="button" class="btn sm" data-act="setoran-save">Pakai setoran ini</button></div>
      ${r.chosen ? `<p class="hint">Setoran tersimpan: ${rp(r.value)} per hari.</p>` : `<p class="hint">Saran Laju: ${rp(r.suggested)} per hari.</p>`}
    </section>`;
  }
  // Hasil penggeser: budget belanja setelah setoran dan perkiraan selesai, memakai aturan pembagian yang sama.
  function setoranResult(x, v) {
    const sx = { ...x, setor: { ...x.setor, value: v } };
    sx.cushion = cushionShare(sx); sx.payoff = payoffPlan(sx);
    const a = allocation(sx, "");
    const pay = sx.payoff;
    const lines = a.items.map(i => `<li><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b class="num">${rp(i.perDay)}<small>/hari</small></b></li>`).join("");
    let eta = "";
    if (a.phase === "pendek" && x.shortDebts.length) eta = pay.allDays != null ? `Semua utang jangka pendek lunas <b>${countdown(pay.allDays)}</b>.` : "Belum ada bagian ke utang.";
    else if (a.phase === "pendek" || a.phase === "darurat") {
      const tgt = (a.phase === "pendek" ? MINI_DAYS : FULL_DAYS) * x.pokok, per = a.items.find(i => i.key === "cushion" || i.key === "emergency")?.perDay || 0;
      eta = per > 0 ? `${a.phase === "pendek" ? "Bantalan mini" : `Dana darurat ${FULL_DAYS} hari`} penuh <b>${countdown(Math.ceil(Math.max(0, tgt - x.emergency) / per))}</b>.` : "";
    } else if (a.phase === "tujuan") {
      const g = stepGoal(x), per = a.items.find(i => i.key === "goal")?.perDay || 0;
      eta = per > 0 && g.goalAmt > x.goalSaved ? `Tujuan tercapai <b>${countdown(Math.ceil((g.goalAmt - x.goalSaved) / per))}</b> · target ${fmtShortDate(g.deadline)}.` : "";
    }
    return `<div class="sim-out ok">
      <p class="verdict">${ST_ICON.good}<span>Budget belanja jadi <b>${rp(Math.max(0, x.setor.budget - v))}</b> per hari. ${eta}</span></p>
      <ul class="alloc-list">${lines}</ul>
    </div>`;
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
    // mode isian sendiri: 3 kelompok per hari × 30. Mode e-wallet / e statement: kategori dari transaksi.
    const top = c.auto ? Object.entries(c.agg.byCategory).map(([id, v]) => ({ label: categoryLabel(id), v, gaya: EXPENSE_CATEGORIES.find(k => k.id === id)?.group === "gaya" })).sort((a, b) => b.v - a.v).slice(0, 5)
      : EXPENSE_GROUPS.map(g => ({ label: g.label, v: (Number(S.expDaily?.[g.id]) || 0) * 30, gaya: g.id === "gaya" })).filter(a => a.v > 0);
    const max = Math.max(1, ...top.map(t => t.v));
    return `<div class="hbars tight">${top.map(t => `<div class="hrow"><span>${esc(t.label)}${t.gaya ? ' <span class="tag warn">bisa dikurangi</span>' : ""}</span><span class="num">${rp(t.v)}</span><div class="bar peach"><i style="width:${(t.v / max) * 100}%"></i></div></div>`).join("")}</div>`;
  }

  // ---------- Jalur cicilan jangka panjang ----------
  function laneDetail() {
    const x = ms[0].x, lane = x.lane, h = x.h;
    return `${crumbs("Berjalan terus")}
      ${lane.active ? `<section class="card viz-card">${track("utang")}</section>` : ""}
      <div class="page-head">
        <p class="eyebrow">Berjalan terus, bukan tahap</p>
        <h1 class="step-title">Cicilan jangka panjang</h1>
        <p class="step-desc">Cicilan kendaraan, bank, atau koperasi. Dibayar tepat waktu setiap bulan, tidak ditambah cicilan baru sampai tahap kredit. Utang jangka pendek ada di tahap 3.</p>
      </div>
      <div class="stack">
        ${lane.active ? `<section class="card goal" aria-labelledby="goal-h">
          <div class="card-head"><h2 id="goal-h">Sisa cicilan</h2></div>
          <div class="goal-tiles">
            <div class="goal-now ${lane.done ? "done" : ""}"><span>Sisa cicilan jangka panjang</span><b>${rp(lane.left)}</b></div>
            <div class="goal-tgt"><span>${IC.flag}Per bulan</span><b>${rp(lane.monthly)}</b></div>
          </div>
          ${lane.done ? `<p class="goal-gap done">${ST_ICON.good}<span>Semua cicilan lunas</span></p>` : `<p class="goal-gap">${IC.target}<span>${lane.months != null ? `Lunas sekitar ${monthYear(lane.months)} (${lane.months} bulan) kalau dibayar tepat waktu` : "Cicilan hanya menutup bunga. Tanyakan keringanan ke pemberi pinjaman."}</span></p>`}
          ${goalBar({ kind: "paid", paid: lane.paid, left: lane.left, fmt: rp })}
        </section>` : card("Tidak ada cicilan jangka panjang", "", `<p class="hint">Kalau ada cicilan kendaraan atau bank, <a href="${editUrl("utang")}">tambahkan di Profil</a>.</p>`)}
        ${lane.active && !lane.done ? `<section class="card" aria-labelledby="gr-h">
          <div class="card-head"><h2 id="gr-h">Aturan selama cicilan berjalan</h2></div>
          <ul class="checkpoints">
            <li class="${h.dsr <= 0.3 ? "met" : ""}"><span class="ci">${h.dsr <= 0.3 ? ST_ICON.good : ST_ICON.serious}</span><span>Semua cicilan ≤ 30% pendapatan <small>· sekarang ${pct(h.dsr)} (batas OJK untuk pinjol mulai 2026)</small></span></li>
            <li><span class="ci">${ICON.calendar}</span><span>Bayar tepat waktu. Laju mengingatkan ${REMIND_DAYS} hari sebelum jatuh tempo, dan catatan tepat waktu masuk rapor 6 bulan.</span></li>
            <li><span class="ci">${ICON.shield}</span><span>Jangan ambil cicilan baru sampai tahap Siap ajukan kredit.</span></li>
          </ul>
        </section>` : ""}
        ${lane.active ? `<section class="card" aria-labelledby="upd-h">
          <div class="card-head"><h2 id="upd-h">Catat pembayaran</h2></div>
          ${debtRows(x.longDebts, "utang")}
          ${lastEntryNote(["utang"])}
          <p class="hint">Salah isi? <a href="${editUrl("utang")}">Ubah di Profil</a></p>
        </section>` : ""}
        ${lane.active ? historyCard("utang", lane.progress) : ""}
      </div>`;
  }

  // Jalur darurat: saat butuh uang mendadak. Tidak melarang utang, hanya mengarahkan ke pilihan yang paling aman.
  function emergencyPath() {
    const x = ms[0].x, em = x.emergency;
    return `${crumbs("Jalur darurat")}
      <div class="page-head">
        <p class="eyebrow">Berjalan terus, bukan tahap</p>
        <h1 class="step-title">Butuh uang mendadak?</h1>
        <p class="step-desc">Kebutuhan mendesak itu nyata. Pakai urutan ini supaya tidak terjebak bunga mahal. Utang baru otomatis masuk daftar, tanpa hukuman.</p>
      </div>
      <div class="stack">
        <section class="card" aria-labelledby="jd-h">
          <div class="card-head"><h2 id="jd-h">Urutan pilihan yang aman</h2></div>
          <ol class="focus-list">
            <li class="focus-item"><span class="fi-num">1</span><span class="fi-txt"><b>Dana darurat Anda</b><small>${em > 0 ? `Ada ${rp(em)}. Memakainya tidak menggagalkan tahap, catat saja lewat Ambil.` : "Belum ada. Lanjut ke pilihan berikutnya."}</small></span>${em > 0 ? `<button type="button" class="btn sm" data-act="catat" data-kind="ambil">Ambil</button>` : ""}</li>
            <li class="focus-item"><span class="fi-num">2</span><span class="fi-txt"><b>Keluarga atau teman, tanpa bunga</b><small>Sepakati jumlah dan tanggal kembalinya. Masukkan ke Daftar utang sebagai Keluarga / teman.</small></span></li>
            <li class="focus-item"><span class="fi-num">3</span><span class="fi-txt"><b>Minta keringanan</b><small>Untuk tagihan yang sudah ada: minta bayar sebagian atau mundur jatuh tempo ke pemberi pinjaman, sebelum telat.</small></span></li>
            <li class="focus-item"><span class="fi-num">4</span><span class="fi-txt"><b>Koperasi atau pinjaman resmi terdaftar OJK</b><small>Cek nama pemberi pinjaman di daftar resmi OJK dulu (ojk.go.id, atau tanya Kontak OJK 157).</small></span></li>
          </ol>
        </section>
        <section class="card" aria-labelledby="jd2-h">
          <div class="card-head"><h2 id="jd2-h">Hindari</h2></div>
          <ul class="checkpoints">
            <li><span class="ci">${ST_ICON.critical}</span><span>Pinjol yang tidak terdaftar OJK: bunga dan denda tidak dibatasi, penagihannya sering mengancam.</span></li>
            <li><span class="ci">${ST_ICON.critical}</span><span>Rentenir: bunga bisa 10% per bulan atau lebih.</span></li>
            <li><span class="ci">${ST_ICON.serious}</span><span>Pinjaman baru untuk menutup pinjaman lama. Lebih baik minta keringanan.</span></li>
          </ul>
          <div class="chips"><a class="btn sm secondary" href="${editUrl("utang")}">${ICON.plus} Catat utang baru</a></div>
        </section>
      </div>`;
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
    if (act) prio.push({ t: `Tahap ${act.number}: ${act.title}`, s: act.gap || act.short, href: `#milestone/${act.id}`, cta: "Buka" });
    prio.push({ t: `Belanja maksimal ${rpShort(x.alloc.items.length ? x.setor.spendBudget : x.budget)} per hari`, s: x.alloc.items.length ? `Setoran ${rpShort(x.setor.value)}/hari: ${x.alloc.items.map(i => `${i.label} ${rpShort(i.perDay)}`).join(" · ")}` : x.alloc.why, href: "#dashboard", cta: "Lihat" });
    const rem = dueReminders()[0] || (x.payoff.rows[0]?.d.due ? { d: x.payoff.rows[0].d, i: x.payoff.rows[0].i, days: x.payoff.rows[0].days } : null);
    if (rem) prio.push({ t: `Bayar ${debtTypeLabel(rem.d)} ${rpShort(dueAmount(rem.d))}`, s: `Jatuh tempo ${countdown(rem.days)}`, act: "catat", kind: "bayar", cta: "Catat bayar" });
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
    const doneN = steps.filter(m => m.status === "done").length;
    const delta = start ? h.total - start.score : 0;
    const cmp = [
      ["Skor", "score", (v) => String(v), 1],
      ["Sisa / bulan", "net", rpShort, 1],
      ["Dana darurat", "emergency", rpShort, 1],
      ["Tabungan tujuan", "goalSaved", rpShort, 1],
      ["Total utang", "totalDebt", rpShort, -1],
      ["Utang jangka pendek", "shortDebt", rpShort, -1],
      ["Porsi cicilan", "dsr", (v) => pct(v), -1],
      ["Hari bertahan", "days", (v) => fmtDays(v || 0), 1],
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
            <div><b class="num">${(() => { const p = paymentRecord(); return p.n ? `${p.onTime}/${p.n}` : "-"; })()}</b><span>Bayar tepat waktu</span></div>
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

        ${monthlyReport()}
        ${movementCard()}

        <section class="card" aria-labelledby="jr-h">
          <div class="card-head"><h2 id="jr-h">Perjalanan tangga</h2><p>${doneN} dari ${steps.length} selesai</p></div>
          <ol class="journey">${steps.map(m => `<li class="${m.status}"><span class="jn">${m.status === "done" ? ICON.check : m.number}</span><span><b>${esc(m.title)}</b><small>${m.status === "done" ? `Selesai${S.milestones.doneAt[m.id] ? ` ${fmtShortDate(parseIso(S.milestones.doneAt[m.id]))}` : ""}` : `${m.progress}%`}</small></span></li>`).join("")}
            ${x.lane.active ? `<li class="lane ${x.lane.done ? "done" : ""}"><span class="jn">${IC.lane}</span><span><b>Cicilan jangka panjang</b><small>${x.lane.done ? "Semua cicilan lunas" : `${x.lane.progress}% · sisa ${rpShort(x.lane.left)}`}</small></span></li>` : ""}</ol>
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

        <details class="card more ai-card"><summary>Data untuk analisis AI <small>(${(aiJson.length / 1024).toFixed(1).replace(".", ",")} KB, tanpa nama, HP, password)</small></summary>
          <div class="ai-run">
            <button type="button" class="btn primary" id="aiGo">Minta analisis Gemini</button>
            <p class="hint">Yang dikirim hanya angka di bawah ini. Nama, nomor HP, dan password tidak ikut.</p>
          </div>
          <div class="ai-out" id="aiOut" aria-live="polite"></div>
          <pre class="ai-json">${esc(aiJson)}</pre>
        </details>
      </div>`;
  }

  // Rapor bulanan: satu baris per cek bulanan. Setelah 6 cek = rapor 6 bulan (untuk bank hanya kalau Tier 1).
  function monthlyReport() {
    const st = monthlyChecks(), list = st.list, t = dataTrust();
    const six = list.length >= CHECK_TARGET;
    const head = six ? (t.ready ? "Rapor 6 bulan siap untuk bank" : "Rapor 6 bulan") : "Rapor bulanan";
    const sub = six ? (t.ready ? "Rekam jejak lengkap. Pengajuan kredit terbuka di tahap Siap ajukan kredit." : t.tier === 1 ? "Rekam jejak lengkap. Lengkapi syarat lain di tahap Siap ajukan kredit." : "Untuk panduan Anda. Pengajuan kredit butuh e-wallet terhubung (Tier 1).")
      : `${list.length} dari ${CHECK_TARGET} cek bulanan${st.nextAt ? ` · berikutnya ${fmtShortDate(st.nextAt)}` : ""}`;
    const rows = list.map(e => `<tr><th scope="row">${e.n}${e.late ? ` <small>terlambat</small>` : ""}</th><td>${fmtShortDate(new Date(e.at))}</td><td class="n">${e.snap.score}</td><td class="n">${rpShort(e.snap.net)}</td><td class="n">${rpShort(e.snap.emergency)}</td><td class="n">${rpShort(e.snap.totalDebt)}</td><td class="n">${e.snap.payments ? `${e.snap.onTime}/${e.snap.payments}` : "-"}</td><td class="n">${e.steps ? `${e.steps.done}/${e.steps.total}` : "-"}</td><td class="n">${e.tier}</td></tr>`).join("");
    return `<section class="card" aria-labelledby="mr-h">
      <div class="card-head"><h2 id="mr-h">${head}</h2><p>${sub}</p></div>
      ${list.length ? `<div class="viz-table"><table class="cmp-table">
        <thead><tr><th scope="col">Bulan</th><th scope="col">Tanggal</th><th scope="col" class="n">Skor</th><th scope="col" class="n">Sisa</th><th scope="col" class="n">Dana darurat</th><th scope="col" class="n">Utang</th><th scope="col" class="n">Bayar tepat waktu</th><th scope="col" class="n">Tahap</th><th scope="col" class="n">Tier</th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : `<p class="hint">Cek pertama muncul di Beranda 30 hari setelah onboarding selesai.</p>`}
    </section>`;
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
      case "logout": setLoggedIn(false); location.href = "masuk.html"; return;
      case "catat": return openCatat(el.dataset.kind, el.dataset.i != null ? Number(el.dataset.i) : null);
      case "auto-plan": sim.minus = autoCashPlan(m); render(true); return snack("Rencana otomatis terisi. Sesuaikan bila perlu");
      case "save-plan": {
        if (m.tool === "budget") { const p = cashPlan(m); S.milestones.plans.minus = { cut: p.cut, hours: p.hours }; }
        save(); render(true); return snack("Rencana disimpan");
      }
      case "setoran-save": {
        const v = Number($("#sim-setor").value), before = Number(S.milestones.setoran) || 0;
        delete sim.setor;
        return commit({ title: `Setor ${rp(v)} per hari?`, rows: [["Setoran per hari", before ? rp(before) : "saran Laju", rp(v)], ["Budget belanja per hari", rp(x.budget - (before || x.setor.value)), rp(x.budget - v)]], ok: "Ya, pakai",
          type: "setoran", label: `Setoran ${rp(v)} per hari`, step: m?.id || "pendek", paths: ["milestones.setoran"], apply: () => { S.milestones.setoran = v; }, msg: "Setoran harian disimpan" });
      }
      case "daily-save": {
        const v = moneyVal("bd-today"), iso = isoOf(new Date()), before = S.daily?.[iso];
        return commit({ title: `Keluar hari ini ${rp(v)}?`, rows: [["Keluar hari ini", before != null ? rp(before) : "belum dicatat", rp(v)]], ok: "Ya, simpan",
          type: "daily", label: `Keluar hari ini ${rp(v)}`, step: "minus", paths: ["daily"], apply: () => { (S.daily ||= {})[iso] = v; }, msg: v <= x.budget ? "Tercatat, masih di bawah budget" : `Tercatat, lewat budget ${rp(v - x.budget)}` });
      }
      case "paid": return openCatat("bayar", Number(el.dataset.i), true);
      case "scenario": return startScenario();
      case "sim-plan": { const n = runPlanMonth(); save(); window.LajuSim?.advance(30); try { sessionStorage.setItem("laju-flash", `Rencana 30 hari dijalankan (${n} catatan), jam dimajukan 30 hari`); } catch (err) { /* abaikan */ } location.reload(); return; }
      case "sim-advance": window.LajuSim?.advance(30); try { sessionStorage.setItem("laju-flash", "Jam simulasi dimajukan 30 hari"); } catch (err) { /* abaikan */ } location.reload(); return;
      case "chk-answer": chk[el.dataset.k] = el.dataset.v; render(true); return;
      case "chk-sync": return checkSync();
      case "chk-save": {
        const e = recordCheck({ newDebt: chk.debt === "ya", shock: chk.shock === "ya" });
        if (!e) return;
        Object.assign(chk, { synced: false, msg: "", err: "", debt: null, shock: null, result: e });
        save(); render(true); return snack(`Cek bulan ke ${e.n} tersimpan`);
      }
      case "chk-close": chk.result = null; render(true); return;
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
  // Status data untuk bank: tier, pendapatan terbukti (perkiraan Laju) vs isian (panduan), grafik, ringkasan untuk bank, alasan + cara naik tier.
  function trustCard() {
    const t = dataTrust(), c = calc();
    // Fokus Laju = stabil dulu. Yang belum berencana pinjam cukup melihat satu baris status data.
    if (S.resilience.wantsBankLoan !== true && route().p === "profil") {
      return `<section class="card trust-card t${t.tier}" aria-labelledby="tr-h">
        <div class="card-head"><h2 id="tr-h">Status data</h2></div>
        <div class="tr-top"><span class="tr-badge num">Tier ${t.tier}</span><span class="tr-txt"><b>${t.label}</b><small>Anda belum berencana mengajukan kredit, jadi Laju fokus ke tahap menuju stabil. Rekam jejak tetap tercatat: ${Math.min(t.checks, CHECK_TARGET)} dari ${CHECK_TARGET} cek bulanan.</small></span></div>
        <p class="hint">Berubah pikiran? Ubah jawaban rencana pinjaman di <a class="link-btn inline" href="${editUrl("tujuan")}">Tujuan</a>.</p>
      </section>`;
    }
    return `<section class="card trust-card t${t.tier}" aria-labelledby="tr-h">
      <div class="card-head"><h2 id="tr-h">Status data untuk bank</h2></div>
      <div class="tr-top"><span class="tr-badge num">Tier ${t.tier}</span><span class="tr-txt"><b>${t.label}</b><small>${t.apply}</small></span></div>
      <dl class="kv-list">
        <div><dt>Sumber data</dt><dd>${esc({ wallet: "E-wallet terhubung", pdf: "E statement PDF", manual: "Isian sendiri" }[c.source])}</dd></div>
        <div><dt>Rekam jejak di Laju</dt><dd class="num">${Math.min(t.checks, CHECK_TARGET)} dari ${CHECK_TARGET} cek bulanan</dd></div>
        ${t.live ? `<div><dt>Pendapatan terbukti (perkiraan Laju)</dt><dd class="num">${rp(t.bankIncome)}/bln</dd></div>` : ""}
      </dl>
      ${t.live ? `${vizIncomeHistory(t)}
        <p class="hint">Perkiraan ini memakai median pencairan aplikasi per bulan. Keputusan akhir tetap di bank.</p>
        ${bankSummary(t)}` : ""}
      ${t.reasons.length ? `<p class="sc-lbl">${t.tier === 1 ? "Yang perlu diperhatikan" : `Kenapa Tier ${t.tier}`}</p>
        <ul class="tr-list">${t.reasons.map(r => `<li><span>${esc(r.t)}</span>${r.act ? `<a class="link-btn inline" href="${r.act.href}">${r.act.label}</a>` : ""}</li>`).join("")}</ul>` : ""}
    </section>`;
  }
  function profilePage() {
    const p = S.profile, r = S.resilience, c = calc(), ch = channelStatus(c.agg);
    const openDebts = S.debts.filter(debtOpen), goal = GOALS.find(g => g.id === primaryGoal())?.label;
    const sum = {
      identitas: `${S.account.fullName || "-"} · ${S.account.city ? cityLabel() : "-"}`,
      kerja: `${p.platforms.map(platformName).join(", ") || "-"} · ${p.vehicle === "mobil" ? "Mobil" : "Motor"} ${(OWNERSHIP.find(o => o.id === p.ownership)?.label || "").toLowerCase()} · ${p.hoursPerDay} jam × ${p.daysPerWeek} hari`,
      keluarga: `${p.dependents} tanggungan${p.sideJobs.length ? ` · ${p.sideJobs.join(", ")}` : ""}`,
      tabungan: `Dana darurat ${rpShort(Number(r.savings) || 0)}${(GOAL_STEPS[primaryGoal()] || GOAL_STEPS[""]).kind === "pot" && primaryGoal() ? ` · Tujuan ${rpShort(primaryGoalSaved())}` : ""}`,
      uang: `${(p.channels || []).map(channelLabel).join(", ") || "-"} · rekening bank ${p.hasBank ? "ada" : "belum"}`,
      ewallet: (() => { const w = ch.connected.length + ch.notConnected.length;
        if (!S.consent.useWallet) { const d = c.agg.docs; return d ? `Isian sendiri · ${d} e statement (Tier 2)` : "Isian sendiri (Tier 3)"; }
        return !ch.connected.length ? "Belum terhubung" : ch.notConnected.length ? `${ch.connected.length}/${w} terhubung · Belum: ${ch.notConnected.map(channelLabel).join(", ")}` : `Terhubung: ${ch.connected.map(channelLabel).join(", ")}`; })(),
      proteksi: [p.hasBpjsKes && "BPJS Kesehatan", p.hasBpjsKet && "BPJS TK", p.hasInsurance && "Asuransi"].filter(Boolean).join(", ") || "Belum ada",
      keuangan: `Pendapatan ${rpShort(c.income)}/bln · belanja ${rpShort(c.expMid / 30)}/hari`,
      utang: openDebts.length ? `${openDebts.filter(isShort).length} jangka pendek, ${openDebts.filter(d => !isShort(d)).length} jangka panjang · sisa ${rpShort(openDebts.reduce((t, d) => t + Number(d.remaining), 0))}` : S.noDebt ? "Tidak punya utang" : "Belum diisi",
      tujuan: goal ? `${goal}${primaryGoalAmount() ? ` · ${rpShort(primaryGoalAmount())}` : ""}` : "-",
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
  const CATAT_TITLE = { setor: "Setor dana darurat", "setor-tujuan": "Setor tabungan tujuan", ambil: "Ambil dana darurat", bayar: "Bayar utang",
    "setor-tumbuh": "Setor uang tumbuh", "ambil-tumbuh": "Ambil uang tumbuh" };
  const ymNow = () => isoOf(new Date()).slice(0, 7);
  const openDebtRows = () => S.debts.map((d, i) => ({ d, i })).filter(o => debtOpen(o.d));
  function catatKinds() {
    const r = S.resilience, goalPot = (GOAL_STEPS[primaryGoal()] || GOAL_STEPS[""]).kind === "pot", open = openDebtRows();
    return [
      { k: "setor", s: `Saldo sekarang ${rp(Number(r.savings) || 0)}` },
      ...(goalPot ? [{ k: "setor-tujuan", s: `${GOALS.find(g => g.id === primaryGoal())?.label || "Tujuan utama"} · saldo ${rp(primaryGoalSaved())}` }] : []),
      { k: "setor-tumbuh", s: `Uang tumbuh sekarang ${rp(Number(r.growth) || 0)} · tahap investasi` },
      ...(Number(r.savings) > 0 ? [{ k: "ambil", s: "Untuk servis, berobat, kebutuhan mendadak" }] : []),
      ...(Number(r.growth) > 0 ? [{ k: "ambil-tumbuh", s: "Menghentikan hitungan beruntun tahap investasi" }] : []),
      ...(open.length ? [{ k: "bayar", s: `${open.length} utang · sisa ${rpShort(open.reduce((t, o) => t + Number(o.d.remaining), 0))}` }] : []),
    ];
  }
  function renderCatat() {
    let body;
    if (!cat.kind) {
      body = `<h2 id="catatTitle">Catat</h2>
        <div class="catat-list">${catatKinds().map(o => `<button type="button" class="catat-opt" data-ck="${o.k}"><b>${CATAT_TITLE[o.k]}</b><small>${esc(o.s)}</small></button>`).join("")}</div>
        <p class="hint">Hidup berubah? <a href="#profil" data-cclose>Ubah di Profil</a></p>
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-cclose>Tutup</button></div>`;
    } else {
      const k = cat.kind, open = openDebtRows();
      if (k === "bayar" && !open.some(o => o.i === cat.i)) cat.i = open[0]?.i ?? null;
      const d = cat.i != null ? S.debts[cat.i] : null;
      body = `<h2 id="catatTitle">${CATAT_TITLE[k]}</h2>
        ${k === "bayar" ? `<div class="field"><span class="lbl">Utang</span><div class="chips">${open.map(o => `<button type="button" class="chip" aria-pressed="${o.i === cat.i}" data-ci="${o.i}">${esc(debtTypeLabel(o.d))} · ${rpShort(Number(o.d.remaining))}</button>`).join("")}</div></div>` : ""}
        ${k === "ambil" ? `<div class="field"><span class="lbl">Untuk apa?</span><div class="chips">${["Servis", "Berobat", "Kebutuhan rumah", "Lainnya"].map(t => `<button type="button" class="chip" aria-pressed="${cat.reason === t}" data-cr="${t}">${t}</button>`).join("")}</div></div>` : ""}
        <div class="field"><label for="catat-amt">Jumlah</label>${moneyIn("catat-amt", cat.amt || 0)}
          <div class="chips quick">${k === "bayar" && d ? `${d.due && dueAmount(d) < Number(d.remaining) ? `<button type="button" class="chip" data-ca="${dueAmount(d)}">Tagihan ${rpShort(dueAmount(d))}</button>` : ""}<button type="button" class="chip" data-ca="${Number(d.remaining)}">Lunas ${rpShort(Number(d.remaining))}</button>` : [10000, 20000, 50000, 100000].map(a => `<button type="button" class="chip" data-ca="${a}">${rpShort(a)}</button>`).join("")}</div></div>
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-cback>${cat.direct ? "Batal" : "Kembali"}</button><button type="button" class="btn sm" data-cgo>Lanjut</button></div>`;
    }
    catatDlg.innerHTML = `<div class="sheet-body">${body}</div>`;
  }
  function openCatat(kind = null, i = null, remind = false) {
    Object.assign(cat, { kind, i, reason: "", amt: remind && i != null ? dueAmount(S.debts[i]) : 0, direct: !!kind });
    renderCatat();
    if (!catatDlg.open) catatDlg.showModal();
    (catatDlg.querySelector("#catat-amt") || catatDlg.querySelector("[data-ck]"))?.focus();
  }
  function submitCatat(amt) {
    const r = S.resilience;
    if (cat.kind === "setor" || cat.kind === "setor-tujuan") {
      const pot = POT[cat.kind === "setor" ? "emergency" : "goal"], now = Number(get(pot.path)) || 0;
      return commit({ title: `Catat setoran ${rp(amt)}?`, rows: [[pot.label, rp(now), rp(now + amt)]], note: "Pastikan uangnya sudah Anda pisahkan.",
        type: pot.type, label: `Setoran ${rp(amt)} ke ${pot.label.toLowerCase()}`, amount: amt, step: cat.kind === "setor" ? "tabungan" : "tujuan", paths: [pot.path],
        apply: () => set(pot.path, now + amt), msg: `Setoran ${rp(amt)} dicatat` });
    }
    // uang tumbuh (tahap investasi, dari main): setoran bulan ini dipakai untuk hitungan beruntun
    if (cat.kind === "setor-tumbuh") {
      const now = Number(r.growth) || 0, ym = ymNow(), bulanIni = Number((S.growth || {})[ym]) || 0;
      return commit({ title: `Catat setoran ${rp(amt)}?`, rows: [["Uang tumbuh", rp(now), rp(now + amt)], ["Setoran bulan ini", rp(bulanIni), rp(bulanIni + amt)]],
        note: "Setoran bulan ini dipakai untuk hitungan beruntun tahap investasi.",
        type: "growth-deposit", label: `Setoran ${rp(amt)} ke uang tumbuh`, amount: amt, step: "investasi", paths: ["resilience.growth", `growth.${ym}`],
        apply: () => { r.growth = now + amt; (S.growth ||= {})[ym] = bulanIni + amt; }, msg: `Setoran ${rp(amt)} dicatat` });
    }
    if (cat.kind === "ambil-tumbuh") {
      const now = Number(r.growth) || 0, v = Math.min(amt, now);
      return commit({ title: `Ambil ${rp(v)} dari uang tumbuh?`, rows: [["Uang tumbuh", rp(now), rp(now - v)]], note: "Mengambil uang tumbuh untuk belanja membuat tahap investasi dibuka lagi.",
        type: "withdraw", label: `Ambil uang tumbuh ${rp(v)}`, amount: v, step: "investasi", paths: ["resilience.growth", "milestones.growthSpent"],
        apply: () => { r.growth = now - v; S.milestones.growthSpent = isoOf(new Date()); }, msg: `Pengambilan ${rp(v)} dicatat` });
    }
    if (cat.kind === "ambil") {
      const now = Number(r.savings) || 0, v = Math.min(amt, now);
      return commit({ title: `Ambil ${rp(v)} dari dana darurat?`, rows: [["Dana darurat", rp(now), rp(now - v)]], note: amt > now ? `Dana darurat hanya ${rp(now)}.` : "",
        type: "withdraw", label: `Ambil ${rp(v)}${cat.reason ? ` untuk ${cat.reason.toLowerCase()}` : ""}`, amount: v, step: "tabungan", paths: ["resilience.savings"],
        apply: () => { r.savings = now - v; }, msg: `Pengambilan ${rp(v)} dicatat` });
    }
    if (cat.kind === "bayar" && cat.i != null) {
      const i = cat.i, d = S.debts[i], rem = Number(d.remaining), v = Math.min(amt, rem), left = rem - v;
      // Tagihan bulan ini terbayar (minimal sebesar cicilannya): masuk catatan tepat waktu dan jatuh tempo maju satu bulan.
      const bill = !!d.due && (v >= dueAmount(d) * 0.99 || !left), onTime = bill && daysUntil(d.due) >= 0;
      const rows = [[`Sisa ${debtTypeLabel(d)}`, rp(rem), rp(left)]];
      if (bill && left) { const nx = parseIso(d.due); nx.setMonth(nx.getMonth() + 1); rows.push(["Jatuh tempo berikutnya", fmtShortDate(parseIso(d.due)), fmtShortDate(nx)]); }
      return commit({ title: left ? `Catat bayar ${rp(v)}?` : `${debtTypeLabel(d)} lunas?`, rows, note: left ? (bill ? (onTime ? "Tercatat tepat waktu di rapor." : "Tercatat lewat jatuh tempo di rapor.") : "") : "Utang ini akan tercatat lunas.",
        type: left ? "pay" : "paidoff", label: left ? `Bayar ${debtTypeLabel(d)} ${rp(v)}` : `${debtTypeLabel(d)} lunas`, amount: v, step: isShort(d) ? "pendek" : "utang", paths: [`debts.${i}`, "payments"],
        apply: () => {
          if (bill) (S.payments ||= []).push({ type: debtTypeLabel(d), due: d.due, paidAt: isoOf(new Date()), amount: v, onTime });
          d.remaining = left; if (!left) d.paidOff = true; else if (bill) { rollDue(d); if (Number(d.months) > 1) d.months = Number(d.months) - 1; }
        }, msg: left ? `Pembayaran ${rp(v)} dicatat` : `${debtTypeLabel(d)} lunas` });
    }
  }
  catatDlg.addEventListener("click", (e) => {
    if (e.target === catatDlg || e.target.closest("[data-cclose]")) return catatDlg.close();
    const t = e.target.closest("button"); if (!t) return;
    const d = t.dataset;
    if (d.ck) { cat.kind = d.ck; renderCatat(); catatDlg.querySelector("#catat-amt")?.focus(); return; }
    if (d.ci) { cat.i = Number(d.ci); cat.amt = moneyVal("catat-amt"); renderCatat(); return; }
    if (d.cr) { cat.reason = d.cr; cat.amt = moneyVal("catat-amt"); renderCatat(); return; }
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
    if (el.dataset.sim === "setor") { sim.setor = v; res.innerHTML = setoranResult(ms[0].x, v); return; }
    const m = currentStep();
    if (m?.tool === "budget") { sim.minus = { ...(sim.minus || {}), [el.dataset.sim]: v }; const p = cashPlan(m); res.innerHTML = cashResult(m, p.cut, p.hours); }
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
    const pick = nextDemoState();
    if (!pick) return startScenarioDirect();
    S = pick;
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
      render(true);   // tombol simulasi (cek bulanan) butuh ui.config
      const { wallets } = await api("/api/wallets");
      if (wallets.length || S.wallets.length) {
        const m = mergeServerWallets(wallets);
        S.wallets = m.wallets; save(); render(true);
        if (m.lost.some(w => !w._told)) { snack(`Izin ${m.lost.map(w => channelLabel(w.walletId)).join(", ")} berakhir di server. Laju tetap memakai data transaksi terakhir. Hubungkan lagi lewat Profil.`); S.wallets.forEach(w => { if (w.stale) w._told = true; }); save(); }
      }
    } catch (e) { /* server mati: pakai data terakhir yang tersimpan */ }
  }
  boot();
  // ---------- Analisis AI (Gemini lewat /api/analisis) ----------
  function gambarAnalisis(a) {
    const li = (xs) => xs.map(x => `<li>${esc(x)}</li>`).join("");
    const contoh = a._contoh
      ? `<p class="warn">Ini jawaban contoh, bukan dari Gemini. Server belum punya kunci API.</p>` : "";
    return `${contoh}
      <p class="ai-sum">${esc(a.kesimpulan)}</p>
      ${a.peringatan?.length ? `<ul class="ai-warn">${li(a.peringatan)}</ul>` : ""}
      <h3>Yang sudah bagus</h3><ul>${li(a.kekuatan || [])}</ul>
      <h3>Yang perlu diperbaiki</h3>
      <ul class="ai-fix">${(a.perbaikan || []).map(p => `<li><a href="#/langkah/${esc(p.langkahId)}"><b>${esc(p.judul)}</b></a><span>${esc(p.alasan)}</span></li>`).join("")}</ul>
      <h3>30 hari ke depan</h3><ol>${li(a.prioritas30Hari || [])}</ol>`;
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("#aiGo");
    if (!b) return;
    const out = document.getElementById("aiOut");
    const semula = b.textContent;
    b.disabled = true; b.textContent = "Menganalisa…";
    out.innerHTML = "";
    try {
      const r = await api("/api/analisis", {
        method: "POST",
        body: { konteks: buildAIContext(), bahasa: window.LajuI18n?.lang || "id" },
      });
      out.innerHTML = gambarAnalisis(r.analisis);
    } catch (err) {
      out.innerHTML = `<p class="warn">${esc(err.message)}</p>`;
    } finally {
      b.disabled = false; b.textContent = semula;
    }
  });

  boot();
})();
