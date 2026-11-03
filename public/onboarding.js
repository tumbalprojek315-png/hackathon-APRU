/* Laju: wizard onboarding. Butuh core.js dimuat lebih dulu. */
(() => {
  "use strict";

  const STEPS = [
    { id: "akun", label: "Akun" },
    { id: "profil", label: "Profil" },
    { id: "izin", label: "Izin data" },
    { id: "ewallet", label: "E-wallet" },
    { id: "pendapatan", label: "Pendapatan" },
    { id: "pengeluaran", label: "Pengeluaran" },
    { id: "ketahanan", label: "Ketahanan" },
    { id: "hasil", label: "Hasil" },
  ];
  const stepIdx = (id) => STEPS.findIndex(s => s.id === id);
  const ss = {   // sessionStorage bisa diblokir (mode privat): semua akses dibungkus
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } },
  };
  const IZIN = stepIdx("izin"), EW = stepIdx("ewallet");

  // ---------- Step sequence (e-wallet only when chosen) ----------
  const isActive = (i) => STEPS[i].id !== "ewallet" || S.consent.useWallet;
  const seq = () => STEPS.map((_, i) => i).filter(isActive);
  const nextIdx = (i) => { for (let j = i + 1; j < STEPS.length; j++) if (isActive(j)) return j; return i; };
  const prevIdx = (i) => { for (let j = i - 1; j >= 0; j--) if (isActive(j)) return j; return i; };

  // ---------- Opsi buatan sendiri ("+ Lainnya" → ketik → Enter → muncul opsi baru) ----------
  const ADDERS = {
    platform: { list: "profile.customPlatforms", sel: () => "profile.platforms", multi: true, toId: n => "c:" + n, builtin: n => PLATFORMS.find(x => norm(x.label) === norm(n))?.id, label: "Nama aplikasi lain", ph: "misal: Borzo", note: "Tersimpan sebagai Lainnya (nama aplikasi)." },
    side: { list: "profile.customSideJobs", sel: () => "profile.sideJobs", multi: true, toId: n => n, builtin: n => SIDE_JOBS.find(x => norm(x) === norm(n)), label: "Pekerjaan sampingan lain", ph: "misal: Tukang cukur", note: "Tersimpan persis seperti yang Anda ketik." },
    channel: { list: "profile.customChannels", sel: () => "profile.channels", multi: true, toId: n => "c:" + n, builtin: n => closeChannel(n), label: "Jalur lain", ph: "misal: SeaBank, Jago", note: "Tersimpan persis seperti yang Anda ketik." },
    place: { list: "resilience.customPlaces", sel: () => "resilience.places", multi: true, toId: n => n, builtin: n => SAVING_PLACES.find(x => norm(x) === norm(n)), label: "Tempat menyimpan lain", ph: "misal: Celengan", note: "Tersimpan persis seperti yang Anda ketik." },
    debt: { list: "customDebtTypes", sel: (i) => `debts.${i}.type`, multi: false, toId: n => "c:" + n, builtin: n => DEBT_TYPES.find(x => norm(x) === norm(n)), label: "Jenis utang lain", ph: "misal: Gadai", note: "Tersimpan sebagai Lainnya (jenis utang)." },
  };
  // Nama jalur yang salah ketik dicocokkan ke daftar, misal "gopey" jadi GoPay. Selisih paling banyak 1 huruf (2 untuk nama panjang).
  function editDist(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function closeChannel(n) {
    const a = norm(n).replace(/\s+/g, ""); let best = null;
    for (const c of CHANNELS) {
      const b = norm(c.label).replace(/\s+/g, ""), dist = editDist(a, b);
      if (dist === 0) return c.id;
      if (a.length >= 4 && dist <= (b.length > 6 ? 2 : 1) && (!best || dist < best.dist)) best = { id: c.id, dist };
    }
    return best?.id;
  }
  const parseKey = (k) => { const [key, i] = k.split(":"); return { key, i, c: ADDERS[key] }; };
  const safeId = (k) => "add-" + k.replace(":", "-");
  // opsi buatan sendiri: kartu (aplikasi) atau chip (lainnya), selalu dengan tombol ×
  function customOpt(keyFull, name, kind = "chip", extraCls = "") {
    const { i, c } = parseKey(keyFull);
    const control = kind === "opt" ? opt(c.sel(i), c.toId(name), esc(name), "", c.multi) : chip(c.sel(i), c.toId(name), esc(name), c.multi, extraCls);
    return `<span class="${kind}-wrap">${control}<button type="button" class="x-btn" data-remove-custom="${keyFull}" data-name="${esc(name)}" aria-label="Hapus opsi ${esc(name)}">×</button></span>`;
  }
  const adderToggle = (keyFull, kind = "chip") =>
    `<button type="button" class="${kind} add" data-adder-toggle="${keyFull}" aria-expanded="${!!ui.adder[keyFull]}" aria-controls="${safeId(keyFull)}-box">${ICON.plus} Lainnya</button>`;
  function adderRow(keyFull) {
    if (!ui.adder[keyFull]) return "";
    const { c } = parseKey(keyFull), id = safeId(keyFull);
    return `<div class="adder" id="${id}-box">
      <label for="${id}">${c.label}</label>
      <div class="adder-row"><input class="input" id="${id}" data-adder="${keyFull}" placeholder="${c.ph}" maxlength="40" autocomplete="off" enterkeyhint="done"><button type="button" class="btn sm" data-add="${keyFull}">${ICON.plus} Tambah</button></div>
      <p class="hint">Tekan Enter atau Tambah. Anda bisa menambah lebih dari satu. ${c.note}</p>
    </div>`;
  }
  function addCustom(keyFull, { silent = false } = {}) {
    const { key, i, c } = parseKey(keyFull);
    const input = stepEl.querySelector(`[data-adder="${keyFull}"]`); if (!input) return false;
    const name = input.value.trim().replace(/\s+/g, " ").replace(/\./g, "");
    if (!name) { if (!silent) input.focus(); return false; }
    const list = get(c.list);
    const builtinId = c.builtin(name);
    const existing = list.find(x => norm(x) === norm(name));
    if (!builtinId && !existing) list.push(name);
    const id = builtinId || c.toId(existing || name);
    const sel = c.sel(i);
    if (c.multi) { const arr = get(sel); if (!arr.includes(id)) arr.push(id); } else set(sel, id);
    if (key === "debt") ui.adder[keyFull] = false;          // jenis utang hanya satu per baris
    if (!silent) {
      save(); render(true);
      stepEl.querySelector(`[data-adder="${keyFull}"]`)?.focus({ preventScroll: true });
      const known = key === "channel" && builtinId ? channelLabel(builtinId) : null;
      toast(known && norm(known) !== norm(name) ? `"${name}" dikenali sebagai ${known}` : builtinId || existing ? `"${name}" sudah ada, langsung dipilih` : `Opsi baru ditambahkan: ${name}`);
    }
    return true;
  }
  function removeCustom(keyFull, name) {
    const { key, c } = parseKey(keyFull);
    set(c.list, get(c.list).filter(x => x !== name));
    const id = c.toId(name);
    if (key === "platform") { S.profile.platforms = S.profile.platforms.filter(x => x !== id); delete S.income.perPlatform[id]; }
    if (key === "side") S.profile.sideJobs = S.profile.sideJobs.filter(x => x !== id);
    if (key === "place") S.resilience.places = S.resilience.places.filter(x => x !== id);
    if (key === "channel") S.profile.channels = S.profile.channels.filter(x => x !== id);
    if (key === "debt") S.debts.forEach(d => { if (d.type === id) d.type = ""; });
    save(); render(true); toast(`Opsi "${name}" dihapus`);
  }

  function shell(title, desc, body) {
    const sq = seq();
    return `
    <div class="${ui.enter ? "step-enter" : ""}">
      <p class="eyebrow">${ui.edit ? `Profil ${PROFILE_SECTIONS.indexOf(ui.edit.sec) + 1}/${PROFILE_SECTIONS.length} · ${ui.edit.sec.title}${ui.edit.sec.steps.length > 1 ? ` · ${ui.edit.idx + 1}/${ui.edit.sec.steps.length}` : ""}` : `Langkah ${sq.indexOf(S.step) + 1} dari ${sq.length}`}</p>
      <h1 class="step-title">${title}</h1>
      <p class="step-desc">${desc}</p>
      <div class="stack">${body}</div>
    </div>`;
  }

  // ---------- Validation ----------
  function validate(i = S.step) {
    const a = S.account, p = S.profile, c = S.consent, r = S.resilience, inc = S.income;
    const errs = {};
    switch (STEPS[i].id) {
      case "akun":
        if (a.fullName.trim().length < 2) errs.fullName = "Isi nama Anda.";
        if (a.phone.replace(/\D/g, "").length < 9) errs.phone = "Nomor HP minimal 9 digit.";
        if (a.password.length < 8) errs.password = "Password minimal 8 karakter.";
        if (!a.city) errs.city = "Pilih kota tempat Anda paling sering narik.";
        else if (a.city === "Lainnya" && !a.cityOther.trim()) errs.cityOther = "Ketik nama kota Anda.";
        break;
      case "profil":
        if (!p.platforms.length) errs.x = "Pilih minimal satu aplikasi.";
        else if (!p.vehicle) errs.x = "Pilih jenis kendaraan.";
        else if (!p.ownership) errs.x = "Pilih status kepemilikan kendaraan.";
        else if (!p.channels.length) errs.x = "Pilih lewat mana saja uang Anda biasanya masuk dan keluar.";
        else if (!p.recordsIncome) errs.x = "Jawab seberapa sering Anda mencatat pendapatan.";
        break;
      case "izin":
        if (c.useWallet == null) errs.x = "Pilih apakah Anda mau menghubungkan e-wallet.";
        else if (!c.agreeTerms || !c.agreeDataUse) errs.x = "Centang kedua persetujuan untuk lanjut.";
        break;
      case "ewallet":
        if (ui.server === "down") errs.x = "Server Laju belum berjalan, jadi e-wallet belum bisa dihubungkan.";
        else if (!S.wallets.some(w => w.summary)) errs.x = "Hubungkan dan sinkronkan minimal satu e-wallet.";
        if (Object.keys(ui.syncing).length) errs.x = "Tunggu sinkronisasi selesai.";
        break;
      case "pendapatan": {
        const v = volatility();
        if (!p.platforms.some(id => Number(inc.perPlatform[id]) > 0)) errs.x = "Isi pendapatan bersih harian minimal satu aplikasi.";
        else if (!(Number(inc.weekAvg) > 0)) errs.x = "Isi rata-rata pendapatan harian sebulan terakhir.";
        else if (!(Number(inc.best) > 0)) errs.x = "Isi pendapatan hari paling ramai.";
        else if (v.ready && !v.ordered) errs.x = "Rata-rata harus di antara hari paling sepi dan hari paling ramai.";
        break;
      }
      case "pengeluaran": {
        const bad = S.debts.find(d => !d.type || (!(Number(d.remaining) > 0) && !d.paidOff));
        if (bad) errs.x = "Lengkapi jenis dan sisa utang, atau hapus barisnya.";
        break;
      }
      case "ketahanan":
        if (!r.habit) errs.x = "Pilih kebiasaan menabung Anda.";
        else if (!r.shock) errs.x = "Jawab tes guncangan.";
        else if (!r.goals.length) errs.x = "Pilih minimal satu tujuan keuangan.";
        else if (!r.primaryGoal) errs.x = "Pilih tujuan yang paling penting sekarang.";
        else if (r.wantsBankLoan == null) errs.x = "Jawab rencana pinjaman resmi (boleh pilih Belum).";
        break;
      case "hasil":
        if (ui.analysisIdx < ANALYSIS.length) errs.x = "Laju masih menghitung data…";
        break;
    }
    return errs;
  }

  // ---------- Steps ----------
  const R = {};

  R.akun = () => {
    const e = ui.showErrors ? validate() : {};
    const a = S.account;
    return shell("Buat akun Laju Anda", "Tanpa KTP. Laju tidak pernah meminta PIN atau password aplikasi ojek Anda.",
      card("Identitas dasar", "", `
        <div class="grid2">
          ${field("fullName", "Nama lengkap", textInput("account.fullName", { id: "fullName", placeholder: "Nama sesuai panggilan sehari-hari", invalid: !!e.fullName, extra: 'autocomplete="name"' }), "", e.fullName)}
          ${field("phone", "Nomor HP (WhatsApp)", textInput("account.phone", { id: "phone", type: "tel", placeholder: "08xxxxxxxxxx", invalid: !!e.phone, extra: 'autocomplete="tel" inputmode="tel"' }), "", e.phone)}
          ${ui.edit ? "" : field("password", "Password", `<div class="input-wrap">${textInput("account.password", { id: "password", type: ui.showPw ? "text" : "password", placeholder: "••••••••", invalid: !!e.password, extra: 'autocomplete="new-password"' })}<button type="button" data-action="togglePw" aria-label="${ui.showPw ? "Sembunyikan" : "Tampilkan"} password">${ui.showPw ? ICON.eyeOff : ICON.eye}</button></div>`, "Minimal 8 karakter.", e.password)}
        </div>
        <div class="combo" data-combo>
          <label for="city">Kota utama narik</label>
          <div class="combo-box">
            ${ICON.search}
            <input class="input" id="city" type="text" role="combobox" aria-expanded="false" aria-controls="city-list" aria-autocomplete="list" autocomplete="off" placeholder="Cari dari ${CITIES.length} kota, misal: Pekanbaru" value="${esc(a.city ? cityLabel() : "")}" data-combo-input aria-invalid="${!!e.city}" ${e.city ? 'aria-describedby="city-err"' : 'aria-describedby="city-hint"'}>
            <button type="button" class="chev" data-combo-toggle tabindex="-1" aria-label="Tampilkan semua kota">${ICON.chev}</button>
          </div>
          <ul class="combo-list" id="city-list" role="listbox" aria-label="Daftar kota" hidden></ul>
          ${e.city ? `<span class="err" id="city-err">${e.city}</span>` : `<span class="hint" id="city-hint">Urut A–Z. Ketik nama kota atau provinsi untuk mencari.</span>`}
        </div>
        ${a.city === "Lainnya" ? otherIn("account.cityOther", "cityOther", "Nama kota / kabupaten Anda", "misal: Siak, Kampar, Bengkalis", "lainnya", !!e.cityOther) : ""}
      `, "part-identitas") +
      (ui.edit ? "" : `<p class="hint login-hint">Sudah punya akun? <a href="masuk.html">Masuk</a></p>`) +
      card("", "", `<div style="display:flex;gap:14px;align-items:flex-start">${ICON.shield}<p style="font-size:.9rem;line-height:1.55"><strong>Laju bukan aplikasi pinjaman.</strong> Kami tidak menjual data Anda. Semua data hanya dipakai untuk menyusun gambaran keuangan Anda sendiri, dan Anda bisa menghapusnya kapan saja.</p></div>`, "peach part-intro")
    );
  };

  R.profil = () => {
    const p = S.profile;
    return shell("Profil Anda", "Cara Anda narik menentukan pola pendapatan.",
      card("Aplikasi yang Anda pakai", "Boleh pilih lebih dari satu.", `
        <div class="optgrid">${PLATFORMS.map(x => opt("profile.platforms", x.id, x.label, "", true)).join("")}${p.customPlatforms.map(n => customOpt("platform", n, "opt")).join("")}${adderToggle("platform", "opt")}</div>
        ${adderRow("platform")}`, "part-aplikasi") +
      card("Kendaraan", "", `
        <div class="optgrid">${opt("profile.vehicle", "motor", "Motor")}${opt("profile.vehicle", "mobil", "Mobil")}</div>
        <div class="field"><span class="lbl">Status kepemilikan</span><div class="chips">${OWNERSHIP.map(o => chip("profile.ownership", o.id, o.label, false)).join("")}</div></div>`, "part-kendaraan") +
      card("Ritme kerja", "", `
        <div class="grid2">
          <div class="field"><label for="hours">Jam narik per hari: <output class="num" data-out="profile.hoursPerDay">${p.hoursPerDay}</output> jam</label>${range("profile.hoursPerDay", "hours", 1, 24, 1, "Jam narik per hari")}<div class="range-ends"><span>1 jam</span><span>24 jam</span></div></div>
          <div class="field"><label for="days">Hari narik per minggu: <output class="num" data-out="profile.daysPerWeek">${p.daysPerWeek}</output> hari</label>${range("profile.daysPerWeek", "days", 1, 7, 1, "Hari narik per minggu")}<div class="range-ends"><span>1 hari</span><span>7 hari</span></div></div>
        </div>
        ${field("area", "Area utama narik", textInput("profile.area", { id: "area", placeholder: "misal: Panam, Sudirman, Bandara SSK II" }), "Opsional.")}`, "part-ritme") +
      card("Keluarga & tanggungan", "", `
        <div class="field"><span class="lbl" id="dep-lbl">Jumlah orang yang Anda tanggung</span>
          <div class="counter" role="group" aria-labelledby="dep-lbl"><button type="button" data-inc="profile.dependents" data-d="-1" aria-label="Kurangi">−</button><output class="num">${p.dependents}</output><button type="button" data-inc="profile.dependents" data-d="1" aria-label="Tambah">+</button></div>
          <span class="hint">Pasangan, anak, orang tua yang Anda biayai.</span></div>
        <div class="field"><span class="lbl">Ada pekerjaan / pemasukan sampingan?</span><div class="chips">${SIDE_JOBS.map(j => chip("profile.sideJobs", j, j)).join("")}${p.customSideJobs.map(n => customOpt("side", n)).join("")}${adderToggle("side")}</div></div>
        ${adderRow("side")}`, "part-keluarga") +
      card("Uang & rekening", "", `
        <div class="toggle-row"><div><b>Punya rekening bank aktif</b><small>Untuk pencatatan & pengajuan kredit nanti</small></div>${sw("profile.hasBank", "Punya rekening bank aktif")}</div>
        <div class="field"><span class="lbl">Uang Anda biasanya masuk & keluar lewat mana saja?</span><span class="hint">Boleh pilih beberapa.</span>
          <div class="chips">${CHANNELS.map(ch => chip("profile.channels", ch.id, ch.label)).join("")}${p.customChannels.map(n => customOpt("channel", n)).join("")}${adderToggle("channel")}</div>
          ${channelSuggest()}${payoutQuestions()}</div>
        ${adderRow("channel")}`, "part-uang") +
      card("Proteksi", "", `
        ${[["hasBpjsKes", "BPJS Kesehatan aktif", "Bantalan termurah saat sakit"], ["hasBpjsKet", "BPJS Ketenagakerjaan aktif", "Perlindungan kecelakaan kerja"], ["hasInsurance", "Asuransi lain", "Asuransi kendaraan, jiwa, atau mikro"]]
          .map(([k, l, h]) => `<div class="toggle-row"><div><b>${l}</b><small>${h}</small></div>${sw("profile." + k, l)}</div>`).join("")}`, "part-proteksi") +
      card("Seberapa sering Anda catat pendapatan?", "", `
        <div class="grid3">${RECORDS.map(o => opt("profile.recordsIncome", o.id, o.label)).join("")}</div>`, "part-awal")
    );
  };

  // Dompet buatan sendiri (Lainnya) tidak bisa dihubungkan. Tanya apakah pencairan narik masuk ke sana (Kasus C1).
  function payoutQuestions() {
    const p = S.profile, names = p.customChannels.filter(n => p.channels.includes("c:" + n));
    return names.map(n => `<div class="payout-q">
      <p><b>${esc(n)}</b> belum bisa dihubungkan ke Laju. Apakah pencairan narik Anda masuk ke sini?</p>
      <div class="chips">${chip(`profile.payoutTo.${n}`, "ya", "Ya", false)}${chip(`profile.payoutTo.${n}`, "tidak", "Tidak, untuk belanja saja", false)}</div>
      ${p.payoutTo?.[n] === "ya" ? `<p class="hint">Pencairan di ${esc(n)} belum terbaca. Hubungkan rekening bank kalau pencairan juga masuk ke sana, atau isi pendapatannya manual. Status data untuk bank paling tinggi Tier 2.</p>` : ""}
    </div>`).join("");
  }

  // Tebakan awal jalur uang dari aplikasi yang dipakai (hanya saran; pengguna yang memilih).
  function channelSuggest() {
    const sug = [...new Set(S.profile.platforms.map(id => PLATFORM_WALLET[id]).filter(Boolean))].filter(id => !S.profile.channels.includes(id));
    return sug.length ? `<p class="hint">Saran dari aplikasi Anda: ${sug.map(channelLabel).join(", ")}. <button type="button" class="link-btn inline" data-action="suggestChannels">Pilih saran</button></p>` : "";
  }

  // Isian manual selalu dipakai. Di sini pengguna hanya memilih: hubungkan e-wallet atau tidak.
  R.izin = () => {
    const c = S.consent;
    const pick = (val, title, caption) => `<button type="button" class="opt single" aria-pressed="${c.useWallet === (val === "ya")}" data-action="walletChoice" data-id="${val}">
      <span class="box">${ICON.check}</span><span><b>${title}</b><small>${caption}</small></span></button>`;
    return shell("Hubungkan e-wallet?", "Data yang Anda isi sendiri selalu dipakai. E-wallet menjadi buktinya.", `
      ${card("Kalau e-wallet dihubungkan", "", `
        <ul class="check-list">
          <li><span aria-hidden="true">✓</span><span>Riwayat transaksi 6 bulan otomatis terbaca & dikategorikan</span></li>
          <li><span aria-hidden="true">✓</span><span>Data berstatus <strong>Terverifikasi</strong>, bisa jadi bukti penghasilan</span></li>
          <li><span aria-hidden="true">✓</span><span>Akses hanya baca lewat ${providerName()}. Tidak bisa memindahkan uang Anda</span></li>
        </ul>
        <div class="grid2">
          ${pick("ya", "Ya, hubungkan", "Disarankan")}
          ${pick("tidak", "Tidak sekarang", "Bisa dihubungkan nanti lewat Profil")}
        </div>
        ${c.useWallet === false ? `<div class="note accent">${ICON.info}<span>Tanpa e-wallet, data berlabel belum terverifikasi dan laporan untuk bank terkunci.</span></div>` : ""}`)}
      ${card("Persetujuan penggunaan data", "Centang keduanya untuk lanjut.", `
        ${checkbox("consent.agreeTerms", "Saya setuju dengan <strong>Syarat Layanan</strong> Laju dan mengerti Laju bukan pemberi pinjaman.")}
        ${checkbox("consent.agreeDataUse", "Saya izinkan data saya diproses <strong>hanya untuk analisis keuangan pribadi saya</strong>. Data tidak dibagikan ke pihak lain tanpa izin baru dari saya, termasuk ke bank.")}
        <div class="note">${ICON.shield}<span>Izin bisa dicabut dan data dihapus kapan saja.</span></div>`)}
    `);
  };

  R.ewallet = () => {
    if (!S.consent.useWallet) {
      return shell("E-wallet tidak dipilih", "Anda memilih tidak menghubungkan e-wallet, jadi langkah ini dilewati.",
        card("", "", `<p style="font-size:.9rem">Mau hubungkan sekarang supaya pendapatan Anda terverifikasi?</p><div><button type="button" class="btn sm" data-action="enableWallet">Ya, hubungkan e-wallet</button></div>`));
    }
    const agg = aggregate();
    const banner = ui.server === "down"
      ? `<div class="note danger" role="alert">${ICON.alert}<span><strong>Server Laju belum berjalan.</strong> Menghubungkan e-wallet butuh server Laju yang sedang berjalan. Jalankan <code>python server.py</code> di folder <code>laju</code>, lalu muat ulang halaman ini.</span></div>`
      : ui.config?.mode === "simulasi"
        ? `<div class="note"><span class="tag lime">Simulasi</span><span>Transaksi dibuat server Laju untuk uji coba.</span></div>`
        : "";
    const err = ui.walletError ? `<div class="note danger" role="alert">${ICON.alert}<span>${esc(ui.walletError)}</span></div>` : "";
    return shell("Hubungkan e-wallet untuk verifikasi", "Transaksi e-wallet membuktikan isian Anda.", `
      ${banner}${err}
      ${agg.count ? `<div class="statrow">
        ${stat("E-wallet", `${agg.count} / ${WALLETS.filter(m => S.profile.channels.includes(m.id)).length}`, "dark", "pilihan Anda terhubung")}
        ${stat("Pencairan aplikasi", rp(agg.incomePlatform), "", `${agg.activeDays} hari narik`)}
        ${stat("Keluar non-tunai", rp(agg.expenseTotal + agg.debtPayments), "", "30 hari terakhir")}
      </div>` : ""}
      ${walletGrid()}
      ${offlineCard()}
      ${!agg.count && !Object.keys(ui.syncing).length ? `<div class="note">${ICON.info}<span><button type="button" class="link-btn inline" data-action="skipWallet">Lanjut tanpa e-wallet</button></span></div>` : ""}
      ${agg.count ? breakdown(agg) : ""}
      <div class="note">${ICON.shield}<span>Laju tidak pernah meminta PIN atau OTP. Akses hanya-baca.</span></div>
    `);
  };

  // E-wallet yang dicentang di Profil vs yang sudah terhubung (untuk "1/3" dan pengingat yang belum)
  function walletProgress() {
    const ch = S.profile.channels || [];
    const chosen = WALLETS.filter(m => ch.includes(m.id)).map(m => m.id);
    const conn = chosen.filter(id => S.wallets.some(w => w.walletId === id && w.summary));
    return { chosen, conn, missing: chosen.filter(id => !conn.includes(id)), partial: conn.length > 0 && conn.length < chosen.length };
  }

  // Hanya e-wallet yang dicentang di Profil ("lewat mana saja") yang ditampilkan dan bisa dihubungkan.
  function walletGrid() {
    const ch = S.profile.channels || [];
    const mine = WALLETS.filter(m => ch.includes(m.id));
    if (!mine.length) return `<div class="note accent">${ICON.info}<span>Belum ada e-wallet yang dicentang di Profil. <button type="button" class="link-btn inline" data-action="gotoUang">Pilih e-wallet di Profil</button></span></div>`;
    return `<p class="hint">Dari pilihan Anda di Profil. <button type="button" class="link-btn inline" data-action="gotoUang">Ubah</button></p>
      <div class="wallet-grid">${mine.map(walletCard).join("")}</div>`;
  }

  // Semua jalur uang yang tidak bisa dihubungkan (dompet Lainnya, tunai) dikumpulkan di satu kartu,
  // plus aplikasi yang pencairannya tidak terlihat di e-wallet mana pun.
  function offlineCard() {
    const p = S.profile, ch = p.channels || [];
    const rows = ch.filter(id => !WALLETS.some(w => w.id === id)).map(id => {
      const name = id.startsWith("c:") ? id.slice(2) : null, pay = name && p.payoutTo?.[name];
      const sub = !name ? "Dicatat manual di Pendapatan dan Pengeluaran."
        : pay === "ya" ? "Pencairan masuk ke sini. Isi pendapatannya manual."
        : pay === "tidak" ? "Untuk belanja. Dicatat manual."
        : "Belum didukung penyedia. Dicatat manual.";
      return `<li><b>${esc(channelLabel(id))}</b><small>${sub}</small></li>`;
    });
    const gaps = payoutGaps().filter(g => !g.wallet).map(g => (isCustom(g.platform) ? g.platform.slice(2) : platformName(g.platform)));
    if (!rows.length && !gaps.length) return "";
    return card("Tidak bisa dihubungkan", "", `
      ${rows.length ? `<ul class="offline-list">${rows.join("")}</ul>` : ""}
      ${gaps.length ? `<p class="hint">Pencairan ${esc(gaps.join(", "))} belum terlihat di e-wallet yang terhubung.</p>` : ""}
      <p class="hint"><button type="button" class="link-btn inline" data-action="gotoUang">Ubah di Profil</button></p>`, "offline-card");
  }

  const walletLogo = (m) => `<span class="wallet-logo img" aria-hidden="true"><img src="${m.logo}" alt="" width="56" height="24" decoding="async"></span>`;

  function walletCard(m) {
    const w = S.wallets.find(x => x.walletId === m.id);
    const supported = !ui.config || ui.config.supportedWallets.includes(m.id);
    const syncIdx = ui.syncing[m.id];
    const state = syncIdx != null ? "sync" : !supported ? "unsupported" : w?.summary ? "ok" : w ? "linked" : "idle";
    const open = state === "ok" && ui.openTx === m.id;
    const logo = walletLogo(m);
    const tag = { ok: w?.stale ? '<span class="tag warn">Data terakhir</span>' : '<span class="tag ok">Terverifikasi</span>', linked: '<span class="tag warn">Belum sinkron</span>', sync: '<span class="tag lime">Sinkron…</span>', unsupported: '<span class="tag warn">Belum didukung</span>', idle: "" }[state];
    const sub = state === "idle" || state === "unsupported" ? `Biasa untuk ${m.hint}` : `${esc(w?.accountRef || "")}${w?.syncedAt ? ` · ${relTime(w.syncedAt)}` : ""}`;
    let body = "";
    if (state === "idle") {
      body = `<button type="button" class="btn secondary sm block" data-action="connect" data-id="${m.id}" ${ui.server !== "ok" ? "disabled" : ""}>Hubungkan ${m.label}</button>`;
    } else if (state === "unsupported") {
      body = `<p class="hint">Penyedia open finance yang dipakai belum mendukung ${m.label}.</p>`;
    } else if (state === "sync") {
      body = `<ul class="checklist small" aria-live="polite">${SYNC_STEPS.map((t, i) => `<li class="${i < syncIdx ? "done" : i === syncIdx ? "active" : ""}"><span class="dot">${i < syncIdx ? `<span class="ck">${ICON.check}</span>` : i === syncIdx ? '<span class="spinner" aria-hidden="true"></span>' : ""}</span>${t}</li>`).join("")}</ul>`;
    } else if (state === "linked") {
      body = `<p class="hint">Izin sudah diberikan, riwayat transaksi belum diambil.</p>
        <div class="wactions"><button type="button" class="btn sm" data-action="sync" data-id="${m.id}">Sinkronkan sekarang</button><button type="button" class="icon-btn" data-action="disconnect" data-id="${m.id}" aria-label="Putuskan ${m.label}">${ICON.trash}</button></div>`;
    } else {
      const s = w.summary;
      const plats = Object.entries(s.incomeByPlatform);
      body = `
        <dl class="wstats">
          <div><dt>Pencairan aplikasi</dt><dd class="num">${rp(s.incomePlatform)}</dd></div>
          <div><dt>Pengeluaran</dt><dd class="num">${rp(s.expenseTotal + s.debtPayments)}</dd></div>
          <div><dt>Transaksi</dt><dd class="num">${s.txCount}</dd></div>
        </dl>
        ${plats.length ? `<div class="mini-chips">${plats.map(([k, v]) => `<span class="mini-chip">${esc(platformName(k))} ${rp(v)}</span>`).join("")}</div>` : `<p class="hint">Tidak ada pencairan aplikasi di e-wallet ini. Anda memakainya untuk belanja & tagihan.</p>`}
        ${w.stale ? `<p class="hint">Izin berakhir di server. Angka di atas dari sinkron terakhir${w.syncedAt ? ` (${relTime(w.syncedAt)})` : ""}.</p>` : ""}
        <div class="wactions">
          <button type="button" class="link-btn" data-action="toggleTx" data-id="${m.id}" aria-expanded="${open}">${open ? "Tutup transaksi" : "Lihat transaksi"}</button>
          ${w.stale ? `<button type="button" class="link-btn" data-action="connect" data-id="${m.id}" ${ui.server !== "ok" ? "disabled" : ""}>Hubungkan lagi</button>` : `<button type="button" class="link-btn" data-action="sync" data-id="${m.id}">Sinkron ulang</button>`}
          <button type="button" class="icon-btn" data-action="disconnect" data-id="${m.id}" aria-label="Putuskan ${m.label}">${ICON.trash}</button>
        </div>
        ${open ? txList(w.recent) : ""}`;
    }
    return `<article class="wcard ${state} ${open ? "open" : ""}" aria-label="${m.label}">
      <header class="wcard-head">${logo}<div class="meta"><b>${m.label}</b><small>${sub}</small></div>${tag}</header>
      ${body}
    </article>`;
  }

  function txList(items = []) {
    const kindLabel = (t) => ({
      income_platform: `Pencairan ${platformName(t.platform)}`,
      income_other: "Uang masuk lain",
      internal: "Pindah saldo · tidak dihitung",
      refund: "Refund · tidak dihitung",
      debt: "Cicilan / utang",
    }[t.kind] || categoryLabel(t.category));
    const skip = (t) => t.kind === "internal" || t.kind === "refund";
    return `<ul class="tx-list">${items.slice(0, 15).map(t => `<li class="tx">
        <span class="d">${esc(t.description)}</span>
        <span class="a num ${t.direction === "in" ? "in" : ""} ${skip(t) ? "skip" : ""}">${t.direction === "in" ? "+" : "−"}${rp(t.amount)}</span>
        <span class="m">${new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · ${kindLabel(t)}</span>
      </li>`).join("")}</ul>
      <p class="hint">Menampilkan ${Math.min(15, items.length)} transaksi terbaru. Top up dan tarik saldo antar akun Anda sendiri tidak dihitung sebagai pendapatan atau pengeluaran.</p>`;
  }

  // Kalender 30 hari: tiap tanggal menampilkan uang masuk, arahkan kursor untuk sisa bersih,
  // ketuk untuk rincian hari itu. Ketuk lagi untuk kembali ke total 30 hari.
  const sum = (o) => Object.values(o).reduce((t, v) => t + v, 0);
  const kShort = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt` : `${Math.round(n / 1e3)}rb`);
  const dayName = (iso) => { const d = parseIso(iso); return `${DAYNAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const sign = (n) => (n > 0 ? "+" : "") + rp(n);
  const srcLabel = (k) => (k === "lain" ? "Uang masuk lain" : k === "aplikasi" ? "Pencairan aplikasi" : platformName(k));
  const outLabel = (k) => (k === "utang" ? "Cicilan & utang" : categoryLabel(k));

  function breakdown(agg) {
    const dates = Object.keys(agg.days).sort();
    if (!dates.length) return "";
    if (ui.calDay && !agg.days[ui.calDay]) ui.calDay = null;
    const first = parseIso(dates[0]), last = parseIso(dates[dates.length - 1]);
    const lead = (first.getDay() + 6) % 7, tail = (7 - ((last.getDay() + 6) % 7) - 1);   // minggu dimulai Senin
    const maxIn = Math.max(1, ...dates.map(d => sum(agg.days[d].inc)));
    const focus = ui.calDay || dates[dates.length - 1];
    const cells = [...Array(lead).fill('<span class="mc-pad"></span>'), ...dates.map(iso => {
      const day = agg.days[iso], inc = sum(day.inc), out = sum(day.out), net = inc - out;
      const dn = parseIso(iso).getDate();
      const lvl = inc ? Math.min(4, 1 + Math.floor((inc / maxIn) * 4)) : 0;
      const tip = agg.partialDays ? `Masuk ${rp(inc)}` : `Bersih ${sign(net)}`;
      return `<button type="button" class="mc-day l${lvl} ${net < 0 && !agg.partialDays ? "neg" : ""}" data-action="calDay" data-id="${iso}" data-cday="${iso}" data-tip="${tip}"
        aria-pressed="${ui.calDay === iso}" tabindex="${iso === focus ? 0 : -1}" aria-label="${dayName(iso)}. Masuk ${rp(inc)}${agg.partialDays ? "" : `, keluar ${rp(out)}, bersih ${sign(net)}`}">
        <b>${dn}${dn === 1 || iso === dates[0] ? `<small>${MONTHS[parseIso(iso).getMonth()].slice(0, 3)}</small>` : ""}</b><span>${inc ? kShort(inc) : "-"}</span></button>`;
    }), ...Array(tail).fill('<span class="mc-pad"></span>')].join("");

    // rincian: satu hari yang dipilih, atau gabungan 30 hari
    const pick = ui.calDay ? [ui.calDay] : dates;
    const inc = {}, out = {};
    pick.forEach(d => {
      for (const [k, v] of Object.entries(agg.days[d].inc)) inc[k] = (inc[k] || 0) + v;
      for (const [k, v] of Object.entries(agg.days[d].out)) out[k] = (out[k] || 0) + v;
    });
    const tIn = sum(inc), tOut = sum(out);
    const row = (label, v, max, peach) => `<div class="hrow"><span>${esc(label)}</span><span class="num">${rp(v)}</span><div class="bar ${peach ? "peach" : ""}"><i data-w="${Math.round((v / max) * 100)}"></i></div></div>`;
    const list = (o, lbl, peach) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1]), m = Math.max(1, ...e.map(x => x[1])); return e.map(([k, v]) => row(lbl(k), v, m, peach)).join(""); };

    return card("Rincian dari transaksi terverifikasi", `Gabungan ${agg.count} e-wallet · ${agg.txCount} transaksi · 30 hari terakhir`, `
      <div class="mcal" role="group" aria-label="Kalender uang masuk 30 hari">
        ${["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => `<span class="mc-dow" aria-hidden="true">${d}</span>`).join("")}
        ${cells}
      </div>
      <p class="hint mc-legend"><span><i class="mc-key l1"></i><i class="mc-key l4"></i> makin gelap, makin besar uang masuk</span>${agg.partialDays ? "" : '<span><i class="mc-key neg"></i> keluar lebih besar dari masuk</span>'}</p>
      <div class="mc-detail" aria-live="polite">
        <div class="mc-head"><b>${ui.calDay ? esc(dayName(ui.calDay)) : "Total 30 hari"}</b>${ui.calDay ? `<button type="button" class="link-btn" data-action="calDay" data-id="${ui.calDay}">Lihat 30 hari</button>` : '<span class="hint">Ketuk tanggal untuk rincian harian.</span>'}</div>
        <div class="mc-block">
          <div class="mc-total"><span>Penghasilan</span><b class="num">${rp(tIn)}</b></div>
          ${list(inc, srcLabel) || '<p class="hint">Tidak ada uang masuk.</p>'}
        </div>
        ${agg.partialDays ? (() => {
          const old = S.wallets.filter(w => w.summary && !w.summary.dailyOut), names = (l) => l.map(w => channelLabel(w.walletId)).join(", ");
          const live = old.filter(w => !w.stale), gone = old.filter(w => w.stale);
          return `<div class="ew-partial" role="status">${ICON.info}<span>Pengeluaran per hari belum ada. Data ${esc(names(old))} dari sinkron lama.${gone.length ? ` Hubungkan lagi ${esc(names(gone))} di atas.` : ""}${live.length ? ' <button type="button" class="link-btn inline" data-action="resyncAll">Sinkron ulang sekarang</button>' : ""}</span></div>`;
        })()
          : `<div class="mc-block">
          <div class="mc-total"><span>Pengeluaran</span><b class="num">${rp(-tOut)}</b></div>
          ${list(out, outLabel, true) || '<p class="hint">Tidak ada pengeluaran.</p>'}
        </div>
        <div class="mc-net ${tIn - tOut < 0 ? "neg" : "pos"}"><span>Sisa bersih<small>Penghasilan dikurangi pengeluaran</small></span><b class="num">${sign(tIn - tOut)}</b></div>`}
      </div>
      <p class="hint">${Math.round(agg.categorizedRatio * 100)}% pengeluaran dikenali otomatis. Pindah saldo antar akun sendiri tidak dihitung.</p>`);
  }

  // Kotak verifikasi untuk satu item (diperbarui langsung saat isian berubah lewat data-calc="vf-<key>")
  const vfBox = (c, key) => c.verified ? `<div data-calc="vf-${key}">${verifyLine(c.items.find(i => i.key === key), { interactive: true })}</div>` : "";

  R.pendapatan = () => {
    const p = S.profile, inc = S.income;
    const c = calc(), agg = c.agg, days = p.daysPerWeek * WEEKS;
    const sumDaily = p.platforms.reduce((s, id) => s + (Number(inc.perPlatform[id]) || 0), 0);
    const wHint = (id) => {
      if (!c.verified) return "";
      const w = verifiedFor(id, agg);
      return w ? `E-wallet: ±${rp(Math.round(w / days / 1000) * 1000)}/hari. Isi total termasuk tunai.` : "Tidak ada di e-wallet. Isi perkiraan Anda.";
    };
    const daysW = agg.daily.filter(v => v > 0);
    return shell("Menurut Anda, berapa pendapatan Anda?", c.verified
      ? "Isi total, tunai maupun non-tunai. Laju mencocokkannya dengan e-wallet."
      : "Isi perkiraan yang paling sering terjadi, termasuk tunai.", `
      <div class="grid3">${stat("Dari aplikasi / bulan", rp(c.appIncome), "dark", `${p.daysPerWeek} hari × ${String(WEEKS).replace(".", ",")} minggu`, "appIncome")}${stat("Di luar ojol / bulan", rp(inc.other), "", "", "other")}${stat("Total / bulan", rp(c.income), "", c.verified ? `${Math.round(c.shareIn * 100)}% terverifikasi` : "isian sendiri", "income")}</div>
      ${card("Pendapatan bersih per aplikasi", "Setelah potong komisi, sebelum bensin. Termasuk tunai.",
        `${c.verified ? verifiedPlatformNote() : ""}<div class="grid2">${p.platforms.map((id, k) => field("inc-" + k, `${esc(platformName(id))}: rata-rata bersih per hari`, money("income.perPlatform." + id, "inc-" + k, "150.000"), wHint(id))).join("")}</div>`)}
      ${card("Tambahan dari aplikasi", "",
        `<div class="grid2">${field("bonus", "Bonus / insentif per bulan", money("income.bonus", "bonus"))}${field("tips", "Tip penumpang per bulan", money("income.tips", "tips"), "Tunai maupun lewat aplikasi.")}</div>
         ${vfBox(c, "inc:app")}`)}
      ${card("Pendapatan di luar ojol", "Warung, jualan online, gaji pasangan.",
        `${sideJobsList().length ? `<p class="hint">Dari profil: ${sideJobsList().map(esc).join(", ")}</p>` : ""}${field("other", "Total pemasukan lain per bulan", money("income.other", "other"), "Kosongkan kalau tidak ada.")}
         ${vfBox(c, "inc:other")}`)}
      ${card("Pendapatan harian sebulan terakhir", "Total semua aplikasi, termasuk tunai.", `
        ${c.verified && daysW.length >= 5 ? `<div class="note">${ICON.badge}<span>E-wallet per hari: rata-rata ${rpShort(daysW.reduce((s, v) => s + v, 0) / daysW.length)}, ramai ${rpShort(Math.max(...daysW))}, sepi ${rpShort(Math.min(...daysW))}. Belum termasuk tunai.</span></div>` : ""}
        <div class="grid3">
          ${field("weekAvg", "Rata-rata per hari", money("income.weekAvg", "weekAvg", "185.000"), sumDaily ? `Isian per aplikasi: ${rp(sumDaily)}/hari. <button type="button" class="link-btn inline" data-action="useSum">Samakan</button>` : "")}
          ${field("best", "Hari paling ramai", money("income.best", "best", "280.000"))}
          ${field("worst", "Hari paling sepi", money("income.worst", "worst", "90.000"))}
        </div>
        <div data-calc="volbox">${volBox()}</div>`)}
    `);
  };

  function volBox() {
    const v = volatility();
    if (!v.ready) return `<div class="vol"><p class="vol-result">Isi rata-rata dan hari paling ramai. Hasil hitungan muncul di sini.</p></div>`;
    if (!v.ordered) return `<div class="vol"><p class="vol-result"><strong>Angkanya belum urut.</strong> Rata-rata harus di antara hari paling sepi (${rp(v.w)}) dan hari paling ramai (${rp(v.b)}).</p></div>`;
    const max = v.b * 1.06, x = (n) => (n / max) * 100;
    const advice = { stabil: "Anggaran harian aman.", naikturun: "Sisihkan dari hari ramai untuk hari sepi.", fluktuatif: "Atur uang per minggu." }[v.id];
    const vv = verifiedCv(aggregate());
    return `<div class="vol">
      <div class="kv"><span>Hasil hitungan Laju</span>${statusPill(v.st, v.label)}</div>
      <div class="vol-scale" role="img" aria-label="Hari paling sepi ${rp(v.w)}, rata-rata ${rp(v.a)}, hari paling ramai ${rp(v.b)}">
        <span class="rail"></span><span class="span" style="left:${x(v.w)}%;width:${x(v.b) - x(v.w)}%"></span>
        <span class="pt" style="left:${x(v.w)}%"></span><span class="pt avg" style="left:${x(v.a)}%"></span><span class="pt" style="left:${x(v.b)}%"></span>
      </div>
      <div class="vol-legend"><span>Paling sepi<b class="num">${rp(v.w)}</b></span><span>Rata-rata<b class="num">${rp(v.a)}</b></span><span>Paling ramai<b class="num">${rp(v.b)}</b></span></div>
      <p class="vol-result">Naik-turun sekitar <strong>${rp(Math.round(v.sigma / 1000) * 1000)}</strong> per hari. ${advice}</p>
      ${vv != null ? `<p class="hint">Dari transaksi e-wallet 30 hari terakhir: ±${pct(vv)}.</p>` : ""}
    </div>`;
  }

  const sideJobsList = () => S.profile.sideJobs;

  function verifiedPlatformNote() {
    const missing = Object.keys(aggregate().byPlatform).filter(k => k !== "lainnya" && PLATFORMS.some(p => p.id === k) && !S.profile.platforms.includes(k));
    if (!missing.length) return "";
    return `<div class="note accent">${ICON.info}<span>Ada pencairan <strong>${missing.map(platformName).join(", ")}</strong> di e-wallet. ${missing.map(k => `<button type="button" class="link-btn inline" data-action="addPlatform" data-id="${k}">Tambahkan ${platformName(k)}</button>`).join(" ")}</span></div>`;
  }

  R.pengeluaran = () => {
    const c = calc(), agg = c.agg;
    const catRow = (cat) => {
      const e = S.expenses[cat.id];
      const pa = (e.min / EXP_MAX) * 100, pb = (e.max / EXP_MAX) * 100;
      return `<div class="cat ${e.on ? "" : "off"}">
        <div class="cat-head"><div><b>${cat.label}</b>${e.on ? "" : "<small>Tidak dihitung</small>"}${c.verified && agg.byCategory[cat.id] ? `<span class="verified-amt num">${ICON.badge} Tercatat di e-wallet: ${rp(agg.byCategory[cat.id])}</span>` : ""}</div>${sw(`expenses.${cat.id}.on`, cat.label)}</div>
        <div class="cat-range">
          <div class="dual" style="--a:${pa}%;--b:${pb}%">
            <div class="dual-track"><div class="dual-fill"></div></div>
            <input type="range" data-thumb="min" min="0" max="${EXP_MAX}" step="${EXP_STEP}" value="${e.min}" data-bind="expenses.${cat.id}.min" data-kind="num" aria-label="${esc(cat.label)}, paling sedikit per bulan" aria-valuetext="${rp(e.min)}" style="z-index:${e.min > EXP_MAX * 0.9 ? 3 : 1}">
            <input type="range" data-thumb="max" min="0" max="${EXP_MAX}" step="${EXP_STEP}" value="${e.max}" data-bind="expenses.${cat.id}.max" data-kind="num" aria-label="${esc(cat.label)}, paling banyak per bulan" aria-valuetext="${rp(e.max)}" style="z-index:2">
          </div>
          <div class="dual-ends"><span>Rp0</span><span>Rp5 juta</span></div>
          <p class="dual-val num" data-calc="cat-${cat.id}">(${rp(e.min)} - ${rp(e.max)})</p>
        </div>
        ${vfBox(c, `exp:${cat.id}`)}</div>`;
    };
    const debtRow = (d, i) => `<div class="debt">
      <div class="debt-top"><b>Utang ${i + 1}</b><button type="button" class="ghost-btn" data-action="removeDebt" data-id="${i}" aria-label="Hapus utang ${i + 1}">${ICON.trash} Hapus</button></div>
      <div class="field"><span class="lbl">Jenis utang</span><div class="chips">${DEBT_TYPES.map(t => chip(`debts.${i}.type`, t, t, false, HIGH_COST.includes(t) ? "peach" : "")).join("")}${S.customDebtTypes.map(n => customOpt(`debt:${i}`, n)).join("")}${adderToggle(`debt:${i}`)}</div></div>
      ${adderRow(`debt:${i}`)}
      <div class="grid2">
        ${field(`dr-${i}`, "Sisa total utang", money(`debts.${i}.remaining`, `dr-${i}`))}
        ${field(`dm-${i}`, "Sisa cicilan (bulan)", textInput(`debts.${i}.months`, { id: `dm-${i}`, kind: "int", placeholder: "misal: 10", extra: 'inputmode="numeric"' }), Number(d.months) > 0 ? "" : "Kalau kosong, Laju menganggap 12 bulan.")}
        ${field(`di-${i}`, "Besar bunga (% per bulan)", textInput(`debts.${i}.rate`, { id: `di-${i}`, kind: "dec", placeholder: "misal: 3", extra: 'inputmode="decimal"' }), "Kalau tidak tahu, kosongkan.")}
        ${field(`dd-${i}`, "Tanggal jatuh tempo berikutnya", `<button type="button" class="input date-btn" id="dd-${i}" data-date="debts.${i}.due" aria-haspopup="dialog">${d.due ? `<span class="num">${fmtDate(d.due)}</span>` : '<span class="ph">Pilih tanggal</span>'}${ICON.calendar}</button>`, "Format hari/bulan/tahun.")}
      </div></div>`;
    const unknown = c.verified ? agg.byCategory.lainnya || 0 : 0;
    return shell("Ke mana uang Anda pergi?", "Titik kiri = bulan hemat, titik kanan = bulan boros. Tunai dan non-tunai.", `
      ${c.verified ? `<div class="note">${ICON.badge}<span>Angka e-wallet di tiap kategori dipakai untuk mengecek isian Anda.${unknown ? ` ${rpShort(unknown)} transaksi belum dikenali.` : ""}</span></div>` : ""}
      <div class="grid3 part-belanja">${stat("Perkiraan terendah / bulan", rp(c.expMin), "", "", "expMin")}${stat("Perkiraan tertinggi / bulan", rp(c.expMax), "dark", "", "expMax")}${stat("Kategori aktif", String(c.activeCount), "", "", "activeCount")}</div>
      ${EXPENSE_GROUPS.map(g => card(g.label, g.caption, `<div style="display:flex;flex-direction:column;gap:10px">${EXPENSE_CATEGORIES.filter(x => x.group === g.id).map(catRow).join("")}</div>`, "part-belanja")).join("")}
      ${card("Utang & cicilan", "", `
        ${vehicleLoanPrompt(c)}
        ${S.debts.length ? S.debts.map(debtRow).join("") : `<p class="hint">Belum ada utang yang dicatat. Kalau tidak ada, tekan Lanjut.</p>`}
        <div><button type="button" class="btn secondary sm" data-action="addDebt">${ICON.plus} Tambah utang</button></div>
        <p class="hint num" data-calc="debtLine">${debtLineText(c)}</p>
        ${vfBox(c, "debt")}`, "part-utang")}
    `);
  };
  // Kasus E1: lebih aman menganggap cicilan kendaraan ada daripada menganggap tidak ada.
  function vehicleLoanPrompt(c) {
    if (S.profile.ownership !== "kredit" || c.debtWallet > 0) return "";
    if (S.debts.some(d => /cicilan|leasing|kendaraan|motor|mobil|finance/i.test(debtTypeLabel(d)))) return "";
    const v = S.profile.vehicle === "mobil" ? "mobil" : "motor";
    return `<div class="ew-partial" role="status">${ICON.info}<span>Status ${v} Anda <b>Kredit</b>, tapi belum ada cicilan ${v} di daftar ini. Dibayar tunai di kantor leasing atau dari rekening lain tetap dicatat di sini.
      <span class="chips" style="margin-top:8px"><button type="button" class="chip" data-action="addVehicleLoan">${ICON.plus} Tambah cicilan ${v}</button><button type="button" class="chip" data-action="vehiclePaid">Sudah lunas</button></span></span></div>`;
  }
  const debtLineText = (c) => !c.debtMonthly ? ""
    : c.debtMonthly > c.debtListed ? `Cicilan dihitung <strong>${rp(c.debtMonthly)}</strong>/bln dari e-wallet (daftar baru ${rpShort(c.debtListed)}).`
    : `Total cicilan: <strong>${rp(c.debtMonthly)}</strong>/bln`;

  R.ketahanan = () => {
    const r = S.resilience;
    return shell("Seberapa kuat Anda saat ada guncangan?", "Jawab apa adanya.", `
      ${card("Kebiasaan menabung", "", `
        ${field("msave", "Rata-rata disisihkan per bulan", money("resilience.monthlySave", "msave"))}
        <div class="field"><span class="lbl">Kebiasaan menabung Anda</span><div class="grid3">${HABITS.map(h => opt("resilience.habit", h.id, h.label)).join("")}</div></div>`, "part-awal")}
      ${card("Uang disimpan di mana saja?", "", `
        <div class="chips">${SAVING_PLACES.map(x => chip("resilience.places", x, x)).join("")}${r.customPlaces.map(n => customOpt("place", n)).join("")}${adderToggle("place")}</div>
        ${adderRow("place")}`, "part-simpan")}
      ${card("Kalau besok butuh Rp1 juta mendadak?", "", `
        <div class="grid2">${SHOCK.map(s => opt("resilience.shock", s.id, s.label)).join("")}</div>`, "part-awal")}
      ${card("Tujuan keuangan Anda", "", `
        <div class="field"><span class="lbl">Apa saja yang ingin Anda capai?</span><span class="hint">Bisa pilih beberapa</span><div class="grid2">${GOALS.map(g => opt("resilience.goals", g.id, g.label, "", true)).join("")}</div></div>
        ${r.goals.length ? `<div class="field"><span class="lbl">Mana yang paling penting sekarang?</span><div class="chips">${r.goals.map(id => chip("resilience.primaryGoal", id, GOALS.find(g => g.id === id).label, false, "peach")).join("")}</div></div>` : ""}
        <div class="grid2">
          <div class="field"><label for="horizon">Target waktu: <output class="num" data-out="resilience.horizon">${r.horizon}</output> bulan</label>${range("resilience.horizon", "horizon", 3, 60, 3, "Target waktu dalam bulan")}</div>
          ${field("gamt", "Perlu dana berapa untuk tujuan utama?", money("resilience.goalAmount", "gamt"), "Opsional.")}
        </div>
        <div class="field"><span class="lbl">Berencana mengajukan pinjaman ke bank atau koperasi resmi dalam 12 bulan ke depan?</span>
          <span class="hint">Contoh: KUR untuk modal usaha. Bunganya jauh di bawah pinjol.</span>
          <div class="grid2">${opt("resilience.wantsBankLoan", "true", "Ya, dalam 12 bulan", `Laju siapkan laporan untuk bank.${S.consent.useWallet ? "" : " Perlu e-wallet."}`)}${opt("resilience.wantsBankLoan", "false", "Belum", "Benahi utang dulu")}</div></div>`, "part-tujuan")}
      ${savingsCard()}
    `);
  };

  // Tabungan dipisah dua, dengan nama yang sama seperti di menu + Catat:
  // Dana darurat (setor / ambil) dan Tabungan tujuan (setor ke tujuan, hanya untuk tujuan yang butuh dana).
  function savingsCard() {
    const r = S.resilience, goal = GOALS.find(g => g.id === r.primaryGoal);
    const pot = goal && (GOAL_STEPS[r.primaryGoal] || GOAL_STEPS[""]).kind === "pot";
    return card("Tabungan Anda", "Laju memisahkan tabungan jadi dua. Saldonya berubah saat Anda mencatat setoran atau pengambilan di menu + Catat.", `
      ${field("sav", "Dana darurat (uang cadangan)", money("resilience.savings", "sav"), "Untuk keadaan mendadak: servis, berobat, order sepi. Isi 0 kalau belum ada.")}
      ${pot ? field("gsav", `Tabungan tujuan: ${esc(goal.label)}`, money("resilience.goalSaved", "gsav"), "Uang yang sudah terkumpul khusus untuk tujuan utama. Isi 0 kalau belum ada.")
        : `<p class="hint">${goal ? `Tujuan utama Anda (${esc(goal.label)}) tidak butuh tabungan terpisah.` : "Tabungan tujuan muncul setelah Anda memilih tujuan utama."}</p>`}`, "part-tabungan");
  }

  R.hasil = () => {
    const c = calc(), h = health(c);
    const done = ui.analysisIdx >= ANALYSIS.length;
    if (!done) {
      const list = `<ul class="checklist">${ANALYSIS.map((t, i) => `<li class="${i < ui.analysisIdx ? "done" : i === ui.analysisIdx ? "active" : ""}"><span class="dot">${i < ui.analysisIdx ? `<span style="width:12px;height:12px;display:grid">${ICON.check}</span>` : i === ui.analysisIdx ? '<span class="spinner" style="width:12px;height:12px" aria-hidden="true"></span>' : ""}</span>${t}</li>`).join("")}</ul>`;
      return shell("Menghitung hasil Anda", c.verified ? "Mencocokkan isian dengan e-wallet." : "Kami hitung dari isian Anda, lalu cek apakah ada yang janggal.", card("", "", list));
    }
    return shell("Hasil kesehatan finansial Anda", "Ketuk grafik untuk melihat angkanya.", `
      ${S.overrides.income != null || S.overrides.expense != null ? `<div class="note">${ICON.info}<span>${[S.overrides.income != null ? "Pendapatan" : "", S.overrides.expense != null ? "pengeluaran" : ""].filter(Boolean).join(" dan ")} memakai angka yang Anda perbarui di halaman Tangga milestone. Ubah angkanya di langkah Pendapatan/Pengeluaran kalau ingin memakai isian di sini.</span></div>` : ""}
      <div class="done-line"><span class="dot">${ICON.check}</span>Data selesai dihitung${c.verified ? ` · ${c.agg.count} e-wallet + tunai` : " · isian manual"}</div>
      ${vizScore(h)}
      ${vizPillars(h)}
      ${vizCashflow(c, h)}
      ${vizEmergency(c, h)}
      ${vizReliability(c)}
      ${checkLinks(c)}
      ${card("", "", `<div class="next-up">${ICON.badge}<div><b>Berikutnya: dashboard & tangga milestone</b><p>Langkah-langkah menuju tujuan utama Anda.</p></div></div>`)}
    `);
  };

  function checkLinks(c) {
    const steps = [...new Set(dataChecks(c).filter(k => k.lv === "warn" && k.step).map(k => k.step))];
    if (!steps.length) return "";
    return `<div class="chips">${steps.map(id => `<button type="button" class="btn secondary sm" data-action="gotoStep" data-id="${id}">Perbaiki di langkah ${STEPS[stepIdx(id)].label}</button>`).join("")}</div>`;
  }

  // ---------- Render ----------
  const stepEl = $("#step");
  function render(keepScroll = false) {
    if (ui.edit) S.step = stepIdx(ui.edit.sec.steps[ui.edit.idx][0]);
    else if (!isActive(S.step)) S.step = nextIdx(S.step);
    const y = window.scrollY;
    stepEl.innerHTML = R[STEPS[S.step].id]();
    tuckNotes(stepEl, STEPS[S.step].id);
    if (ui.edit) editView();
    if (keepScroll) window.scrollTo(0, y);
    requestAnimationFrame(() => stepEl.querySelectorAll(".bar > i[data-w]").forEach(el => (el.style.width = el.dataset.w + "%")));
    hideTip();
    ui.enter = false;   // animasi masuk hanya saat pindah langkah, bukan setiap klik
    chrome();
  }

  // Deretan langkah di atas bisa lebih lebar dari layar: geser otomatis supaya langkah aktif selalu terlihat (di tengah).
  function pillEdges() {
    const bar = $("#pills"), max = bar.scrollWidth - bar.clientWidth;
    bar.classList.toggle("more-left", bar.scrollLeft > 2);
    bar.classList.toggle("more-right", bar.scrollLeft < max - 2);
  }
  $("#pills").addEventListener("scroll", pillEdges, { passive: true });
  function followPill() {
    const bar = $("#pills"), cur = bar.querySelector('[aria-current="step"]');
    pillEdges();
    if (!cur || bar.scrollWidth <= bar.clientWidth) return;
    const b = bar.getBoundingClientRect(), r = cur.getBoundingClientRect();
    const left = clamp(bar.scrollLeft + (r.left - b.left) - (b.width - r.width) / 2, 0, bar.scrollWidth - bar.clientWidth);
    if (Math.abs(bar.scrollLeft - left) < 2) return;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    bar.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    // cadangan: bila animasi tidak jalan (tab latar, render ulang), langsung lompat ke posisinya
    clearTimeout(followPill.t);
    followPill.t = setTimeout(() => { if (Math.abs(bar.scrollLeft - left) > 4) bar.scrollLeft = left; }, 450);
  }
  window.addEventListener("resize", () => followPill());

  function chrome() {
    const sq = seq(), pos = sq.indexOf(S.step);
    const progress = Math.round(((pos + 1) / sq.length) * 100);
    $("#progressBar").style.width = progress + "%";
    $(".progress").setAttribute("aria-valuenow", progress);
    $("#pills").innerHTML = STEPS.map((s, i) => {
      const locked = i === EW && S.consent.useWallet === false && S.maxStep >= IZIN;   // null = belum menjawab
      const ahead = !locked && i > S.step && i <= S.maxStep && isActive(i);   // sudah pernah diisi, tapi maju harus lewat Lanjut
      const disabled = !locked && !ahead && (i > S.step || !isActive(i));
      const wp = i === EW && !locked ? walletProgress() : null;
      const done = !locked && isActive(i) && (i < S.step || (S.finished && i !== S.step)) && !wp?.partial;
      const label = wp?.partial ? `${s.label} ${wp.conn.length}/${wp.chosen.length}` : s.label;
      const attrs = locked ? 'data-locked="1" aria-label="E-wallet, tidak dipilih. Ketuk untuk menghubungkan e-wallet."'
        : ahead ? `aria-disabled="true" data-ahead="1" title="Tekan Lanjut untuk ke langkah ini"` : "";
      return `<button type="button" class="pill ${done ? "done" : ""} ${locked ? "locked" : ""} ${ahead ? "ahead" : ""}" ${i === S.step ? 'aria-current="step"' : ""} ${disabled ? "disabled" : ""} ${attrs} data-goto="${i}">${label}</button>`;
    }).join("");
    followPill();
    const errs = ui.edit ? editErrors() : validate();   // tampilan tombol = aturan yang sama dengan saat tombol ditekan
    const valid = !Object.keys(errs).length;
    const last = S.step === STEPS.length - 1;
    const hardGate = STEPS[S.step].id === "izin" && !valid;   // izin: tombol benar-benar terkunci
    $("#backBtn").style.visibility = ui.edit || prevIdx(S.step) !== S.step ? "visible" : "hidden";
    $("#backLabel").textContent = ui.edit ? "Batal" : "Kembali";
    $("#nextLabel").textContent = ui.edit ? (editNextIdx() >= 0 ? "Lanjut" : nextSection() ? "Simpan & lanjut" : "Simpan") : last ? (S.finished ? "Simpan & kembali ke dashboard" : "Simpan & selesai") : "Lanjut";
    $("#nextBtn").disabled = hardGate;
    $("#nextBtn").setAttribute("aria-disabled", String(!valid));
    $("#nextBtn").style.opacity = valid ? "1" : ".5";
    const hint = $("#hint");
    const ewPart = STEPS[S.step].id === "ewallet" && walletProgress();
    hint.textContent = valid && ewPart?.partial ? `Bisa lanjut. ${ewPart.missing.length} e-wallet belum terhubung.` : valid ? (last ? "Semua siap." : "Siap lanjut.") : (errs.x || errs.fullName || errs.phone || errs.password || errs.city || errs.cityOther || "Lengkapi bagian wajib untuk lanjut");
    hint.classList.toggle("ok", valid);
    document.title = `${STEPS[S.step].label} · Laju`;
  }

  function updateDerived() {
    const c = calc();
    const map = { appIncome: rp(c.appIncome), other: rp(S.income.other), income: rp(c.income), expMin: rp(c.expMin), expMax: rp(c.expMax), activeCount: String(c.activeCount), debtMonthly: rp(c.debtMonthly) };
    stepEl.querySelectorAll("[data-calc]").forEach(el => {
      const k = el.dataset.calc;
      if (k in map) el.textContent = map[k];
      else if (k === "volbox") el.innerHTML = volBox();
      else if (k === "debtLine") el.innerHTML = debtLineText(c);
      else if (k.startsWith("cat-")) { const e = S.expenses[k.slice(4)]; el.textContent = `(${rp(e.min)} - ${rp(e.max)})`; }
      else if (k.startsWith("vf-")) el.innerHTML = verifyLine(c.items.find(i => i.key === k.slice(3)), { interactive: true });
    });
  }

  // Langkah pertama (sebelum `upTo`) yang isiannya belum lengkap. Password diabaikan
  // karena sengaja tidak disimpan di perangkat dan harus diketik ulang setelah muat ulang.
  function firstBlocking(upTo) {
    for (const j of seq()) {
      if (j >= upTo) break;
      const e = validate(j); delete e.password;
      if (Object.keys(e).length) return j;
    }
    return -1;
  }

  function go(i) {
    if (i === EW && !S.consent.useWallet) return askWallet();
    if (i > S.step) {           // maju: semua langkah sebelumnya harus valid (cegah lompat lewati persetujuan)
      const b = firstBlocking(i);
      if (b !== -1) {
        toast(`Lengkapi langkah "${STEPS[b].label}" dulu.`);
        if (b === S.step) { ui.showErrors = true; render(true); return; }
        i = b;
      }
    }
    clearTimeout(ui.analysisTimer);
    ui.combo.open = false;
    S.step = clamp(i, 0, STEPS.length - 1);
    S.maxStep = Math.max(S.maxStep, S.step);
    ui.showErrors = false;
    ui.enter = true;
    save();
    render();
    window.scrollTo({ top: 0 });
    stepEl.focus({ preventScroll: true });
    if (STEPS[S.step].id === "hasil") runAnalysis();
  }

  function runAnalysis() {
    if (ui.analysisIdx >= ANALYSIS.length) return;
    ui.analysisTimer = setTimeout(() => { ui.analysisIdx++; render(true); runAnalysis(); }, 550);
  }

  function clearOverridesFor(path) {
    if (/^(income\.|profile\.(platforms|daysPerWeek))/.test(path)) delete S.overrides.income;
    if (/^expenses\./.test(path)) delete S.overrides.expense;
  }

  // ---------- Events ----------
  stepEl.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.matches("[data-combo-input]")) { ui.combo.open = true; renderCityList(el.value); return; }
    const path = el.dataset.bind; if (!path) return;
    const kind = el.dataset.kind;
    let v = el.value;
    if (kind === "money") {
      const n = Number(v.replace(/\D/g, "")) || 0;
      v = n; el.value = n ? fmt(n) : "";
    } else if (kind === "num") v = Number(v);
    else if (kind === "int") { v = v.replace(/\D/g, ""); el.value = v; v = v ? Number(v) : ""; }
    else if (kind === "dec") { v = v.replace(/[^\d.,]/g, "").replace(",", "."); el.value = v; }
    else if (kind === "lower") { v = v.toLowerCase().replace(/\s/g, ""); el.value = v; }
    set(path, v);
    clearOverridesFor(path);

    // dua titik pada satu garis: titik kiri tidak boleh melewati titik kanan
    const m = path.match(/^expenses\.(\w+)\.(min|max)$/);
    if (m) {
      const e = S.expenses[m[1]];
      if (m[2] === "min" && e.min > e.max) { e.min = e.max; el.value = e.min; }
      if (m[2] === "max" && e.max < e.min) { e.max = e.min; el.value = e.max; }
      const wrap = el.closest(".dual");
      wrap.style.setProperty("--a", (e.min / EXP_MAX) * 100 + "%");
      wrap.style.setProperty("--b", (e.max / EXP_MAX) * 100 + "%");
      wrap.querySelector('[data-thumb="min"]').style.zIndex = e.min > EXP_MAX * 0.9 ? 3 : 1;
      el.setAttribute("aria-valuetext", rp(Number(el.value)));
    } else if (el.type === "range") el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
    stepEl.querySelectorAll(`[data-out="${path}"]`).forEach(o => (o.textContent = v));
    stepEl.querySelectorAll(`[data-preview-of="${path}"]`).forEach(o => (o.innerHTML = previewText(o.dataset.previewFmt, v)));
    if (path === "account.cityOther" && $("#city")) $("#city").value = cityLabel();
    if (el.getAttribute("aria-invalid") === "true" && ui.showErrors) {
      const errs = validate(); const key = path.split(".").pop();
      if (!errs[key]) { el.setAttribute("aria-invalid", "false"); const e = document.getElementById(el.id + "-err"); if (e) e.remove(); }
    }
    updateDerived();
    save();
    chrome();
  });

  stepEl.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.check) { set(el.dataset.check, el.checked); save(); chrome(); }
  });

  stepEl.addEventListener("click", (ev) => {
    const opt = ev.target.closest("[data-combo-opt]");
    if (opt) return selectCity(opt.dataset.comboOpt);
    if (ev.target.closest("[data-combo-toggle]")) {
      const input = $("#city"); ui.combo.open = !ui.combo.open;
      if (ui.combo.open) { renderCityList(""); input.focus(); } else closeCombo();
      return;
    }
    const b = ev.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.date) return openCal(d.date);
    if (d.adderToggle) {
      ui.adder[d.adderToggle] = !ui.adder[d.adderToggle];
      render(true);
      if (ui.adder[d.adderToggle]) stepEl.querySelector(`[data-adder="${d.adderToggle}"]`)?.focus({ preventScroll: true });
      else stepEl.querySelector(`[data-adder-toggle="${d.adderToggle}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (d.add) return addCustom(d.add);
    if (d.removeCustom) return removeCustom(d.removeCustom, d.name);
    if (d.set) {
      set(d.set, parseVal(d.val));
    } else if (d.multi) {
      if (d.multi === "profile.channels" && S.profile.channels.includes(d.val) && S.wallets.some(w => w.walletId === d.val)) {
        const m = walletMeta(d.val);
        confirmBox({ title: `Hapus ${m.label} dari pilihan?`, body: `${m.label} sudah terhubung. Kalau dihapus dari pilihan, ${m.label} diputus dan data transaksinya dihapus dari Laju.`, ok: "Ya, hapus & putuskan", danger: true })
          .then(ok => {
            if (!ok) return;
            api(`/api/wallets/${d.val}`, { method: "DELETE" }).catch(() => {});
            S.wallets = S.wallets.filter(w => w.walletId !== d.val);
            S.profile.channels = S.profile.channels.filter(x => x !== d.val);
            save(); render(true); toast(`${m.label} diputus`);
          });
        return;
      }
      const arr = get(d.multi) || []; const i = arr.indexOf(d.val);
      i >= 0 ? arr.splice(i, 1) : arr.push(d.val);
      set(d.multi, arr);
      clearOverridesFor(d.multi);
      if (d.multi === "resilience.goals" && !arr.includes(S.resilience.primaryGoal)) S.resilience.primaryGoal = arr.length === 1 ? arr[0] : "";
    } else if (d.switch) {
      set(d.switch, !get(d.switch));
      clearOverridesFor(d.switch);
    } else if (d.inc) {
      set(d.inc, clamp((get(d.inc) || 0) + Number(d.d), 0, 15));
    } else if (d.action) {
      action(d.action, d.id);
      return;
    } else return;
    save();
    render(true);
    const again = stepEl.querySelector(`[data-${d.set ? "set" : d.multi ? "multi" : d.switch ? "switch" : "inc"}="${d.set || d.multi || d.switch || d.inc}"]${d.val ? `[data-val="${CSS.escape(d.val)}"]` : ""}${d.d ? `[data-d="${d.d}"]` : ""}`);
    if (again) again.focus({ preventScroll: true });
  });

  function action(name, id) {
    switch (name) {
      case "togglePw": {
        ui.showPw = !ui.showPw; render(true);
        $("#password")?.focus(); break;
      }
      case "enableWallet": S.consent.useWallet = true; save(); render(true); break;
      case "walletChoice": {
        const focus = () => stepEl.querySelector(`[data-action="walletChoice"][data-id="${id}"]`)?.focus({ preventScroll: true });
        if (id === "tidak" && S.wallets.length) {
          const names = S.wallets.map(w => walletMeta(w.walletId)?.label).join(", ");
          confirmBox({ title: "Batal memakai e-wallet?", body: `${esc(names)} yang sudah terhubung akan diputus, dan data transaksinya dihapus dari Laju.`, ok: "Ya, putuskan", danger: true })
            .then(ok => { if (!ok) return; dropAllWallets(); S.consent.useWallet = false; save(); render(true); focus(); });
          break;
        }
        S.consent.useWallet = id === "ya"; save(); render(true); focus(); break;
      }
      case "resyncAll": S.wallets.filter(w => w.summary && !w.stale && !w.summary.dailyOut).forEach(w => syncWallet(w.walletId)); break;
      case "connect": openConsent(id); break;
      case "sync": syncWallet(id); break;
      case "disconnect": {
        const m = walletMeta(id);
        confirmBox({ title: `Putuskan ${m.label}?`, body: "Izin akses dicabut dan data transaksinya dihapus dari Laju. Anda bisa menghubungkan lagi kapan saja.", ok: "Ya, putuskan", danger: true })
          .then(ok => {
            if (!ok) return;
            api(`/api/wallets/${id}`, { method: "DELETE" }).catch(() => {});
            S.wallets = S.wallets.filter(w => w.walletId !== id);
            if (ui.openTx === id) ui.openTx = null;
            save(); render(true); toast(`${m.label} diputus`);
          });
        break;
      }
      case "toggleTx": ui.openTx = ui.openTx === id ? null : id; render(true); break;
      case "vfix": applyVerify(id); clearOverridesFor(id.startsWith("exp:") ? "expenses." : "income."); save(); render(true); toast("Isian disesuaikan dengan e-wallet"); break;
      case "suggestChannels": {
        for (const p of S.profile.platforms) { const w = PLATFORM_WALLET[p]; if (w && !S.profile.channels.includes(w)) S.profile.channels.push(w); }
        save(); render(true); break;
      }
      case "gotoStep":
        if (ui.edit) { endEdit(""); location.href = editUrl({ profil: "uang", pendapatan: "keuangan", pengeluaran: "keuangan" }[id] || "kerja"); break; }
        go(stepIdx(id)); break;
      case "gotoUang":   // tombol Ubah di tab E-wallet: langsung ke kartu "Uang & rekening" di Profil
        if (ui.edit) { endEdit(""); location.href = editUrl("uang"); break; }
        go(stepIdx("profil"));
        setTimeout(() => {
          const el = stepEl.querySelector(".part-uang"); if (!el) return;
          const top = $(".topbar")?.getBoundingClientRect().bottom || 0;   // jangan sampai judul kartu tertutup header
          window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - top - 12, behavior: "instant" });
          el.classList.add("flash");
          setTimeout(() => el.classList.remove("flash"), 1600);
        }, 60);
        break;
      case "calDay": ui.calDay = ui.calDay === id ? null : id; render(true); stepEl.querySelector(`[data-cday="${id}"]`)?.focus({ preventScroll: true }); break;
      case "skipWallet": S.consent.useWallet = false; save(); if (ui.edit) editNext(); else go(nextIdx(EW)); break;
      case "useSum": {
        S.income.weekAvg = S.profile.platforms.reduce((s, p) => s + (Number(S.income.perPlatform[p]) || 0), 0);
        save(); render(true); break;
      }
      case "addPlatform": if (!S.profile.platforms.includes(id)) S.profile.platforms.push(id); save(); render(true); break;
      case "addVehicleLoan": S.debts.push({ type: "Cicilan", remaining: 0, months: "", rate: "", due: "" }); save(); render(true); toast("Isi sisa cicilan kendaraan di baris baru"); break;
      case "vehiclePaid": S.profile.ownership = "lunas"; save(); render(true); toast("Status kendaraan diubah jadi Milik sendiri"); break;
      case "addDebt": S.debts.push({ type: "", remaining: 0, months: "", rate: "", due: "" }); save(); render(true); break;
      case "removeDebt": S.debts.splice(Number(id), 1); ui.adder = Object.fromEntries(Object.entries(ui.adder).filter(([k]) => !k.startsWith("debt:"))); save(); render(true); break;
    }
  }

  // ---------- City combobox ----------
  const highlight = (text, q) => {
    if (!q) return esc(text);
    const i = norm(text).indexOf(norm(q));
    return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
  };
  function renderCityList(query) {
    const list = $("#city-list"), input = $("#city"); if (!list) return;
    const q = query.trim() === cityLabel() ? "" : query.trim();
    const n = norm(q);
    const items = CITIES.filter(c => !n || norm(c.name).includes(n) || norm(c.prov).includes(n));
    ui.combo.items = [...items.map(c => c.name), "Lainnya"];
    let html = "", letter = "";
    items.forEach((c, i) => {
      const L = c.name[0].toUpperCase();
      if (!q && L !== letter) { letter = L; html += `<li class="combo-group" role="presentation">${L}</li>`; }
      html += `<li class="combo-opt" role="option" id="city-opt-${i}" data-combo-opt="${esc(c.name)}" aria-selected="${S.account.city === c.name}"><span>${highlight(c.name, q)}</span><small>${highlight(c.prov, q)}</small></li>`;
    });
    if (!items.length) html += `<li class="combo-empty" role="presentation">Kota "${esc(q)}" tidak ada di daftar. Pilih Lainnya untuk mengetik sendiri.</li>`;
    html += `<li class="combo-opt other" role="option" id="city-opt-${items.length}" data-combo-opt="Lainnya" aria-selected="${S.account.city === "Lainnya"}"><span>Lainnya</span><small>ketik nama kota sendiri</small></li>`;
    list.innerHTML = html;
    const wasHidden = list.hidden;
    list.hidden = !ui.combo.open;
    input.setAttribute("aria-expanded", String(ui.combo.open));
    // daftar terbuka ke bawah: kalau tertutup bar Lanjut / tepi layar, geser halaman secukupnya
    if (wasHidden && ui.combo.open) {
      list.style.top = list.style.bottom = "";
      const barTop = $(".bottombar")?.getBoundingClientRect().top ?? innerHeight;
      const over = list.getBoundingClientRect().bottom - barTop + 12;
      if (over > 0) window.scrollBy({ top: Math.min(over, input.getBoundingClientRect().top - 80), behavior: "instant" });
      // halaman sudah mentok bawah dan tetap tertutup: buka daftar ke ATAS kotak pencarian
      const lr = list.getBoundingClientRect(), ir = input.getBoundingClientRect();
      if (lr.bottom > barTop && ir.top - lr.height - 6 > 64) {
        list.style.top = "auto";
        list.style.bottom = `${input.closest("[data-combo]").getBoundingClientRect().bottom - ir.top + 6}px`;
      }
    }
    setActive(q ? 0 : Math.max(0, ui.combo.items.indexOf(S.account.city)));
  }
  function setActive(i) {
    const input = $("#city"); if (!input) return;
    ui.combo.active = clamp(i, 0, ui.combo.items.length - 1);
    $("#city-list").querySelectorAll(".combo-opt").forEach((el, k) => el.classList.toggle("active", k === ui.combo.active));
    const el = document.getElementById(`city-opt-${ui.combo.active}`);
    if (el) { input.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
  }
  function closeCombo() {
    ui.combo.open = false;
    const list = $("#city-list"), input = $("#city"); if (!list) return;
    list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
    input.value = S.account.city ? cityLabel() : "";
  }
  function selectCity(name) {
    S.account.city = name;
    if (name !== "Lainnya") S.account.cityOther = "";
    ui.combo.open = false;
    save(); render(true);
    (name === "Lainnya" ? $("#cityOther") : $("#city"))?.focus({ preventScroll: true });
  }
  // klik pada daftar tidak boleh mencuri fokus dari kotak pencarian (kalau tidak, daftar tertutup sebelum klik terbaca)
  stepEl.addEventListener("mousedown", (ev) => { if (ev.target.closest(".combo-list, [data-combo-toggle]")) ev.preventDefault(); });
  stepEl.addEventListener("focusin", (ev) => {
    if (ev.target.matches("[data-combo-input]") && !ui.combo.open) { ui.combo.open = true; ev.target.select(); renderCityList(""); }
  });
  stepEl.addEventListener("focusout", (ev) => {
    if (ev.target.matches("[data-combo-input]") && !ev.relatedTarget?.closest?.("[data-combo]")) setTimeout(() => { if (!document.activeElement?.closest?.("[data-combo]")) closeCombo(); }, 120);
  });
  stepEl.addEventListener("keydown", (ev) => {
    if (ev.target.matches("[data-cday]")) {   // kalender rincian: panah pindah tanggal
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key]; if (!step) return;
      const all = [...stepEl.querySelectorAll("[data-cday]")], to = all[all.indexOf(ev.target) + step];
      if (to) { ev.preventDefault(); ev.target.tabIndex = -1; to.tabIndex = 0; to.focus(); }
      return;
    }
    if (ev.target.matches("[data-adder]")) {
      if (ev.key === "Enter") { ev.preventDefault(); addCustom(ev.target.dataset.adder); }
      else if (ev.key === "Escape") { const k = ev.target.dataset.adder; ui.adder[k] = false; render(true); stepEl.querySelector(`[data-adder-toggle="${k}"]`)?.focus(); }
      return;
    }
    if (!ev.target.matches("[data-combo-input]")) return;
    const k = ev.key;
    if (k === "ArrowDown" || k === "ArrowUp") {
      ev.preventDefault();
      if (!ui.combo.open) { ui.combo.open = true; renderCityList(ev.target.value); return; }
      setActive(ui.combo.active + (k === "ArrowDown" ? 1 : -1));
    } else if (k === "Enter" && ui.combo.open) {
      ev.preventDefault();
      const name = ui.combo.items[ui.combo.active]; if (name) selectCity(name);
    } else if (k === "Escape" && ui.combo.open) {
      ev.preventDefault(); closeCombo();
    }
  });

  // ---------- Tooltip (hover + keyboard focus) ----------
  const tipEl = $("#tip");
  function showTip(el) {
    tipEl.textContent = el.dataset.tip; tipEl.classList.add("show");
    const r = el.getBoundingClientRect(), t = tipEl.getBoundingClientRect();
    const left = clamp(r.left + r.width / 2 - t.width / 2, 8, innerWidth - t.width - 8);
    let top = r.top - t.height - 10; if (top < 8) top = r.bottom + 10;
    tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
  }
  function hideTip() { tipEl.classList.remove("show"); }
  stepEl.addEventListener("pointerover", (e) => { const el = e.target.closest("[data-tip]"); if (el) showTip(el); });
  stepEl.addEventListener("pointerout", (e) => { if (e.target.closest("[data-tip]")) hideTip(); });
  stepEl.addEventListener("focusin", (e) => { if (e.target.matches("[data-tip]:focus-visible")) showTip(e.target); });   // klik tidak memunculkan tip yang menutupi kalender
  stepEl.addEventListener("focusout", (e) => { if (e.target.matches("[data-tip]")) hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });

  // ---------- Calendar ----------
  const calDlg = $("#calDlg");
  function openCal(path) {
    const cur = get(path);
    const base = cur && /^\d{4}-\d{2}-\d{2}$/.test(cur) ? parseIso(cur) : new Date();
    ui.cal = { path, y: base.getFullYear(), m: base.getMonth(), focus: isoOf(base) };
    renderCal(); calDlg.showModal();
    calDlg.querySelector(`[data-day="${ui.cal.focus}"]`)?.focus();
  }
  function renderCal() {
    const { y, m, path } = ui.cal, sel = get(path), today = isoOf(new Date());
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;   // minggu dimulai Senin
    let days = "";
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m, 1 - offset + i), s = isoOf(d);
      days += `<button type="button" class="cal-day ${d.getMonth() !== m ? "out" : ""}" data-day="${s}" tabindex="${s === ui.cal.focus ? 0 : -1}" aria-pressed="${s === sel}" ${s === today ? 'aria-current="date"' : ""} aria-label="${DAYNAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}">${d.getDate()}</button>`;
    }
    calDlg.innerHTML = `<div class="cal">
      <div class="cal-head"><button type="button" class="cal-nav" data-cal="prev" aria-label="Bulan sebelumnya">‹</button><h2 id="calTitle" aria-live="polite">${MONTHS[m]} ${y}</h2><button type="button" class="cal-nav" data-cal="next" aria-label="Bulan berikutnya">›</button></div>
      <div class="cal-grid" role="group" aria-labelledby="calTitle">${["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join("")}${days}</div>
      <div class="cal-foot"><button type="button" class="link-btn" data-cal="clear">Hapus tanggal</button><div style="display:flex;gap:8px"><button type="button" class="btn secondary sm" data-cal="today">Hari ini</button><button type="button" class="btn secondary sm" data-cal="close">Batal</button></div></div>
    </div>`;
  }
  function pickDate(iso) {
    const path = ui.cal.path;
    set(path, iso); calDlg.close(); save(); render(true);
    stepEl.querySelector(`[data-date="${path}"]`)?.focus({ preventScroll: true });
  }
  function moveCal(deltaDays, deltaMonths = 0) {
    const f = parseIso(ui.cal.focus);
    const d = deltaMonths ? new Date(f.getFullYear(), f.getMonth() + deltaMonths, Math.min(f.getDate(), 28)) : new Date(f.getFullYear(), f.getMonth(), f.getDate() + deltaDays);
    ui.cal = { ...ui.cal, y: d.getFullYear(), m: d.getMonth(), focus: isoOf(d) };
    renderCal(); calDlg.querySelector(`[data-day="${ui.cal.focus}"]`)?.focus();
  }
  calDlg.addEventListener("click", (ev) => {
    if (ev.target === calDlg) return calDlg.close();
    const day = ev.target.closest("[data-day]"); if (day) return pickDate(day.dataset.day);
    const a = ev.target.closest("[data-cal]")?.dataset.cal; if (!a) return;
    if (a === "prev" || a === "next") {
      const dm = a === "prev" ? -1 : 1, d = new Date(ui.cal.y, ui.cal.m + dm, 1);
      ui.cal = { ...ui.cal, y: d.getFullYear(), m: d.getMonth(), focus: isoOf(d) };
      renderCal(); calDlg.querySelector(`[data-cal="${a}"]`)?.focus();
    } else if (a === "today") pickDate(isoOf(new Date()));
    else if (a === "clear") pickDate("");
    else calDlg.close();
  });
  calDlg.addEventListener("keydown", (ev) => {
    if (!ev.target.matches("[data-day]")) return;
    const map = { ArrowLeft: [-1], ArrowRight: [1], ArrowUp: [-7], ArrowDown: [7], PageUp: [0, -1], PageDown: [0, 1] };
    if (map[ev.key]) { ev.preventDefault(); moveCal(...map[ev.key]); }
  });

  // ---------- "Mau hubungkan e-wallet?" ----------
  const askDlg = $("#askDlg");
  function askWallet() {
    askDlg.innerHTML = `<div class="sheet-body">
      <h2 id="askTitle">Mau hubungkan e-wallet?</h2>
      <p style="font-size:.9rem;color:var(--muted-fg)">Anda tidak memilih e-wallet di langkah Izin data, jadi langkah ini dilewati. Kalau dihubungkan, pendapatan Anda jadi terverifikasi dan bisa dipakai sebagai bukti penghasilan ke bank.</p>
      <div class="sheet-actions"><button type="button" class="btn secondary sm" data-ask="no">Tidak, tetap lewati</button><button type="button" class="btn sm" data-ask="yes">Ya, isi data e-wallet</button></div>
    </div>`;
    askDlg.showModal();
    askDlg.querySelector('[data-ask="yes"]').focus();
  }
  askDlg.addEventListener("click", (ev) => {
    if (ev.target === askDlg) return askDlg.close();
    const a = ev.target.closest("[data-ask]")?.dataset.ask; if (!a) return;
    askDlg.close();
    if (a !== "yes") return;
    S.consent.useWallet = true;
    save();
    go(EW);   // go() memeriksa semua langkah sebelumnya; kalau belum lengkap, pengguna diarahkan ke sana
  });

  $("#pills").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-goto]"); if (!b) return;
    if (b.dataset.locked) return askWallet();
    if (b.dataset.ahead) return toast("Tekan Lanjut untuk ke langkah berikutnya.");
    const i = Number(b.dataset.goto);
    if (b.disabled || i > S.step) return;
    go(i);
  });
  $("#backBtn").addEventListener("click", () => (ui.edit ? cancelEdit() : go(prevIdx(S.step))));
  $("#nextBtn").addEventListener("click", () => {
    if (ui.edit) return editNext();
    const errs = validate();
    if (Object.keys(errs).length) {
      ui.showErrors = true; render(true);
      const first = stepEl.querySelector('[aria-invalid="true"]');
      if (first) first.focus(); else toast(errs.x || "Lengkapi bagian wajib dulu");
      return;
    }
    // isian "+ Lainnya" yang sudah diketik tapi belum ditekan Enter ikut disimpan
    const pending = [...stepEl.querySelectorAll("[data-adder]")].filter(x => x.value.trim());
    if (pending.length) { pending.forEach(x => addCustom(x.dataset.adder, { silent: true })); save(); }
    if (S.step === STEPS.length - 1) {
      const b = firstBlocking(S.step);
      if (b !== -1) { toast(`Lengkapi langkah "${STEPS[b].label}" dulu.`); go(b); return; }
      S.finished = true; S.finishedAt = S.finishedAt || new Date().toISOString();
      if (!S.startSnap) S.startSnap = snapshotMetrics();   // titik awal untuk rapor "awal vs sekarang"
      // akun jadi: simpan hash password (bukan passwordnya), lalu langsung dianggap sudah masuk
      hashPass(S.account.password).then(p => { S.account.pass = p; setLoggedIn(true); save(); location.href = "app.html#dashboard"; });
      return;
    }
    go(nextIdx(S.step));
  });

  // Dialog konfirmasi di dalam halaman. confirm() bawaan browser bisa diblokir
  // (mis. di browser dalam aplikasi), dan saat diblokir ia diam-diam mengembalikan "batal".
  const confirmDlg = $("#confirmDlg");
  function confirmBox({ title, body, ok = "Ya", cancel = "Batal", danger = false }) {
    return new Promise((resolve) => {
      confirmDlg.innerHTML = `<div class="sheet-body">
        <h2 id="confirmTitle">${title}</h2>
        <p style="font-size:.9rem;color:var(--muted-fg)">${body}</p>
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-c="0">${cancel}</button><button type="button" class="btn sm ${danger ? "danger" : ""}" data-c="1">${ok}</button></div>
      </div>`;
      const done = (v) => {
        confirmDlg.removeEventListener("click", onClick);
        confirmDlg.removeEventListener("close", onClose);
        if (confirmDlg.open) confirmDlg.close();
        resolve(v);
      };
      const onClick = (e) => {
        if (e.target === confirmDlg) return done(false);       // klik di luar kotak
        const b = e.target.closest("[data-c]"); if (b) done(b.dataset.c === "1");
      };
      const onClose = () => done(false);                      // tombol Esc
      confirmDlg.addEventListener("click", onClick);
      confirmDlg.addEventListener("close", onClose);
      confirmDlg.showModal();
      confirmDlg.querySelector('[data-c="0"]').focus();
    });
  }
  function dropAllWallets() {
    S.wallets.forEach(w => api(`/api/wallets/${w.walletId}`, { method: "DELETE" }).catch(() => {}));
    S.wallets = []; ui.openTx = null; ui.walletError = "";
  }


  $("#demoBtn").addEventListener("click", () => {
    const keep = { step: S.step, maxStep: STEPS.length - 1, wallets: S.wallets };
    S = nextDemoState();
    Object.assign(S, keep);
    S.consent.useWallet = S.wallets.some(w => w.summary);   // tanpa e-wallet tersinkron, langkah E-wallet tidak boleh menahan
    for (const w of S.wallets) if (!S.profile.channels.includes(w.walletId)) S.profile.channels.push(w.walletId);
    ui.analysisIdx = STEPS[S.step].id === "hasil" ? ANALYSIS.length : 0;
    save(); render(true);
    toast("Contoh data driver diisi");
  });

  const renderWallet = () => (STEPS[S.step].id === "ewallet" ? render(true) : chrome());

  async function syncWallet(id) {
    if (ui.syncing[id] != null) return;
    ui.syncing[id] = 0; ui.walletError = ""; renderWallet();
    const tick = setInterval(() => { if (ui.syncing[id] < SYNC_STEPS.length - 1) { ui.syncing[id]++; renderWallet(); } }, 600);
    try {
      const [view] = await Promise.all([api(`/api/wallets/${id}/sync`, { method: "POST", body: {} }), new Promise(r => setTimeout(r, 1500))]);
      const i = S.wallets.findIndex(w => w.walletId === id);
      i >= 0 ? (S.wallets[i] = view) : S.wallets.push(view);
      toast(`${walletMeta(id).label} tersinkron · ${view.summary.txCount} transaksi`);
    } catch (e) {
      ui.walletError = e.message;
      if (e.code === "not_linked") S.wallets = S.wallets.filter(w => w.walletId !== id);
    } finally {
      clearInterval(tick); delete ui.syncing[id]; save(); renderWallet();
    }
  }

  const dlg = $("#consentDlg");
  function openConsent(id) {
    const m = walletMeta(id);
    dlg.dataset.wallet = id;
    dlg.innerHTML = `<div class="sheet-body">
      <div class="wcard-head">${walletLogo(m)}<div class="meta"><b>Hubungkan ${m.label}</b><small>Lewat ${ui.config?.mode === "live" ? esc(providerName()) : "penyedia open finance · simulasi"}</small></div></div>
      <h2 id="consentTitle">Anda akan diarahkan ke halaman penyedia open finance</h2>
      <ul class="sheet-list">
        <li><span class="ok" aria-hidden="true">✓</span><span>Login dengan nomor HP &amp; OTP <strong>di halaman penyedia</strong>. Laju tidak melihat OTP Anda.</span></li>
        <li><span class="ok" aria-hidden="true">✓</span><span>Laju hanya membaca riwayat transaksi 6 bulan terakhir.</span></li>
        <li><span class="no" aria-hidden="true">✕</span><span>Laju tidak bisa memindahkan uang, membayar, atau melihat PIN Anda.</span></li>
        <li><span class="ok" aria-hidden="true">✓</span><span>Izin bisa dicabut kapan saja dengan tombol putuskan.</span></li>
      </ul>
      ${ui.config?.mode === "simulasi" ? `<p class="note">${ICON.info}<span>Mode simulasi: halaman penyedia dan transaksinya masih tiruan.</span></p>` : ""}
      <p class="err" id="dlgErr" role="alert" hidden></p>
      <div class="sheet-actions"><button type="button" class="btn secondary sm" data-dlg="cancel">Batal</button><button type="button" class="btn sm" data-dlg="go">Lanjut ke penyedia</button></div>
    </div>`;
    dlg.showModal();
    dlg.querySelector('[data-dlg="go"]').focus();
  }
  dlg.addEventListener("click", async (ev) => {
    if (ev.target === dlg) return dlg.close();
    const b = ev.target.closest("[data-dlg]"); if (!b) return;
    if (b.dataset.dlg === "cancel") return dlg.close();
    b.disabled = true; b.innerHTML = '<span class="spinner" aria-hidden="true"></span> Membuka…';
    try {
      const { redirectUrl } = await api("/api/wallets/link", { method: "POST", body: { walletId: dlg.dataset.wallet } });
      save();
      location.assign(redirectUrl);
    } catch (e) {
      const err = $("#dlgErr"); err.textContent = e.message; err.hidden = false;
      b.disabled = false; b.textContent = "Coba lagi";
    }
  });

  // ---------- Mode ubah satu bagian Profil (onboarding.html?edit=<bagian>) ----------
  // Form yang sama dengan onboarding, tapi hanya kartu bagian itu, dengan tombol Batal & Simpan.
  // Isian tersimpan otomatis saat diketik, jadi Batal memulihkan salinan saat bagian dibuka.
  function initEdit() {
    const q = new URLSearchParams(location.search);
    const id = q.get("edit") || (q.get("link") ? ss.get("laju-edit") : null);
    const sec = PROFILE_SECTIONS.find(x => x.id === id);
    if (!sec || !S.finished) return null;
    if (q.get("edit")) { ss.set("laju-edit", sec.id); ss.set("laju-edit-snap", JSON.stringify(S)); ss.set("laju-edit-idx", "0"); }
    document.body.classList.add("editing");
    return { sec, idx: clamp(Number(ss.get("laju-edit-idx")) || 0, 0, sec.steps.length - 1) };
  }
  function editNextIdx() {
    const st = ui.edit.sec.steps;
    for (let i = ui.edit.idx + 1; i < st.length; i++) if (isActive(stepIdx(st[i][0]))) return i;
    return -1;
  }
  function editView() {
    const parts = ui.edit.sec.steps[ui.edit.idx][1];
    if (!parts) return;
    const sel = parts.map(x => `.part-${x}`).join(",");
    stepEl.querySelectorAll(".stack > *").forEach(el => { if (!(el.matches(sel) || el.querySelector(sel))) el.style.display = "none"; });
    stepEl.querySelector(".step-title").textContent = ui.edit.sec.title;
    stepEl.querySelectorAll(".step-desc, .step-desc + .info-pop").forEach(el => (el.style.display = "none"));
  }
  // Validasi hanya untuk kartu yang tampil di bagian ini.
  function editErrors() {
    const [stepId, parts] = ui.edit.sec.steps[ui.edit.idx], p = S.profile, r = S.resilience;
    const e = validate(); delete e.password;
    if (!parts || stepId === "akun" || stepId === "pengeluaran") return e;
    const msg = (parts.includes("aplikasi") && !p.platforms.length && "Pilih minimal satu aplikasi.")
      || (parts.includes("kendaraan") && !(p.vehicle && p.ownership) && "Pilih kendaraan dan status kepemilikannya.")
      || (parts.includes("uang") && !p.channels.length && "Pilih lewat mana saja uang Anda masuk dan keluar.")
      || (parts.includes("tujuan") && (!r.goals.length ? "Pilih minimal satu tujuan." : !r.primaryGoal ? "Pilih tujuan yang paling penting." : r.wantsBankLoan == null ? "Jawab rencana pinjaman resmi." : ""));
    return msg ? { x: msg } : {};
  }
  const nextSection = () => PROFILE_SECTIONS[PROFILE_SECTIONS.indexOf(ui.edit.sec) + 1];
  function editCheck() {
    const errs = editErrors();
    if (!Object.keys(errs).length) return true;
    ui.showErrors = true; render(true);
    toast(errs.x || errs.fullName || errs.phone || errs.city || errs.cityOther || "Lengkapi bagian wajib dulu");
    return false;
  }
  // Lanjut: langkah berikutnya di bagian ini, lalu bagian Profil berikutnya. Bagian terakhir kembali ke Profil.
  function editNext() {
    if (!editCheck()) return;
    [...stepEl.querySelectorAll("[data-adder]")].filter(x => x.value.trim()).forEach(x => addCustom(x.dataset.adder, { silent: true }));
    const i = editNextIdx();
    if (i >= 0) { ui.edit.idx = i; ss.set("laju-edit-idx", String(i)); ui.enter = true; ui.showErrors = false; save(); render(); window.scrollTo({ top: 0 }); return; }
    const nxt = nextSection();
    endEdit(`${ui.edit.sec.title} disimpan`);
    location.href = nxt ? editUrl(nxt.id) : "app.html#profil";
  }
  // Selesai (kanan atas): simpan bagian ini lalu kembali ke Profil.
  function editDone() {
    if (!editCheck()) return;
    [...stepEl.querySelectorAll("[data-adder]")].filter(x => x.value.trim()).forEach(x => addCustom(x.dataset.adder, { silent: true }));
    endEdit(`${ui.edit.sec.title} disimpan`);
    location.href = "app.html#profil";
  }
  function endEdit(flash) {
    ["laju-edit", "laju-edit-snap", "laju-edit-idx"].forEach(ss.del);
    if (flash) ss.set("laju-flash", flash);
    save();
  }
  async function cancelEdit() {
    const snap = ss.get("laju-edit-snap");
    if (snap && snap !== JSON.stringify(S)) {
      const ok = await confirmBox({ title: "Batalkan perubahan?", body: "Isian di bagian ini kembali seperti sebelum dibuka.", ok: "Ya, batalkan", cancel: "Lanjut mengubah" });
      if (!ok) return;
      const wallets = S.wallets, useWallet = S.consent.useWallet;   // e-wallet yang sudah terhubung di server tidak ikut dibatalkan
      S = migrate(deepMerge(fresh(), JSON.parse(snap)));
      if (wallets.some(w => w.summary)) { S.wallets = wallets; S.consent.useWallet = useWallet; }
    }
    endEdit("");
    location.href = "app.html#profil";
  }

  // ---------- Boot ----------
  async function boot() {
    if (needsLogin()) { location.replace("masuk.html"); return; }   // akun sudah ada tapi sedang keluar
    ui.edit = initEdit();
    const flash = ss.get("laju-flash"); if (flash && ui.edit) { ss.del("laju-flash"); setTimeout(() => toast(flash), 300); }
    $("#doneBtn").addEventListener("click", editDone);
    const qs = new URLSearchParams(location.search);
    const link = qs.get("link"), linkedId = qs.get("wallet");
    if (link) {
      history.replaceState(null, "", location.pathname);
      S.consent.useWallet = true;
      S.step = EW; S.maxStep = Math.max(S.maxStep, EW);
      if (link === "error") ui.walletError = LINK_ERRORS[qs.get("reason")] || "Gagal menghubungkan e-wallet. Silakan coba lagi.";
    }
    // Onboarding sudah selesai: perubahan data lewat Profil di app, bukan wizard dari awal.
    if (S.finished && !ui.edit && !link) { location.replace("app.html#profil"); return; }
    const blocking = ui.edit ? -1 : firstBlocking(S.step);
    if (blocking !== -1) S.step = blocking;
    if (STEPS[S.step].id === "hasil") ui.analysisIdx = ANALYSIS.length;
    render();
    try {
      ui.config = await api("/api/config");
      ui.server = "ok";
      const { wallets } = await api("/api/wallets");
      const { wallets: merged, lost } = mergeServerWallets(wallets);
      S.wallets = merged;
      if (lost.length && !ui.walletError) ui.walletError = `Izin ${lost.map(w => walletMeta(w.walletId).label).join(", ")} sudah berakhir di server. Laju tetap memakai data transaksi terakhir. Hubungkan lagi untuk memperbaruinya.`;
      save();
    } catch (e) {
      ui.server = "down";
    }
    render(true);
    // e-wallet yang disinkron sebelum ada rincian harian: sinkron ulang sekali per sesi supaya kalender punya pengeluaran per hari
    if (ui.server === "ok" && !ss.get("laju-resync")) {
      ss.set("laju-resync", "1");
      S.wallets.filter(w => w.summary && !w.stale && !w.summary.dailyOut && w.walletId !== linkedId).forEach(w => syncWallet(w.walletId));
    }
    if (link === "ok" && linkedId && ui.server === "ok") {
      toast(`${walletMeta(linkedId)?.label || "E-wallet"} terhubung`);
      syncWallet(linkedId);
    }
  }
  boot();
})();
