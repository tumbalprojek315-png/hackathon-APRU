/* Laju: logika bersama: data acuan, state, perhitungan, grafik, API.
   Dipakai oleh onboarding.html dan app.html (script biasa, bukan modul). */
"use strict";

  // ---------- Reference data ----------
  // 98 kota (pemerintahan kota) di Indonesia, termasuk 5 kota administrasi DKI Jakarta.
  const CITY_DATA = "Ambon|Maluku;Balikpapan|Kalimantan Timur;Banda Aceh|Aceh;Bandar Lampung|Lampung;Bandung|Jawa Barat;Banjar|Jawa Barat;Banjarbaru|Kalimantan Selatan;Banjarmasin|Kalimantan Selatan;Batam|Kepulauan Riau;Batu|Jawa Timur;Baubau|Sulawesi Tenggara;Bekasi|Jawa Barat;Bengkulu|Bengkulu;Bima|Nusa Tenggara Barat;Binjai|Sumatera Utara;Bitung|Sulawesi Utara;Blitar|Jawa Timur;Bogor|Jawa Barat;Bontang|Kalimantan Timur;Bukittinggi|Sumatera Barat;Cilegon|Banten;Cimahi|Jawa Barat;Cirebon|Jawa Barat;Denpasar|Bali;Depok|Jawa Barat;Dumai|Riau;Gorontalo|Gorontalo;Gunungsitoli|Sumatera Utara;Jakarta Barat|DKI Jakarta;Jakarta Pusat|DKI Jakarta;Jakarta Selatan|DKI Jakarta;Jakarta Timur|DKI Jakarta;Jakarta Utara|DKI Jakarta;Jambi|Jambi;Jayapura|Papua;Kediri|Jawa Timur;Kendari|Sulawesi Tenggara;Kotamobagu|Sulawesi Utara;Kupang|Nusa Tenggara Timur;Langsa|Aceh;Lhokseumawe|Aceh;Lubuklinggau|Sumatera Selatan;Madiun|Jawa Timur;Magelang|Jawa Tengah;Makassar|Sulawesi Selatan;Malang|Jawa Timur;Manado|Sulawesi Utara;Mataram|Nusa Tenggara Barat;Medan|Sumatera Utara;Metro|Lampung;Mojokerto|Jawa Timur;Padang|Sumatera Barat;Padang Panjang|Sumatera Barat;Padangsidimpuan|Sumatera Utara;Pagar Alam|Sumatera Selatan;Palangka Raya|Kalimantan Tengah;Palembang|Sumatera Selatan;Palopo|Sulawesi Selatan;Palu|Sulawesi Tengah;Pangkalpinang|Kepulauan Bangka Belitung;Parepare|Sulawesi Selatan;Pariaman|Sumatera Barat;Pasuruan|Jawa Timur;Payakumbuh|Sumatera Barat;Pekalongan|Jawa Tengah;Pekanbaru|Riau;Pematangsiantar|Sumatera Utara;Pontianak|Kalimantan Barat;Prabumulih|Sumatera Selatan;Probolinggo|Jawa Timur;Sabang|Aceh;Salatiga|Jawa Tengah;Samarinda|Kalimantan Timur;Sawahlunto|Sumatera Barat;Semarang|Jawa Tengah;Serang|Banten;Sibolga|Sumatera Utara;Singkawang|Kalimantan Barat;Solok|Sumatera Barat;Sorong|Papua Barat Daya;Subulussalam|Aceh;Sukabumi|Jawa Barat;Sungai Penuh|Jambi;Surabaya|Jawa Timur;Surakarta (Solo)|Jawa Tengah;Tangerang|Banten;Tangerang Selatan|Banten;Tanjungbalai|Sumatera Utara;Tanjungpinang|Kepulauan Riau;Tarakan|Kalimantan Utara;Tasikmalaya|Jawa Barat;Tebing Tinggi|Sumatera Utara;Tegal|Jawa Tengah;Ternate|Maluku Utara;Tidore Kepulauan|Maluku Utara;Tomohon|Sulawesi Utara;Tual|Maluku;Yogyakarta|DI Yogyakarta";
  const CITIES = CITY_DATA.split(";").map(s => { const [name, prov] = s.split("|"); return { name, prov }; })
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  const PLATFORMS = [
    { id: "gojek", label: "Gojek" },
    { id: "grab", label: "Grab" },
    { id: "maxim", label: "Maxim" },
    { id: "indrive", label: "inDrive" },
    { id: "shopeefood", label: "ShopeeFood" },
    { id: "spx", label: "SPX Express (Shopee)" },
    { id: "lalamove", label: "Lalamove" },
  ];
  const OWNERSHIP = [
    { id: "lunas", label: "Milik sendiri" },
    { id: "sewa", label: "Sewa" },
    { id: "kredit", label: "Kredit" },
    { id: "pinjam", label: "Pinjam" },
  ];
  const STATUS = [{ id: "lajang", label: "Belum menikah" }, { id: "menikah", label: "Menikah" }];
  const SIDE_JOBS = ["Jualan online", "Warung", "Serabutan", "Bertani / berkebun"];
  const RECORDS = [{ id: "never", label: "Tidak pernah catat" }, { id: "kadang", label: "Kadang-kadang" }, { id: "selalu", label: "Selalu catat" }];
  const WALLETS = [
    // Logo: Wikimedia Commons (domain publik). Merek dagang milik masing-masing perusahaan.
    { id: "gopay", label: "GoPay", logo: "logos/gopay.svg", hint: "pencairan Gojek" },
    { id: "ovo", label: "OVO", logo: "logos/ovo.svg", hint: "pencairan Grab" },
    { id: "dana", label: "DANA", logo: "logos/dana.svg", hint: "Maxim & transfer masuk" },
    { id: "shopeepay", label: "ShopeePay", logo: "logos/shopeepay.svg", hint: "ShopeeFood & belanja" },
    { id: "linkaja", label: "LinkAja", logo: "logos/linkaja.svg", hint: "tagihan & bayar QRIS" },
    { id: "bank", label: "Rekening bank", logo: "logos/bank.svg", hint: "pencairan ke rekening & tagihan" },   // dihubungkan lewat penyedia yang sama (Kasus C2)
  ];
  const SYNC_STEPS = ["Mengambil riwayat transaksi 6 bulan", "Memisahkan pencairan aplikasi dari transfer biasa", "Mengelompokkan pengeluaran ke kategori"];
  const LINK_ERRORS = {
    access_denied: "Anda menolak izin, tidak apa-apa. Laju hanya membaca riwayat transaksi dan tidak bisa memindahkan uang Anda. Coba lagi, atau lanjut isi manual.",
    otp_failed: "Kode OTP salah 3 kali. Progres Anda tersimpan. Coba lagi nanti, atau lanjut isi manual dulu.",
    session_expired: "Sesi penghubungan kedaluwarsa. Silakan coba hubungkan lagi.",
    bad_code: "Verifikasi dari penyedia gagal. Silakan coba lagi.",
    not_implemented: "Integrasi penyedia asli belum dipasang di server (openfinance/live.py).",
    unsupported_wallet: "E-wallet ini belum didukung penyedia.",
  };
  const EXPENSE_GROUPS = [
    { id: "rumah", label: "Kebutuhan rumah tangga", caption: "Yang harus keluar meski Anda tidak narik" },
    { id: "kendaraan", label: "Operasional kerja", caption: "Biaya supaya bisa terus narik" },
    { id: "gaya", label: "Gaya hidup & sosial", caption: "Pos yang paling sering bocor." },
  ];
  const EXPENSE_CATEGORIES = [
    { id: "makan", group: "rumah", label: "Makan & minum", min: 1500000, max: 2500000 },
    { id: "kontrakan", group: "rumah", label: "Sewa / kontrakan", min: 500000, max: 800000 },
    { id: "listrik", group: "rumah", label: "Listrik, air, gas", min: 200000, max: 350000 },
    { id: "sekolah", group: "rumah", label: "Sekolah & kebutuhan anak", min: 150000, max: 400000 },
    { id: "kirim", group: "rumah", label: "Kirim ke orang tua / keluarga", min: 0, max: 300000, off: true },
    { id: "bbm", group: "kendaraan", label: "Bensin", min: 800000, max: 1400000 },
    { id: "servis", group: "kendaraan", label: "Servis, oli, ban", min: 100000, max: 250000 },
    { id: "pulsa", group: "kendaraan", label: "Paket data & pulsa", min: 100000, max: 200000 },
    { id: "parkir", group: "kendaraan", label: "Parkir & cuci kendaraan", min: 50000, max: 150000 },
    { id: "rokok", group: "gaya", label: "Rokok & kopi", min: 300000, max: 600000 },
    { id: "sosial", group: "gaya", label: "Arisan, sumbangan, hajatan", min: 100000, max: 250000 },
    { id: "hiburan", group: "gaya", label: "Hiburan & langganan", min: 0, max: 150000, off: true },
  ];
  const EXP_MAX = 5000000, EXP_STEP = 50000;
  const DEBT_TYPES = ["Pinjol", "Paylater", "Cicilan", "Bank", "Koperasi", "Rentenir", "Keluarga / teman"];
  const HIGH_COST = ["Pinjol", "Paylater", "Rentenir"];
  const HABITS = [{ id: "never", label: "Belum pernah nabung" }, { id: "sisa", label: "Nabung kalau ada sisa" }, { id: "rutin", label: "Nabung rutin" }];
  const SAVING_PLACES = ["Rekening bank", "E-wallet", "Uang tunai di rumah", "Arisan", "Emas", "Koperasi"];
  const SHOCK = [
    { id: "none", label: "Tidak bisa sama sekali" },
    { id: "borrow", label: "Harus pinjam dulu" },
    { id: "partial", label: "Bisa sebagian" },
    { id: "ok", label: "Bisa tanpa pinjam" },
  ];
  const GOALS = [
    { id: "lunas", label: "Lunasi utang berbunga tinggi" },
    { id: "darurat", label: "Punya dana darurat" },
    { id: "kendaraan", label: "Kendaraan milik sendiri" },
    { id: "usaha", label: "Buka usaha sampingan" },
    { id: "anak", label: "Biaya pendidikan anak" },
    { id: "rumah", label: "Rumah / renovasi" },
  ];
  const ANALYSIS = ["Membaca riwayat transaksi e-wallet", "Mengelompokkan transaksi ke kategori", "Menggabungkan e-wallet dengan bagian tunai Anda", "Menghitung skor kesehatan finansial"];
  // Rentang skor → status. Warna status selalu didampingi ikon + label.
  const BANDS = [   // batas mengikuti FinHealth Score: <40 rentan, ≥80 sehat
    { id: "critical", label: "Rentan", from: 0, to: 40, color: "var(--st-critical)" },
    { id: "serious", label: "Perlu dibenahi", from: 40, to: 60, color: "var(--st-serious)" },
    { id: "warn", label: "Cukup sehat", from: 60, to: 80, color: "var(--st-warn)" },
    { id: "good", label: "Sehat", from: 80, to: 101, color: "var(--st-good)" },
  ];
  // Bagian Profil: data yang jarang berubah. Tiap bagian membuka form onboarding untuk langkah/kartu terkait
  // (onboarding.html?edit=<id>). parts = kartu yang ditampilkan (class "part-<nama>"), null = seluruh langkah.
  const PROFILE_SECTIONS = [
    { id: "identitas", title: "Identitas", steps: [["akun", ["identitas"]]] },
    { id: "kerja", title: "Cara kerja", steps: [["profil", ["aplikasi", "kendaraan", "ritme"]]] },
    { id: "keluarga", title: "Keluarga", steps: [["profil", ["keluarga"]]] },
    { id: "uang", title: "Uang & rekening", steps: [["profil", ["uang"]], ["ketahanan", ["simpan"]]] },
    { id: "tabungan", title: "Tabungan", steps: [["ketahanan", ["tabungan"]]] },
    { id: "ewallet", title: "E-wallet & izin", steps: [["izin", null], ["ewallet", null]] },
    { id: "proteksi", title: "Proteksi", steps: [["profil", ["proteksi"]]] },
    { id: "keuangan", title: "Keuangan bulanan", steps: [["pendapatan", null], ["pengeluaran", ["belanja"]]] },
    { id: "utang", title: "Daftar utang", steps: [["pengeluaran", ["utang"]]] },
    { id: "tujuan", title: "Tujuan", steps: [["ketahanan", ["tujuan"]]] },
  ];
  const editUrl = (id) => `onboarding.html?edit=${id}`;
  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const DAYNAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // ---------- State ----------
  const KEY = "laju-onboarding-v1";
  const fresh = () => ({
    step: 0, maxStep: 0, finished: false, finishedAt: "",
    milestones: { plans: {}, baseline: {}, log: {}, doneAt: {}, debtMethod: "avalanche" },   // rencana, dasar utang, riwayat progres, tanggal selesai
    ledger: [],      // catatan setoran/bayar/perubahan dari halaman tangga (bisa diurungkan)
    scoreLog: [],    // skor harian, untuk rapor
    startSnap: null, // potret kondisi saat onboarding selesai (rapor "awal vs sekarang")
    overrides: {},   // angka "bulan ini" yang diperbarui dari halaman tangga (menggantikan perkiraan onboarding)
    account: { fullName: "", phone: "", username: "", password: "", city: "", cityOther: "" },
    profile: {
      platforms: [], customPlatforms: [], vehicle: "", ownership: "", hoursPerDay: 9, daysPerWeek: 6, area: "",
      status: "", customStatuses: [], dependents: 0, sideJobs: [], customSideJobs: [],
      channels: [], customChannels: [],   // lewat mana uang masuk & keluar: e-wallet, rekening bank, tunai, lainnya
      hasBank: false, hasBpjsKes: false, hasBpjsKet: false, hasInsurance: false, recordsIncome: "",
    },
    consent: { useWallet: false, useManual: false, agreeTerms: false, agreeDataUse: false },
    wallets: [],
    income: { perPlatform: {}, bonus: 0, tips: 0, other: 0, weekAvg: 0, best: 0, worst: 0 },
    expenses: Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, { on: !c.off, min: c.min, max: c.max }])),
    debts: [],
    customDebtTypes: [],
    // Penjelasan selisih isian vs e-wallet per item, mis. { "exp:kontrakan": "tunai", "inc:other": "bukan" }
    verify: {},
    resilience: { savings: 0, goalSaved: 0, monthlySave: 0, habit: "", places: [], customPlaces: [], shock: "", goals: [], primaryGoal: "", horizon: 12, goalAmount: 0, wantsBankLoan: null },
    notes: "",
  });

  let S = load();
  const ui = { showErrors: false, analysisIdx: 0, analysisTimer: null, showPw: false, config: null, server: "checking", syncing: {}, walletError: "", openTx: null, combo: { open: false, active: -1, items: [] }, cal: null, adder: {}, enter: true };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(deepMerge(fresh(), JSON.parse(raw)));
    } catch (e) { /* storage unavailable */ }
    return fresh();
  }
  // Data lama (versi sebelumnya) disesuaikan ke struktur baru.
  function migrate(s) {
    const c = s.consent;
    if ("useOpenFinance" in c) { c.useWallet = c.useOpenFinance === true; c.useManual = c.useOpenFinance === false; delete c.useOpenFinance; delete c.acknowledgeUnverified; }
    if (s.account.city && s.account.city !== "Lainnya" && !CITIES.some(x => x.name === s.account.city)) { s.account.cityOther = s.account.city; s.account.city = "Lainnya"; }
    delete s.expenses.jajan; delete s.income.volatility; delete s.reconcileChoice; delete s.cash;
    s.overrides = {};   // angka "bulan ini" dari halaman Tangga dihapus: pendapatan & pengeluaran hanya diubah di Profil
    const pr = s.profile, rs = s.resilience;
    // v3 → v4: satu kolom "Lainnya" menjadi daftar opsi buatan sendiri
    const clean = (t) => String(t || "").trim().replace(/\./g, "");
    if (pr.platforms.includes("lainnya")) {
      const n = clean(pr.platformOther);
      pr.platforms = pr.platforms.filter(x => x !== "lainnya");
      if (n) { pr.customPlatforms.push(n); pr.platforms.push("c:" + n); if (s.income.perPlatform.lainnya) s.income.perPlatform["c:" + n] = s.income.perPlatform.lainnya; }
      delete s.income.perPlatform.lainnya;
    }
    if (pr.status === "lainnya") { const n = clean(pr.statusOther); pr.status = n ? "c:" + n : ""; if (n) pr.customStatuses.push(n); }
    if (pr.sideJobOtherOn && clean(pr.sideJobOther)) { pr.customSideJobs.push(clean(pr.sideJobOther)); pr.sideJobs.push(clean(pr.sideJobOther)); }
    if (rs.placeOtherOn && clean(rs.placeOther)) { rs.customPlaces.push(clean(rs.placeOther)); rs.places.push(clean(rs.placeOther)); }
    ["platformOther", "statusOther", "sideJobOtherOn", "sideJobOther"].forEach(k => delete pr[k]);
    ["placeOtherOn", "placeOther"].forEach(k => delete rs[k]);
    const sideMap = { "Warung / jualan makanan": "Warung", "Serabutan / harian": "Serabutan" };
    pr.sideJobs = pr.sideJobs.map(j => sideMap[j] || j).filter(j => SIDE_JOBS.includes(j) || pr.customSideJobs.includes(j));
    rs.places = rs.places.filter(x => SAVING_PLACES.includes(x) || rs.customPlaces.includes(x));
    const debtMap = { "Cicilan motor / leasing": "Cicilan", "Bank / KUR": "Bank", "Rentenir / informal": "Rentenir" };
    s.debts.forEach(d => {
      d.type = debtMap[d.type] || d.type;
      if (d.type === "Lainnya") { const n = clean(d.typeOther); d.type = n ? "c:" + n : ""; if (n && !s.customDebtTypes.includes(n)) s.customDebtTypes.push(n); }
      delete d.typeOther;
      if (d.due && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.due))) d.due = "";
    });
    return s;
  }
  function save() {
    try {
      const copy = JSON.parse(JSON.stringify(S));
      copy.account.password = ""; // never persist passwords in browser storage
      localStorage.setItem(KEY, JSON.stringify(copy));
    } catch (e) { /* ignore */ }
  }
  function deepMerge(base, extra) {
    for (const k of Object.keys(extra || {})) {
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k])) deepMerge(base[k], extra[k]);
      else base[k] = extra[k];
    }
    return base;
  }

  // ---------- Utils ----------
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- Masuk akun (prototipe: satu akun per perangkat) ----------
  // Password tidak pernah disimpan. Yang disimpan hanya hash PBKDF2 + salt acak, cukup untuk mencocokkan saat masuk.
  const LOGIN_KEY = "laju-login";
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  async function hashPass(pw, salt = b64(crypto.getRandomValues(new Uint8Array(16)))) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(atob(salt), ch => ch.charCodeAt(0)), iterations: 100000 }, key, 256);
    return { salt, hash: b64(bits) };
  }
  const isLoggedIn = () => { try { return localStorage.getItem(LOGIN_KEY) === "1"; } catch (e) { return true; } };
  const setLoggedIn = (on) => { try { if (on) localStorage.setItem(LOGIN_KEY, "1"); else localStorage.removeItem(LOGIN_KEY); } catch (e) { /* abaikan */ } };
  const phoneDigits = (s) => String(s || "").replace(/\D/g, "").replace(/^62/, "0");
  const needsLogin = () => S.finished && !!S.account.pass && !isLoggedIn();
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Math.round(n || 0).toLocaleString("id-ID");
  const rp = (n) => (n < 0 ? "−Rp" : "Rp") + fmt(Math.abs(n));
  const pct = (r) => `${Math.round(r * 100)}%`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  function set(path, val) {
    const keys = path.split("."); let o = S;
    for (let i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) o[keys[i]] = {}; o = o[keys[i]]; }
    o[keys[keys.length - 1]] = val;
  }
  const parseVal = (v) => (v === "true" ? true : v === "false" ? false : v === "null" ? null : v);
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (s) => (s ? s.split("-").reverse().join("/") : "");

  // Label keluaran untuk pilihan "Lainnya"
  const cityLabel = () => (S.account.city === "Lainnya" ? `Lainnya (${S.account.cityOther.trim() || "…"})` : S.account.city);
  // Opsi buatan pengguna disimpan dengan awalan "c:". Aplikasi & jenis utang tampil sebagai "Lainnya (nama)",
  // status/pekerjaan sampingan/tempat menabung tampil persis seperti yang diketik.
  const isCustom = (id) => typeof id === "string" && id.startsWith("c:");
  const platformName = (id) => (isCustom(id) ? `Lainnya (${id.slice(2)})` : PLATFORMS.find(p => p.id === id)?.label || ui.config?.platformLabels?.[id] || id);
  const debtTypeLabel = (d) => (isCustom(d.type) ? `Lainnya (${d.type.slice(2)})` : d.type);
  const statusLabel = (v) => (isCustom(v) ? v.slice(2) : STATUS.find(x => x.id === v)?.label || "");

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    eye: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    shield: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    badge: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.9 8.6a4 4 0 0 1 4.7-4.7 4 4 0 0 1 6.8 0 4 4 0 0 1 4.7 4.7 4 4 0 0 1 0 6.8 4 4 0 0 1-4.7 4.7 4 4 0 0 1-6.8 0 4 4 0 0 1-4.7-4.7 4 4 0 0 1 0-6.8Z"/><path d="m9 12 2 2 4-4"/></svg>',
    pen: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    info: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>',
    alert: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4m0 4h.01"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    chev: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    calendar: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  };
  const ST_ICON = {
    good: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6m0 4h.01"/></svg>',
    serious: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4m0 4h.01"/></svg>',
    critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>',
  };
  const statusPill = (id, label) => `<span class="st ${id}">${ST_ICON[id]}${label}</span>`;
  const band = (s) => BANDS.find(b => s >= b.from && s < b.to) || BANDS[0];

  // ---------- Component helpers ----------
  const card = (title, caption, body, cls = "") => `
    <section class="card ${cls}">
      ${title ? `<div class="card-head"><h2>${title}</h2>${caption ? `<p>${caption}</p>` : ""}</div>` : ""}
      ${body}
    </section>`;

  function field(id, label, control, hint = "", error = "") {
    return `<div class="field">
      <label for="${id}">${label}</label>
      ${control}
      ${error ? `<span class="err" id="${id}-err">${error}</span>` : hint ? `<span class="hint" id="${id}-hint">${hint}</span>` : ""}
    </div>`;
  }
  const textInput = (path, { id, placeholder = "", type = "text", kind = "text", invalid = false, extra = "" } = {}) =>
    `<input class="input" id="${id}" type="${type}" data-bind="${path}" data-kind="${kind}" value="${esc(get(path))}" placeholder="${esc(placeholder)}" aria-invalid="${invalid}" ${invalid ? `aria-describedby="${id}-err"` : ""} ${extra}>`;
  const money = (path, id, placeholder = "0") =>
    `<div class="money"><span aria-hidden="true">Rp</span><input class="input num" id="${id}" inputmode="numeric" autocomplete="off" data-bind="${path}" data-kind="money" value="${get(path) ? fmt(get(path)) : ""}" placeholder="${placeholder}"></div>`;

  function opt(path, val, title, caption = "", multi = false) {
    const cur = get(path);
    const on = multi ? (cur || []).includes(val) : String(cur) === String(val);
    return `<button type="button" class="opt ${multi ? "" : "single"}" aria-pressed="${on}" data-${multi ? "multi" : "set"}="${path}" data-val="${esc(val)}">
      <span class="box">${ICON.check}</span>
      <span><b>${title}</b>${caption ? `<small>${caption}</small>` : ""}</span>
    </button>`;
  }
  const chip = (path, val, label, multi = true, cls = "") => {
    const cur = get(path);
    const on = multi ? (cur || []).includes(val) : String(cur) === String(val);
    return `<button type="button" class="chip ${cls}" aria-pressed="${on}" data-${multi ? "multi" : "set"}="${path}" data-val="${esc(val)}">${label}</button>`;
  };
  // chip yang menyalakan/mematikan satu boolean (dipakai untuk "Lainnya" di daftar pilihan ganda)
  const sw = (path, label) => `<button type="button" class="switch" role="switch" aria-checked="${!!get(path)}" aria-label="${esc(label)}" data-switch="${path}"></button>`;
  const range = (path, id, min, max, step, label) => {
    const v = get(path); const p = ((v - min) / (max - min)) * 100;
    return `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}" data-bind="${path}" data-kind="num" style="--p:${p}%" aria-label="${esc(label)}">`;
  };
  const checkbox = (path, html) => `<label class="check"><input type="checkbox" data-check="${path}" ${get(path) ? "checked" : ""}><span>${html}</span></label>`;
  const stat = (label, value, tone = "", caption = "", calc = "") =>
    `<div class="stat ${tone}"><span>${label}</span><b class="num" ${calc ? `data-calc="${calc}"` : ""}>${value}</b>${caption ? `<small>${caption}</small>` : ""}</div>`;

  function previewText(fmtKind, v) {
    const t = String(v || "").trim();
    if (fmtKind === "lainnya") return `Akan tersimpan sebagai: <b>Lainnya (${t ? esc(t) : "…"})</b>`;
    return t ? `Tersimpan sebagai: <b>${esc(t)}</b>` : "Tersimpan persis seperti yang Anda ketik.";
  }
  const otherIn = (path, id, label, placeholder, fmtKind, invalid = false) => `<div class="other-in">
      <label for="${id}">${label}</label>
      ${textInput(path, { id, placeholder, invalid, extra: 'autocomplete="off" maxlength="60"' })}
      <p class="preview" data-preview-of="${path}" data-preview-fmt="${fmtKind}">${previewText(fmtKind, get(path))}</p>
    </div>`;

  // ---------- Calculations ----------
  // Isian manual = gambaran LENGKAP (tunai + non-tunai) dan selalu jadi dasar hitungan.
  // E-wallet (opsional) = alat VERIFIKASI: membuktikan sebagian isian, selisihnya dijelaskan pengguna
  // (tunai, rekening bank, e-wallet lain), lihat verifyItems(). Satu pengecualian: bila e-wallet
  // mencatat LEBIH BESAR dari isian (isian pasti terlalu kecil), angka e-wallet dipakai sebagai batas
  // bawah sampai pengguna menyesuaikan isian atau menandainya "bukan milik saya".
  const WEEKS = 4.33;
  const r1k = (n) => Math.round((Number(n) || 0) / 1000) * 1000;
  const perDayFormula = (v) => `${rp(Number(v) || 0)}/hari × ${S.profile.daysPerWeek} hari × ${String(WEEKS).replace(".", ",")} minggu`;
  // pencairan terverifikasi per aplikasi di profil, aplikasi buatan sendiri memakai pencairan "aplikasi lain"
  function verifiedFor(id, agg) {
    if (!isCustom(id)) return agg.byPlatform[id] || 0;
    const firstCustom = S.profile.platforms.find(isCustom);
    return id === firstCustom ? agg.byPlatform.lainnya || 0 : 0;
  }
  const expMidOf = (id) => { const e = S.expenses[id]; return e?.on ? (e.min + e.max) / 2 : 0; };
  const appIncomeManual = () => {
    const days = S.profile.daysPerWeek * WEEKS, inc = S.income;
    return S.profile.platforms.reduce((s, id) => s + r1k((Number(inc.perPlatform[id]) || 0) * days), 0) + (Number(inc.bonus) || 0) + (Number(inc.tips) || 0);
  };
  const debtListedOf = () => r1k(S.debts.reduce((s, d) => s + debtInstallment(d), 0));

  // Satu baris verifikasi per item: isian (m, rentang lo–hi) dibandingkan transaksi e-wallet (w).
  //   ok      = e-wallet cocok dengan isian (selisih ≤10% / masih di dalam rentang)
  //   part    = e-wallet lebih kecil → selisih tidak terlihat di e-wallet (perlu penjelasan: tunai, bank, …)
  //   none    = tidak ada di e-wallet sama sekali (semuanya lewat jalur lain)
  //   over    = e-wallet LEBIH BESAR dari isian → isian terlalu kecil
  //   missing = tidak diisi, padahal ada di e-wallet
  const VTOL = 0.1;
  function verifyItems(agg = aggregate()) {
    if (!(S.consent.useWallet && agg.count > 0)) return [];
    const R = S.verify || {}, items = [];
    const mk = (key, label, group, m, w, { lo = m, hi = m, floor = true, step } = {}) => {
      w = Math.round(w || 0); m = Math.round(m || 0);
      let status = null;
      if (m <= 0 && w > 0) status = "missing";
      else if (w <= 0) status = m > 0 ? "none" : null;
      else if (w > hi * 1.03 + 20000) status = "over";
      else if (w >= lo * (1 - VTOL)) status = "ok";
      else status = "part";
      if (!status) return;
      const reason = R[key] || "";
      const adjusted = floor && (status === "over" || status === "missing") && reason !== "bukan";
      items.push({ key, label, group, m, w, lo, hi, status, gap: Math.max(0, m - w), reason, adjusted, floor, step });
    };
    mk("inc:app", "Pendapatan dari aplikasi", "in", appIncomeManual(), agg.incomePlatform, { step: "pendapatan" });
    mk("inc:other", "Pemasukan di luar ojol", "in", Number(S.income.other) || 0, agg.incomeOther, { floor: false, step: "pendapatan" });
    for (const c of EXPENSE_CATEGORIES) {
      const e = S.expenses[c.id], on = !!e?.on;
      mk(`exp:${c.id}`, c.label, "out", expMidOf(c.id), agg.byCategory[c.id], { lo: on ? e.min : 0, hi: on ? e.max : 0, step: "pengeluaran" });
    }
    mk("debt", "Cicilan utang", "debt", debtListedOf(), r1k(agg.debtPayments), { step: "pengeluaran" });
    return items;
  }

  function calc() {
    const p = S.profile, inc = S.income, days = p.daysPerWeek * WEEKS;
    const agg = aggregate();
    const verified = !!S.consent.useWallet && agg.count > 0;
    const items = verifyItems(agg), it = Object.fromEntries(items.map(i => [i.key, i]));
    const lines = { income: [], expense: [] };
    const L = (arr, label, amount, src, formula) => { if (amount) arr.push({ label, amount, src, formula }); return amount; };
    const srcOf = (m, w) => !verified ? "self" : w > 0 && w >= m * (1 - VTOL) ? "verified" : w > 0 ? "partial" : "self";

    let appIncome = 0;
    for (const id of p.platforms) {
      const m = r1k((Number(inc.perPlatform[id]) || 0) * days), w = verified ? verifiedFor(id, agg) : 0;
      appIncome += L(lines.income, platformName(id), m, srcOf(m, w), perDayFormula(inc.perPlatform[id]) + (verified ? ` · e-wallet ${rp(w)}` : ""));
    }
    appIncome += L(lines.income, "Bonus / insentif", Number(inc.bonus) || 0, "self", "isian per bulan");
    appIncome += L(lines.income, "Tip penumpang", Number(inc.tips) || 0, "self", "isian per bulan");
    const ia = it["inc:app"];
    if (ia?.adjusted) appIncome += L(lines.income, "Penyesuaian ke e-wallet", ia.w - ia.m, "verified", `isian ${rp(ia.m)} lebih kecil dari pencairan tercatat ${rp(ia.w)}`);
    const other = Number(inc.other) || 0, io = it["inc:other"];
    let income = appIncome + L(lines.income, "Pemasukan di luar ojol", other, io ? srcOf(other, io.w) : "self", `isian per bulan${io ? ` · e-wallet ${rp(io.w)}` : ""}`);

    const active = EXPENSE_CATEGORIES.filter(c => S.expenses[c.id]?.on);
    const baseMin = active.reduce((s, c) => s + S.expenses[c.id].min, 0), baseMax = active.reduce((s, c) => s + S.expenses[c.id].max, 0);
    // Yang sudah terbukti di e-wallet adalah batas bawah: rentang kategori tidak boleh di bawah angka e-wallet
    // (kecuali ditandai "bukan milik saya"). Berlaku juga bila e-wallet masih di dalam rentang isian.
    let expMin = baseMin, expMax = baseMax;
    const raised = items.filter(i => i.group === "out" && i.reason !== "bukan" && i.w > i.lo);
    for (const i of raised) { expMin += i.w - i.lo; expMax += Math.max(0, i.w - i.hi); }
    const adjOut = raised.filter(i => i.adjusted);

    const debtListed = debtListedOf(), id_ = it.debt;
    const debtMonthly = id_?.adjusted ? id_.w : debtListed;
    const debtGuess = S.debts.filter(d => debtOpen(d) && !(Number(d.months) > 0));

    // Angka bulan ini yang diperbarui pengguna di halaman tangga menggantikan perkiraan onboarding.
    const ov = S.overrides || {};
    if (ov.income != null) income = ov.income;
    const expMid = ov.expense != null ? ov.expense : (expMin + expMax) / 2;
    if (ov.expense == null) {
      const outItems = items.filter(i => i.group === "out");
      const vOut = outItems.reduce((s, i) => s + (i.reason === "bukan" ? Math.min(i.w, i.m) : i.w), 0);
      L(lines.expense, "Pengeluaran rutin (isian Anda)", (baseMin + baseMax) / 2, !verified ? "self" : vOut > 0 ? "partial" : "self", `titik tengah rentang ${rp(baseMin)}–${rp(baseMax)}${verified ? ` · ${rp(vOut)} terlihat di e-wallet` : ""}`);
      const lift = (expMin + expMax) / 2 - (baseMin + baseMax) / 2;
      if (lift > 0) L(lines.expense, "Penyesuaian ke e-wallet", lift, "verified", `batas bawah rentang dinaikkan ke angka e-wallet: ${raised.map(i => i.label).join(", ")}`);
    } else L(lines.expense, "Pengeluaran rutin (diperbarui)", expMid, "self", "angka yang Anda perbarui di halaman Tangga");

    const verifiedIn = !verified || ov.income != null ? 0
      : (ia ? (ia.adjusted ? ia.w : Math.min(ia.w, ia.m)) : 0) + (io ? Math.min(io.w, io.m) : 0);
    const verifiedOut = !verified || ov.expense != null ? 0
      : items.filter(i => i.group === "out").reduce((s, i) => s + (i.reason === "bukan" ? Math.min(i.w, i.m) : i.w), 0);
    const share = (v, t) => (t > 0 ? clamp(v / t, 0, 1) : 0);
    return {
      appIncome, income, manualIncome: income, expMin, expMax, expMid, debtMonthly, debtListed, debtWallet: verified ? r1k(agg.debtPayments) : 0, debtGuess,
      expense: expMid + debtMonthly, verified, agg, items, lines, verifiedIn, verifiedOut,
      shareIn: share(verifiedIn, income), shareOut: share(verifiedOut, expMid), activeCount: active.length,
    };
  }

  // Nilai satu kategori yang benar-benar dipakai hitungan: titik tengah rentang, dengan batas bawah e-wallet.
  function catEffective(id, c) {
    const i = c.items.find(x => x.key === `exp:${id}`);
    if (!i || i.reason === "bukan" || i.w <= i.lo) return expMidOf(id);
    return (Math.max(i.lo, i.w) + Math.max(i.hi, i.w)) / 2;
  }

  // Menaikkan isian supaya tidak lebih kecil dari yang sudah terbukti di e-wallet.
  function applyVerify(key, agg = aggregate()) {
    const days = S.profile.daysPerWeek * WEEKS;
    if (key === "inc:app") {
      for (const id of S.profile.platforms) {
        const w = verifiedFor(id, agg), m = (Number(S.income.perPlatform[id]) || 0) * days;
        if (w > m) S.income.perPlatform[id] = Math.ceil(w / days / 1000) * 1000;
      }
    } else if (key === "inc:other") S.income.other = r1k(agg.incomeOther);
    else if (key.startsWith("exp:")) {
      const id = key.slice(4), e = S.expenses[id], v = Math.min(EXP_MAX, Math.ceil((agg.byCategory[id] || 0) / EXP_STEP) * EXP_STEP);
      if (!e.on) { e.on = true; e.min = v; e.max = v; } else { e.min = Math.max(e.min, v); e.max = Math.max(e.max, e.min); }
    }
    delete S.verify[key];
  }

  // Jalur uang yang dipilih pengguna (Profil): e-wallet, rekening bank, tunai, atau lainnya.
  const CHANNELS = [...WALLETS.map(w => ({ id: w.id, label: w.label, wallet: true })), { id: "tunai", label: "Tunai" }];
  const PLATFORM_WALLET = { gojek: "gopay", shopeefood: "shopeepay", spx: "shopeepay", grab: "ovo", maxim: "dana" };   // tebakan awal saja
  const channelLabel = (id) => (isCustom(id) ? id.slice(2) : CHANNELS.find(c => c.id === id)?.label || id);
  function channelStatus(agg = aggregate()) {
    const chosen = S.profile.channels || [];
    const connected = S.wallets.filter(w => w.summary).map(w => w.walletId);
    const wallets = chosen.filter(id => WALLETS.some(w => w.id === id));
    return {
      chosen, connected,
      notConnected: wallets.filter(id => !connected.includes(id)),
      offline: chosen.filter(id => !WALLETS.some(w => w.id === id)),   // bank, tunai, lainnya: tidak bisa dihubungkan
      extra: connected.filter(id => !chosen.includes(id)),
    };
  }
  const REASONS_GAP = () => {
    const nc = channelStatus().notConnected.map(channelLabel);
    return [["tunai", "Tunai"], ["bank", "Rekening bank"], ["lain", nc.length ? nc.join(" / ") : "E-wallet lain"], ["tinggi", "Perkiraan kebesaran"]];
  };
  const REASON_LABEL = (r) => ({ tunai: "tunai", bank: "rekening bank", lain: "e-wallet lain", tinggi: "perkiraan kebesaran", bukan: "dikecualikan" }[r] || "");
  const V_STATUS = {
    ok: ["good", "Cocok"], part: ["warn", "Sebagian"], none: ["warn", "Tidak di e-wallet"],
    over: ["serious", "Isian kurang"], missing: ["serious", "Belum diisi"],
  };
  // Satu baris verifikasi per item. interactive = tampilkan pilihan alasan / tombol.
  function verifyLine(i, { interactive = false } = {}) {
    if (!i) return "";
    if (i.key === "inc:app" && i.m === 0) return `<div class="vf none"><p>E-wallet: pencairan ${rp(i.w)}/bln. Isi pendapatan Anda di atas.</p></div>`;
    const excluded = (i.status === "over" || i.status === "missing") && i.reason === "bukan";
    const [st, stLabel] = excluded ? ["warn", "Dikecualikan"] : V_STATUS[i.status];
    const range = i.lo !== i.hi ? `${rp(i.lo)}–${rp(i.hi)}` : rp(i.m);
    let text, actions = "";
    if (excluded) text = `E-wallet ${rp(i.w)}, ditandai ${i.group === "in" ? "pinjaman / titipan" : "bukan milik Anda"}.`;
    else if (i.status === "ok") text = `E-wallet ${rp(i.w)}, isian ${range}.`;
    else if (i.status === "part") text = `E-wallet ${rp(i.w)}, isian ${range}. Sisa ${rp(i.gap)} lewat mana?`;
    else if (i.status === "none") text = `Tidak ada di e-wallet. Lewat mana?`;
    else text = `E-wallet ${rp(i.w)}, isian ${i.status === "missing" ? "kosong" : range}.${i.adjusted ? ` Laju pakai ${rp(i.w)}.` : ""}`;
    if (i.status === "part" || i.status === "none") {
      if (interactive) actions = `<div class="chips vf-chips">${REASONS_GAP().map(([v, l]) => chip(`verify.${i.key}`, v, l, false)).join("")}</div>${i.reason === "tinggi" ? `<p class="vf-note">Turunkan ke sekitar ${rp(i.w)}.</p>` : ""}`;
      else if (i.reason) text += ` (${REASON_LABEL(i.reason)})`;
    } else if (i.status === "over" || i.status === "missing") {
      const notMine = i.group === "in" ? "Pinjaman / titipan" : i.group === "debt" ? "Bukan cicilan saya" : "Bukan milik saya";
      if (interactive) actions = `<div class="chips vf-chips">${i.key === "debt" ? `<button type="button" class="chip" data-action="addDebt">Tambah utang</button>` : `<button type="button" class="chip" data-action="vfix" data-id="${i.key}">Pakai ${rp(i.w)}</button>`}${chip(`verify.${i.key}`, "bukan", notMine, false)}</div>`;
    }
    return `<div class="vf ${excluded ? "excluded" : i.status}"><span class="vf-head">${statusPill(st, stLabel)}</span><p>${text}</p>${actions}</div>`;
  }

  // Pengecekan: hanya hal yang bisa ditindaklanjuti, item sejenis digabung jadi satu baris.
  const ESSENTIAL = ["makan", "bbm"];
  function dataChecks(c) {
    const out = [], agg = c.agg, ov = S.overrides || {};
    const names = (arr) => arr.map(i => i.label).join(", ");
    if (c.verified) {
      const small = c.items.filter(i => i.floor && (i.status === "over" || i.status === "missing") && i.reason !== "bukan");
      if (small.length) out.push({ lv: "warn", step: small[0].step, text: `Lebih kecil dari e-wallet: ${names(small)}. Laju pakai angka e-wallet.` });
      const other = c.items.find(i => i.key === "inc:other" && (i.status === "over" || i.status === "missing") && i.reason !== "bukan");
      if (other) out.push({ lv: "warn", step: "pendapatan", text: `Ada uang masuk ${rpShort(other.w)} di e-wallet. Pendapatan atau pinjaman?` });
      const high = c.items.filter(i => i.reason === "tinggi" && (i.status === "part" || i.status === "none"));
      if (high.length) out.push({ lv: "warn", step: high[0].step, text: `Turunkan perkiraan: ${names(high)}.` });
      const open = c.items.filter(i => (i.status === "part" || i.status === "none") && !i.reason && i.gap >= 50000);
      if (open.length) out.push({ lv: "info", step: open[0].step, text: `${open.length} selisih belum dijelaskan.` });
      // uang di luar e-wallet harus ada asalnya
      if (ov.expense == null && ov.income == null) {
        const g = (grp) => c.items.filter(i => i.group === grp && (i.status === "part" || i.status === "none") && i.reason !== "tinggi").reduce((s, i) => s + i.gap, 0);
        const gap = g("out") + g("debt") + agg.internalIn - (g("in") + agg.internalOut);
        if (gap > Math.max(200000, (g("in") + agg.internalOut) * 0.1)) out.push({ lv: "warn", step: "pendapatan", text: `Uang tunai keluar ${rpShort(r1k(gap))} lebih banyak dari yang masuk. Ada pendapatan tunai yang belum diisi?` });
      }
      if (agg.expenseTotal > c.expMax && ov.expense == null) out.push({ lv: "warn", step: "pengeluaran", text: `Uang keluar di e-wallet (${rpShort(agg.expenseTotal)}) melebihi perkiraan tertinggi Anda.` });
    }
    const miss = ESSENTIAL.filter(id => !expMidOf(id) && !(c.verified && agg.byCategory[id]));
    if (miss.length) out.push({ lv: "warn", step: "pengeluaran", text: `Belum diisi: ${miss.map(categoryLabel).join(", ")}.` });
    if (c.debtGuess.length) out.push({ lv: "info", step: "pengeluaran", text: `Lama cicilan ${c.debtGuess.map(debtTypeLabel).join(", ")} belum diisi (dianggap 12 bulan).` });
    return out;
  }

  // Server prototipe menyimpan izin e-wallet di memori: setelah server dimulai ulang daftarnya kosong.
  // Ringkasan yang sudah tersinkron tetap dipakai (ditandai "stale") supaya angka tidak berubah diam-diam.
  function mergeServerWallets(server) {
    const lost = S.wallets.filter(w => w.summary && !server.some(x => x.walletId === w.walletId));
    return { wallets: [...server.map(w => ({ ...w, stale: false })), ...lost.map(w => ({ ...w, stale: true }))], lost };
  }
  function aggregate() {
    const a = { count: 0, incomePlatform: 0, incomeOther: 0, expenseTotal: 0, debtPayments: 0, internalIn: 0, internalOut: 0, txCount: 0, byPlatform: {}, byCategory: {}, daily: [], recognized: 0 };
    for (const w of S.wallets) {
      const s = w.summary; if (!s) continue;
      a.count++; a.incomePlatform += s.incomePlatform; a.incomeOther += s.incomeOther; a.expenseTotal += s.expenseTotal;
      a.debtPayments += s.debtPayments; a.txCount += s.txCount; a.recognized += s.expenseTotal * s.categorizedRatio;
      a.internalIn += s.internalIn || 0; a.internalOut += s.internalOut || 0;
      for (const [k, v] of Object.entries(s.incomeByPlatform)) a.byPlatform[k] = (a.byPlatform[k] || 0) + v;
      for (const [k, v] of Object.entries(s.expenseByCategory)) a.byCategory[k] = (a.byCategory[k] || 0) + v;
      s.dailyIncome.forEach((v, i) => (a.daily[i] = (a.daily[i] || 0) + v));
    }
    a.activeDays = a.daily.filter(v => v > 0).length;
    a.categorizedRatio = a.expenseTotal ? a.recognized / a.expenseTotal : 1;
    return a;
  }
  const categoryLabel = (id) => EXPENSE_CATEGORIES.find(c => c.id === id)?.label || ui.config?.categoryLabels?.[id] || "Belum dikenali";
  const walletMeta = (id) => WALLETS.find(w => w.id === id);
  const providerName = () => (ui.config?.mode === "live" ? ui.config.provider : "Brick / Ayoconnect");
  function relTime(iso) {
    if (!iso) return "";
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m} menit lalu`;
    if (m < 1440) return `${Math.round(m / 60)} jam lalu`;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  // Seberapa naik-turun pendapatan, dihitung dari hari tersepi, rata-rata, dan hari teramai seminggu.
  // Simpangan baku ditaksir dari rentang (max − min) ÷ d2(n), n = jumlah hari kerja per minggu.
  const D2 = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704 };
  function volatility() {
    const b = Number(S.income.best) || 0, w = Number(S.income.worst) || 0, a = Number(S.income.weekAvg) || 0;
    if (!a || !b) return { ready: false };
    const sigma = Math.max(0, b - w) / D2[clamp(S.profile.daysPerWeek, 2, 7)];
    const cv = sigma / a;
    const id = cv < 0.15 ? "stabil" : cv < 0.3 ? "naikturun" : "fluktuatif";
    return { ready: true, ordered: w <= a && a <= b, sigma, cv, id, b, w, a, label: { stabil: "Cukup stabil", naikturun: "Naik-turun", fluktuatif: "Sangat fluktuatif" }[id], st: { stabil: "good", naikturun: "warn", fluktuatif: "serious" }[id] };
  }
  function verifiedCv(agg) {
    const v = agg.daily.filter(x => x > 0);
    if (v.length < 5) return null;
    const m = v.reduce((s, x) => s + x, 0) / v.length;
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
    return sd / m;
  }

  // ---------- Skor kesehatan finansial ----------
  // Mengikuti kerangka FinHealth (Financial Health Network): 4 pilar, Spend, Save,
  // Borrow, Plan, masing-masing 25 poin, semuanya dari data objektif (tanpa
  // pertanyaan perasaan). Batas kategori juga mengikuti FinHealth: <40 rentan,
  // 40–79 bertahan (dipecah jadi "perlu dibenahi" & "cukup sehat"), ≥80 sehat.
  // Setiap komponen punya poin, nilai sekarang, dan saran, ditampilkan apa adanya.
  const RECORDS_LABEL = { selalu: "Selalu catat", kadang: "Kadang-kadang", never: "Tidak pernah catat" };
  const SHOCK_LABEL = { ok: "Bisa tanpa pinjam", partial: "Bisa sebagian", borrow: "Harus pinjam dulu", none: "Tidak bisa sama sekali" };

  // Aktivitas di aplikasi 30 hari terakhir, membuat skor ikut bergerak saat pengguna mencatat.
  function recentActivity() {
    const since = Date.now() - 30 * 864e5;
    const entries = S.ledger.filter(e => !e.undone && new Date(e.at).getTime() >= since);
    const deposits = entries.filter(e => e.type === "deposit" || e.type === "goal-deposit").reduce((s, e) => s + (e.amount || 0), 0);
    return { entries: entries.length, deposits };
  }
  const effectiveMonthlySave = () => Math.max(Number(S.resilience.monthlySave) || 0, recentActivity().deposits);

  // persen untuk tampilan, angka ekstrem (salah ketik, dsb.) diringkas supaya tetap terbaca
  const pctCap = (v) => v > 1 ? "lebih dari 100%" : v < -1 ? "lebih dari −100%" : pct(v);
  function health(c) {
    const r = S.resilience, p = S.profile, act = recentActivity();
    const income = c.income, net = income - c.expense;
    const surplusRatio = income > 0 ? net / income : -1;
    const dsr = income > 0 ? c.debtMonthly / income : (c.debtMonthly > 0 ? 1 : 0);
    const emergency = Number(r.savings) || 0;
    const months = c.expense > 0 ? emergency / c.expense : 0;
    const vol = volatility();
    const open = S.debts.filter(d => (Number(d.remaining) || 0) > 0);
    const high = open.filter(d => HIGH_COST.includes(d.type) || Number(d.rate) >= 2);
    const totalDebt = open.reduce((s, d) => s + Number(d.remaining), 0);
    const dti = income > 0 ? totalDebt / (12 * income) : (totalDebt ? 1 : 0);
    const monthlySave = effectiveMonthlySave();
    const saveRate = income > 0 ? monthlySave / income : 0;
    const safePlaces = r.places.filter(x => x !== "Uang tunai di rumah").length;
    const P = (label, pts, max, value, tip) => ({ label, pts: Math.round(clamp(pts, 0, max)), max, value, tip });

    const groups = [
      { id: "cash", label: "Arus kas", parts: [
        P("Sisa uang per bulan", surplusRatio >= 0.1 ? 15 : surplusRatio >= 0 ? 8 + (surplusRatio / 0.1) * 7 : 8 + (surplusRatio / 0.3) * 8, 15,
          `${rp(net)} · ${pctCap(surplusRatio)} dari pendapatan`, "Usahakan sisa minimal 10% pendapatan setiap bulan."),
        P("Kestabilan pendapatan", vol.ready ? { stabil: 5, naikturun: 3, fluktuatif: 1 }[vol.id] : 2, 5,
          vol.ready ? `${vol.label} · naik-turun ±${pct(vol.cv)}` : "Belum diisi", "Pendapatan naik-turun: susun anggaran dari pendapatan hari paling sepi."),
        P("Kebiasaan mencatat", Math.max({ selalu: 5, kadang: 2 }[p.recordsIncome] || 0, act.entries >= 8 ? 5 : act.entries >= 3 ? 3 : 0), 5,
          `${RECORDS_LABEL[p.recordsIncome] || "Belum diisi"}${act.entries ? ` · ${act.entries} catatan di Laju (30 hari)` : ""}`, "Catat setiap setoran dan pembayaran di Laju, minimal 8 catatan sebulan."),
      ] },
      { id: "save", label: "Tabungan & ketahanan", parts: [
        P("Dana darurat", Math.min(1, months / 3) * 12, 12,
          months > 24 ? "Lebih dari 24 bulan pengeluaran" : `${months.toFixed(1).replace(".", ",")} bulan pengeluaran`, "Kumpulkan dana darurat sampai 3 bulan pengeluaran."),
        P("Tes guncangan Rp1 juta", Math.max({ ok: 5, partial: 3, borrow: 1 }[r.shock] || 0, emergency >= 1e6 ? 5 : emergency >= 5e5 ? 3 : 0), 5,
          emergency >= 1e6 ? "Bisa, dana darurat ≥ Rp1 juta" : SHOCK_LABEL[r.shock] || "Belum diisi", "Bantalan Rp1 juta membuat biaya mendadak tidak perlu ditutup utang."),
        P("Menabung rutin", Math.min(1, saveRate / 0.1) * 8, 8,
          `${rp(monthlySave)}/bln · ${pctCap(saveRate)} dari pendapatan${act.deposits > (Number(r.monthlySave) || 0) ? " · dari setoran tercatat" : ""}`, "Sisihkan rutin, targetnya 10% pendapatan."),
      ] },
      { id: "debt", label: "Utang", parts: [
        P("Porsi cicilan", dsr <= 0.1 ? 12 : dsr <= 0.3 ? 12 - ((dsr - 0.1) / 0.2) * 6 : dsr <= 0.5 ? 6 - ((dsr - 0.3) / 0.2) * 6 : 0, 12,
          `${pctCap(dsr)} dari pendapatan`, "Jaga cicilan di bawah 30% pendapatan (batas OJK untuk pinjol mulai 2026)."),
        P("Utang bunga tinggi", high.length === 0 ? 8 : high.length === 1 ? 3 : 0, 8,
          high.length ? `${high.length} utang · ${rp(high.reduce((s, d) => s + Number(d.remaining), 0))}` : "Tidak ada", "Lunasi pinjol, paylater, dan rentenir lebih dulu."),
        P("Total utang", dti <= 0.3 ? 5 : dti <= 0.6 ? (5 * (0.6 - dti)) / 0.3 : 0, 5,
          totalDebt ? `${rp(totalDebt)} · ${pctCap(dti)} pendapatan setahun` : "Tidak ada utang", "Total utang sebaiknya di bawah 30% pendapatan setahun."),
      ] },
      { id: "plan", label: "Rencana & proteksi", parts: [
        P("BPJS Kesehatan", p.hasBpjsKes ? 6 : 0, 6, p.hasBpjsKes ? "Aktif" : "Belum", "BPJS Kesehatan adalah bantalan termurah saat sakit."),
        P("BPJS Ketenagakerjaan", p.hasBpjsKet ? 5 : 0, 5, p.hasBpjsKet ? "Aktif" : "Belum", "Melindungi dari kecelakaan kerja. Ojol dapat diskon iuran 50%."),
        P("Asuransi lain", p.hasInsurance ? 2 : 0, 2, p.hasInsurance ? "Ada" : "Tidak ada", "Opsional: asuransi kendaraan atau mikro."),
        P("Rekening bank", p.hasBank ? 4 : 0, 4, p.hasBank ? "Ada" : "Belum", "Rekening bank dibutuhkan untuk rekam jejak dan kredit resmi."),
        P("Tujuan yang jelas", r.primaryGoal ? (Number(r.goalAmount) > 0 ? 4 : 2) : 0, 4,
          r.primaryGoal ? (Number(r.goalAmount) > 0 ? `Ada target ${rp(Number(r.goalAmount))}` : "Ada, belum ada nominal") : "Belum ada",
          "Tetapkan tujuan utama beserta nominal dan tenggatnya."),
        P("Simpanan di tempat aman", safePlaces >= 2 ? 4 : safePlaces === 1 ? 2 : 0, 4,
          `${safePlaces} tempat selain uang tunai`, "Simpan di rekening/e-wallet terpisah. Uang tunai di rumah mudah terpakai."),
      ] },
    ];
    const pillars = groups.map(g => {
      const pts = g.parts.reduce((s, x) => s + x.pts, 0), max = g.parts.reduce((s, x) => s + x.max, 0);
      const worst = [...g.parts].sort((a, b) => (b.max - b.pts) - (a.max - a.pts))[0];
      return { ...g, pts, max, score: Math.round((pts / max) * 100), tip: worst.tip, note: g.parts.map(x => `${x.label}: ${x.value}`).slice(0, 2).join(" · ") };
    });
    const total = clamp(pillars.reduce((s, g) => s + g.pts, 0), 0, 100);
    return { total, grade: band(total), pillars, months, surplusRatio, dsr, dti, saveRate, net, emergency, totalDebt, highDebts: high };
  }

  // ---------- Hasil: data viz ----------
  const vizTable = (head, rows) => `<details class="viz-table"><summary>Lihat angka dalam tabel</summary><table>
      <thead><tr>${head.map((h, i) => `<th class="${i ? "n" : ""}" scope="col">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map((v, i) => `<td class="${i ? "n" : ""}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
  const ticks = (items) => `<div class="ticks" aria-hidden="true">${items.map(([at, label, cls = ""]) => `<span class="${at === 0 ? "start" : at === 100 ? "end" : ""} ${cls}" style="left:${at}%">${label}</span>`).join("")}</div>`;

  function vizScore(h) {
    const b = h.grade;
    const weakest = [...h.pillars].sort((x, y) => x.score - y.score)[0];
    return `<section class="card viz-card" aria-labelledby="score-h">
      <div class="card-head"><h2 id="score-h">Skor kesehatan finansial</h2></div>
      <div class="hero-top"><span class="hero-num">${h.total}<small>/100</small></span>${statusPill(b.id, b.label)}</div>
      <div class="sband" role="img" aria-label="Skor ${h.total} dari 100, kategori ${b.label}">
        <div class="sband-marker" style="left:${clamp(h.total, 0, 100)}%"></div>
        <div class="sband-bar">${BANDS.map(x => `<span style="flex:${Math.min(x.to, 100) - x.from};background:${x.color}"></span>`).join("")}</div>
        ${ticks([[0, "0"], [40, "40"], [60, "60"], [80, "80"], [100, "100"]])}
      </div>
      <div class="legend">${BANDS.map(x => `<span><i style="background:${x.color}"></i>${x.label}</span>`).join("")}</div>
      <p class="hero-msg">Paling lemah: <strong>${weakest.label}</strong> (${weakest.pts} dari ${weakest.max} poin). ${weakest.tip}</p>
    </section>`;
  }

  function vizPillars(h) {
    return `<section class="card viz-card" aria-labelledby="pil-h">
      <div class="card-head"><h2 id="pil-h">Empat pilar kesehatan finansial</h2><p>Tiap pilar maksimal 25 poin.</p></div>
      <div class="hbars">${h.pillars.map(p => {
        const b = band(p.score);
        return `<div>
          <div class="hb-head"><span>${p.label}</span><span class="val"><b>${p.pts}<small class="of">/${p.max}</small></b>${statusPill(b.id, b.label)}</span></div>
          <div class="hb-track"><span class="grid" style="left:25%"></span><span class="grid" style="left:50%"></span><span class="target" style="left:80%"></span>
            <span class="hb-fill" style="width:${Math.max(p.score, 1)}%;background:${b.color}" tabindex="0" data-tip="${esc(p.label)}: ${p.pts} dari ${p.max} poin (${b.label})."></span></div>
          <details class="parts"><summary>Rincian poin <small>${p.parts.length} komponen</small></summary>
            <ul class="pt-list">${p.parts.map(pt => {
              const k = pt.pts >= pt.max ? "full" : pt.pts > 0 ? "part" : "zero";
              return `<li class="pt ${k}">
                <div class="pt-row"><span class="pt-name">${pt.label}</span><span class="pt-score num"><b>${pt.pts}</b>/${pt.max}</span></div>
                <div class="pt-bar" aria-hidden="true"><i style="width:${(pt.pts / pt.max) * 100}%"></i></div>
                <span class="pt-val">${esc(pt.value)}</span>
              </li>`;
            }).join("")}</ul>
            <p class="pt-tip">${p.pts >= p.max ? `${ST_ICON.good}<span>Semua poin pilar ini sudah terkumpul.</span>` : `${ICON.info}<span><b>Saran:</b> ${p.tip}</span>`}</p>
          </details>
        </div>`;
      }).join("")}</div>
      ${ticks([[0, "0"], [25, "25%"], [50, "50%"], [80, "80% sehat", "tgt"], [100, "100%"]])}
      ${vizTable(["Pilar", "Poin", "Status"], h.pillars.map(p => [p.label, `${p.pts}/${p.max}`, band(p.score).label]))}
    </section>`;
  }

  // Arus kas: SATU batang pendapatan yang dibagi menjadi pengeluaran, cicilan, dan sisa.
  // Bila defisit, batang memanjang melewati garis pendapatan dan kelebihannya diarsir merah.
  const SRC_TAG = { verified: '<span class="src v">terverifikasi</span>', partial: '<span class="src p">sebagian terverifikasi</span>', self: '<span class="src s">isian sendiri</span>' };
  function vizCashflow(c, h) {
    const inc = c.income, exp = c.expMid, debt = c.debtMonthly, net = inc - exp - debt;
    const total = Math.max(inc, exp + debt, 1);
    const w = (v) => (Math.max(0, v) / total) * 100;
    const segs = [
      { k: "out", label: "Pengeluaran rutin", v: exp, color: "var(--viz-out)" },
      ...(debt > 0 ? [{ k: "debt", label: "Cicilan utang", v: debt, color: "var(--viz-debt)" }] : []),
      ...(net > 0 ? [{ k: "net", label: "Sisa", v: net, color: "var(--viz-in)" }] : []),
    ];
    const dsr = h.dsr, dsrSt = dsr <= 0.3 ? "good" : dsr <= 0.4 ? "warn" : "critical";
    const dsrCol = { good: "var(--st-good)", warn: "var(--st-warn)", critical: "var(--st-critical)" }[dsrSt];
    const line = (l) => `<li><span class="cf-l">${esc(l.label)} ${SRC_TAG[l.src]}<small>${esc(l.formula)}</small></span><b class="num">${rp(l.amount)}</b></li>`;
    const debtLines = c.debtMonthly > c.debtListed
      ? [{ label: "Dibayar lewat e-wallet", amount: c.debtMonthly, src: "verified", formula: `lebih besar dari daftar utang Anda (${rp(c.debtListed)}/bln), jadi angka e-wallet yang dipakai` }]
      : S.debts.filter(debtOpen).map(d => ({ label: debtTypeLabel(d), amount: r1k(debtInstallment(d)), src: "self", formula: Number(d.months) > 0 ? `sisa ${rp(Number(d.remaining))} ÷ ${d.months} bulan` : `sisa ${rp(Number(d.remaining))} ÷ 12 bulan (perkiraan, lama cicilan belum diisi)` }));
    return `<section class="card viz-card" aria-labelledby="cf-h">
      <div class="card-head"><h2 id="cf-h">Arus kas per bulan</h2></div>
      <div class="cf-top"><span>Pendapatan</span><b class="num">${rp(inc)}</b></div>
      <div class="cf-bar ${net < 0 ? "deficit" : ""}" ${net < 0 ? `style="--inc:${w(inc)}%"` : ""} role="img" aria-label="Pendapatan ${rp(inc)}: pengeluaran ${rp(exp)}${debt ? `, cicilan ${rp(debt)}` : ""}, ${net >= 0 ? `sisa ${rp(net)}` : `kurang ${rp(-net)}`}">
        ${segs.map(s => `<span style="width:${w(s.v)}%;background:${s.color}" data-tip="${s.label}: ${rp(s.v)} (${pct(inc > 0 ? s.v / inc : 0)} dari pendapatan)" tabindex="0"></span>`).join("")}
        ${net < 0 ? `<span class="cf-inc" style="left:${w(inc)}%"><i>Pendapatan</i></span>` : ""}
      </div>
      <ul class="cf-legend">${segs.map(s => `<li><i style="background:${s.color}"></i><span>${s.label}</span><b class="num">${rp(s.v)}</b><small class="num">${pct(inc > 0 ? s.v / inc : 0)}</small></li>`).join("")}
        ${net < 0 ? `<li class="neg"><i></i><span>Kurang per bulan ${statusPill("critical", "Defisit")}</span><b class="num">−${rp(-net)}</b><small></small></li>` : ""}</ul>
      <div>
        <div class="kv"><span>Porsi cicilan dari pendapatan: <span class="num">${pct(dsr)}</span></span>${statusPill(dsrSt, dsr <= 0.3 ? "Aman" : dsr <= 0.4 ? "Waspada" : "Terlalu berat")}</div>
        <div class="meter" style="background:color-mix(in oklab, ${dsrCol} 20%, var(--card))"><span class="meter-fill" style="width:${(Math.min(dsr, 0.6) / 0.6) * 100}%;background:${dsrCol}"></span><span class="meter-tick" style="left:50%"></span></div>
        ${ticks([[0, "0%"], [50, "30% batas aman", "tgt"], [100, "60%+"]])}
      </div>
      <details class="cf-calc"><summary>Rincian hitungan</summary>
        <p class="cf-h">Pendapatan</p><ul>${c.lines.income.map(line).join("") || `<li><span class="cf-l">Belum ada pendapatan</span><b class="num">Rp0</b></li>`}</ul>
        <p class="cf-h">Pengeluaran rutin</p><ul>${c.lines.expense.map(line).join("") || `<li><span class="cf-l">Belum ada pengeluaran</span><b class="num">Rp0</b></li>`}</ul>
        ${debtLines.length ? `<p class="cf-h">Cicilan utang</p><ul>${debtLines.map(line).join("")}</ul>` : ""}
        <p class="cf-h">Sisa</p><ul><li><span class="cf-l">Pendapatan − pengeluaran − cicilan<small>${rp(inc)} − ${rp(exp)} − ${rp(debt)}</small></span><b class="num">${rp(net)}</b></li>
          <li><span class="cf-l">Porsi cicilan<small>${rp(debt)} ÷ ${rp(inc)}</small></span><b class="num">${pct(dsr)}</b></li></ul>
        <p class="hint">1 bulan = ${String(WEEKS).replace(".", ",")} minggu.</p>
      </details>
    </section>`;
  }

  function vizEmergency(c, h) {
    const months = h.months, st = months < 1 ? "critical" : months < 3 ? "warn" : "good";
    const col = { good: "var(--st-good)", warn: "var(--st-warn)", critical: "var(--st-critical)" }[st];
    const target1 = c.expense, gap = Math.max(0, target1 - S.resilience.savings);
    return `<section class="card viz-card" aria-labelledby="ef-h">
      <div class="card-head"><h2 id="ef-h">Dana darurat</h2><p>Target: 3 bulan pengeluaran.</p></div>
      <div>
        <div class="kv"><span>Tabungan ${rp(S.resilience.savings)} ≈ <span class="num">${months > 24 ? "lebih dari 24" : months.toFixed(1).replace(".", ",")}</span> bulan pengeluaran</span>${statusPill(st, months < 1 ? "Belum aman" : months < 3 ? "Sebagian" : "Aman")}</div>
        <div class="meter" style="background:color-mix(in oklab, ${col} 20%, var(--card))" role="img" aria-label="Dana darurat ${months.toFixed(1)} dari target 3 bulan">
          <span class="meter-fill" style="width:${Math.max(0.8, (Math.min(months, 3) / 3) * 100)}%;background:${col}"></span><span class="meter-tick" style="left:33.33%"></span></div>
        ${ticks([[0, "0"], [33.33, `1 bulan · ${rp(target1)}`, "tgt"], [100, `3 bulan`]])}
      </div>
      <p class="hint" style="font-size:.85rem">${gap > 0 ? `Kurang <strong>${rp(gap)}</strong> lagi untuk 1 bulan pengeluaran.${S.resilience.monthlySave ? ` ±${Math.ceil(gap / S.resilience.monthlySave)} bulan dengan setoran ${rpShort(S.resilience.monthlySave)}/bln.` : ""}` : "1 bulan pengeluaran sudah aman. Lanjut ke 3 bulan."}</p>
    </section>`;
  }

  // Hasil verifikasi: porsi isian yang terbukti di e-wallet + hal yang perlu dicek.
  // checks: true = daftar lengkap (Hasil), "summary" = satu baris (Dashboard), false = tanpa daftar.
  const CHECK_ICON = { ok: "good", warn: "serious", info: "warn" };
  function vizReliability(c, { checks = true } = {}) {
    const list = checks ? dataChecks(c) : [];
    const checkList = !list.length ? ""
      : checks === "summary" ? `<p class="checks-sum">${ST_ICON.serious}<span>${list.length} hal perlu dicek. <a class="link-btn inline" href="${editUrl("keuangan")}">Cek di Profil</a></span></p>`
      : `<ul class="checks">${list.map(k => `<li class="${k.lv}">${ST_ICON[CHECK_ICON[k.lv]]}<span>${esc(k.text)}</span></li>`).join("")}</ul>`;
    if (!c.verified) {
      return `<section class="card viz-card" aria-labelledby="rel-h">
        <div class="card-head"><h2 id="rel-h">Verifikasi</h2></div>
        <div class="kv" style="margin:0"><span>Belum ada e-wallet terhubung</span>${statusPill("critical", "Belum terverifikasi")}</div>
        ${checkList}
      </section>`;
    }
    const row = (label, share, verifiedAmt, total) => {
      const p = Math.round(share * 100);
      return `<div class="src-row">
        <div class="kv" style="margin:0"><span>${label} <b class="num">${p}%</b></span><span class="num src-amt">${rpShort(verifiedAmt)} dari ${rpShort(total)}</span></div>
        <div class="stack100" role="img" aria-label="${label}: ${p}% terverifikasi">${p > 0 ? `<span style="flex:${p};background:var(--viz-in)"></span>` : ""}${p < 100 ? `<span style="flex:${100 - p};background:var(--viz-self)"></span>` : ""}</div>
      </div>`;
    };
    const pIn = Math.round(c.shareIn * 100);
    const ch = channelStatus(c.agg);
    const coverage = `<p class="hint">Terhubung: ${ch.connected.map(channelLabel).join(", ")}${ch.notConnected.length ? ` · Belum: ${ch.notConnected.map(channelLabel).join(", ")}` : ""}</p>`;
    const group = (g, title) => {
      const rows = c.items.filter(i => i.group === g);
      return rows.length ? `<p class="cf-h">${title}</p><ul class="vf-list">${rows.map(i => {
        const [st, stLabel] = (i.status === "over" || i.status === "missing") && i.reason === "bukan" ? ["warn", "Dikecualikan"] : V_STATUS[i.status];
        return `<li><span class="vf-l"><b>${esc(i.label)}</b><small>isian ${i.lo !== i.hi ? `${rpShort(i.lo)}–${rpShort(i.hi)}` : rpShort(i.m)} · e-wallet ${rpShort(i.w)}${i.reason && i.reason !== "bukan" ? ` · ${REASON_LABEL(i.reason)}` : ""}</small></span>${statusPill(st, stLabel)}</li>`;
      }).join("")}</ul>` : "";
    };
    return `<section class="card viz-card" aria-labelledby="rel-h">
      <div class="card-head"><h2 id="rel-h">Verifikasi</h2><p>Bagian isian yang terbukti di e-wallet.</p></div>
      <div class="kv" style="margin:0"><span>Keterandalan data</span>${statusPill(pIn >= 70 ? "good" : "warn", pIn >= 70 ? "Kuat" : "Sebagian")}</div>
      ${row("Pendapatan", c.shareIn, c.verifiedIn, c.income)}
      ${row("Pengeluaran", c.shareOut, c.verifiedOut, c.expMid)}
      ${coverage}
      ${checkList}
      ${checks === true && c.items.length ? `<details class="cf-calc"><summary>Rincian per item (${c.items.length})</summary>${group("in", "Pendapatan")}${group("out", "Pengeluaran")}${group("debt", "Cicilan")}</details>` : ""}
    </section>`;
  }

  // Kotak info dipindah ke tombol "Info" di judul kartu / langkah supaya tidak memotong alur isian.
  // Tetap di tempat: error (merah) dan catatan yang berisi tombol aksi (jadi teks ringan tanpa kotak),
  // serta catatan yang menjadi satu-satunya isi kartu (jadi teks biasa).
  const INFO_OPEN = new Set();
  function tuckNotes(root, prefix = "") {
    const hosts = new Map();
    root.querySelectorAll(".note").forEach(n => {
      if (n.classList.contains("danger") || n.closest(".info-pop")) return;
      if (n.querySelector("button, a")) { n.classList.add("inline"); return; }
      const card = n.closest(".card");
      const head = card?.querySelector(":scope > .card-head");
      if (card && [...card.children].every(ch => ch === n || ch === head)) { n.classList.add("plain"); return; }
      const host = head || root.querySelector(".step-desc");
      if (!host) { n.classList.add("plain"); return; }
      if (!hosts.has(host)) hosts.set(host, []);
      hosts.get(host).push(n);
    });
    let k = 0;
    for (const [host, notes] of hosts) {
      const key = `${prefix}:${k++}`, id = `info-${String(prefix).replace(/[^\w-]/g, "")}-${k}`, open = INFO_OPEN.has(key);
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "info-dot"; btn.dataset.infoKey = key;
      btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-controls", id);
      btn.innerHTML = `${ICON.info}<span>Info${notes.length > 1 ? ` (${notes.length})` : ""}</span>`;
      const pop = document.createElement("div");
      pop.className = "info-pop"; pop.id = id; pop.hidden = !open;
      for (const n of notes) {
        const c = n.cloneNode(true); c.querySelectorAll("svg").forEach(x => x.remove());
        const p = document.createElement("p"); p.innerHTML = c.innerHTML; pop.append(p); n.remove();
      }
      (host.matches(".card-head") ? host.querySelector("h2") || host : host).append(btn);
      host.after(pop);
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".info-dot"); if (!b) return;
    const pop = document.getElementById(b.getAttribute("aria-controls")); if (!pop) return;
    const open = pop.hidden;
    pop.hidden = !open; b.setAttribute("aria-expanded", String(open));
    open ? INFO_OPEN.add(b.dataset.infoKey) : INFO_OPEN.delete(b.dataset.infoKey);
  });

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // ---------- Server API ----------
  async function api(path, { method = "GET", body } = {}) {
    let res;
    try {
      res = await fetch(path, {
        method, credentials: "same-origin",
        headers: { "X-Requested-With": "laju", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw Object.assign(new Error("Server Laju tidak bisa dihubungi."), { code: "offline" });
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw Object.assign(new Error(data?.error?.message || "Server Laju tidak merespons dengan benar."), { code: data?.error?.code || `http_${res.status}` });
    return data;
  }

  // Tiga data contoh driver, dipakai tombol "Isi contoh" dan "Data contoh".
  // Urutan: skor di bawah rata-rata → sekitar rata-rata → di atas rata-rata.
  const demoExpenses = (o) => Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, o[c.id] ? { on: true, min: o[c.id][0], max: o[c.id][1] } : { on: false, min: c.min, max: c.max }]));
  function demoState(variant = 1) {
    const nextOn = (day) => { const t = new Date(), d = new Date(t.getFullYear(), t.getMonth(), day); if (d <= t) d.setMonth(d.getMonth() + 1); return isoOf(d); };
    const consent = { useWallet: true, useManual: true, agreeTerms: true, agreeDataUse: true };
    const demos = [
      {   // di bawah rata-rata: minus tiap bulan, utang bunga tinggi berlapis, tanpa bantalan & proteksi
        account: { fullName: "Andi Saputra", phone: "085711223344", username: "andi.narik", password: "contoh1234", city: "Bekasi" },
        profile: { platforms: ["maxim", "grab"], vehicle: "motor", ownership: "sewa", hoursPerDay: 11, daysPerWeek: 6, area: "Bekasi Timur", status: "menikah", dependents: 2, sideJobs: [], hasBank: false, hasBpjsKes: true, hasBpjsKet: false, hasInsurance: false, channels: ["ovo", "dana", "tunai"], recordsIncome: "kadang" },
        consent,
income: { perPlatform: { maxim: 90000, grab: 70000 }, bonus: 100000, tips: 50000, other: 0, weekAvg: 160000, best: 300000, worst: 60000 },
        expenses: demoExpenses({ makan: [1500000, 1900000], kontrakan: [800000, 900000], listrik: [200000, 300000], sekolah: [150000, 300000], bbm: [900000, 1300000], servis: [100000, 250000], pulsa: [100000, 150000], parkir: [50000, 100000], rokok: [400000, 600000], sosial: [100000, 200000] }),
        debts: [{ type: "Pinjol", remaining: 3500000, months: "", rate: "", due: nextOn(10) }, { type: "Paylater", remaining: 1200000, months: 3, rate: "3", due: nextOn(20) }, { type: "Rentenir", remaining: 2000000, months: 4, rate: "10", due: nextOn(7) }],
        resilience: { savings: 50000, goalSaved: 0, monthlySave: 0, habit: "never", places: ["Uang tunai di rumah"], shock: "none", goals: ["lunas", "darurat"], primaryGoal: "lunas", horizon: 12, goalAmount: 6700000, wantsBankLoan: false },
      },
      {   // sekitar rata-rata
        account: { fullName: "Sudirman Hasibuan", phone: "081234567890", username: "sudirman.ojol", password: "contoh1234", city: "Pekanbaru" },
        profile: { platforms: ["gojek", "shopeefood"], vehicle: "motor", ownership: "kredit", hoursPerDay: 10, daysPerWeek: 6, area: "Panam & Sudirman", status: "menikah", dependents: 3, sideJobs: ["Warung"], hasBank: true, hasBpjsKes: true, hasBpjsKet: false, hasInsurance: false, channels: ["gopay", "shopeepay", "bank", "tunai"], recordsIncome: "kadang" },
        consent,
income: { perPlatform: { gojek: 135000, shopeefood: 50000 }, bonus: 300000, tips: 120000, other: 900000, weekAvg: 185000, best: 280000, worst: 90000 },
        debts: [{ type: "Pinjol", remaining: 2400000, months: 6, rate: "4", due: nextOn(15) }, { type: "Cicilan", remaining: 9600000, months: 12, rate: "1.6", due: nextOn(5) }],
        resilience: { savings: 650000, goalSaved: 0, monthlySave: 200000, habit: "sisa", places: ["E-wallet", "Uang tunai di rumah", "Arisan"], shock: "borrow", goals: ["usaha", "lunas", "darurat"], primaryGoal: "usaha", horizon: 18, goalAmount: 5000000, wantsBankLoan: true },
      },
      {   // di atas rata-rata: surplus sehat, dana darurat penuh, proteksi lengkap, utang murah
        account: { fullName: "Wayan Sudarsana", phone: "081999887766", username: "wayan.ride", password: "contoh1234", city: "Denpasar" },
        profile: { platforms: ["gojek", "grab"], vehicle: "motor", ownership: "lunas", hoursPerDay: 9, daysPerWeek: 6, area: "Denpasar Selatan", status: "menikah", dependents: 2, sideJobs: ["Jualan online"], hasBank: true, hasBpjsKes: true, hasBpjsKet: true, hasInsurance: false, channels: ["gopay", "ovo", "bank"], recordsIncome: "kadang" },
        consent,
income: { perPlatform: { gojek: 160000, grab: 110000 }, bonus: 400000, tips: 150000, other: 1200000, weekAvg: 270000, best: 310000, worst: 230000 },
        expenses: demoExpenses({ makan: [1600000, 2000000], kontrakan: [700000, 700000], listrik: [200000, 300000], sekolah: [150000, 250000], kirim: [200000, 300000], bbm: [800000, 1000000], servis: [100000, 200000], pulsa: [100000, 150000], parkir: [50000, 100000], sosial: [100000, 200000] }),
        debts: [{ type: "Bank", remaining: 3000000, months: 10, rate: "0.5", due: nextOn(25) }],
        resilience: { savings: 12000000, goalSaved: 6500000, monthlySave: 1200000, habit: "rutin", places: ["Rekening bank", "E-wallet", "Emas"], shock: "ok", goals: ["rumah", "anak", "usaha"], primaryGoal: "rumah", horizon: 24, goalAmount: 20000000, wantsBankLoan: true },
      },
    ];
    return deepMerge(fresh(), demos[clamp(variant, 0, demos.length - 1)]);
  }
  // Setiap tekan tombol contoh berpindah ke data berikutnya (di bawah → rata-rata → di atas → ulang).
  let demoIdx = -1;
  function nextDemoState() {
    try { demoIdx = Number(localStorage.getItem("laju-demo-idx") ?? -1); } catch (e) { /* storage tidak tersedia */ }
    demoIdx = (demoIdx + 1) % 3;
    try { localStorage.setItem("laju-demo-idx", String(demoIdx)); } catch (e) { /* abaikan */ }
    return demoState(demoIdx);
  }


  // =====================================================================
  // Tangga milestone (dipakai di app.html)
  // ---------------------------------------------------------------------
  // Urutan mengikuti prioritas keuangan yang umum dianjurkan untuk pekerja
  // berpendapatan tidak tetap: arus kas positif → bantalan kecil → proteksi →
  // dana darurat penuh → menabung rutin → tujuan pribadi → siap kredit.
  // Utang TIDAK menjadi satu anak tangga (bisa makan waktu berbulan-bulan),
  // melainkan JALUR PARALEL yang berjalan bersamaan dengan langkah 2–8.
  // Langkah 7 mengikuti "tujuan utama" yang dipilih pengguna di onboarding.
  // ISI MASIH DRAF: judul, target, dan teks bebas diganti.
  // =====================================================================

  const rpShort = (n) => {
    const a = Math.abs(n), s = n < 0 ? "−" : "";
    if (a >= 1e6) return `${s}Rp${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
    if (a >= 1e3) return `${s}Rp${Math.round(a / 1e3)} rb`;
    return `${s}Rp${Math.round(a)}`;
  };

  // ---------- utang ----------
  // Perkiraan bunga (% per bulan) bila kolom bunga kosong, hanya untuk urutan & simulasi.
  // Pinjol resmi dibatasi OJK maks. 0,1%/hari (±3%/bln) untuk konsumtif mulai 2026.
  const DEBT_RATE_GUESS = { Pinjol: 3, Paylater: 3, Rentenir: 10 };
  const debtRate = (d) => (Number(d.rate) > 0 ? Number(d.rate) : DEBT_RATE_GUESS[d.type] || 0);
  const debtOpen = (d) => (Number(d.remaining) || 0) > 0;
  const isHighCost = (d) => HIGH_COST.includes(d.type) || Number(d.rate) >= 2;
  const debtInstallment = (d) => {   // cicilan per bulan; bila lama cicilan kosong, diasumsikan 12 bulan
    const b = Number(d.remaining) || 0, m = Number(d.months) || 0;
    return b <= 0 ? 0 : m > 0 ? b / m : b / 12;
  };
  // avalanche = bunga termahal dulu (paling hemat); snowball = sisa terkecil dulu (paling memotivasi)
  const DEBT_METHODS = {
    avalanche: { label: "Bunga termahal dulu", why: "Paling hemat bunga.", order: (a, b) => debtRate(b) - debtRate(a) || Number(a.remaining) - Number(b.remaining) },
    snowball: { label: "Sisa terkecil dulu", why: "Utang yang lunas satu per satu lebih cepat terasa. Riset Kellogg menemukan cara ini lebih sering dituntaskan.", order: (a, b) => Number(a.remaining) - Number(b.remaining) },
  };
  const debtOrder = (debts) => [...debts].sort(DEBT_METHODS[S.milestones.debtMethod || "avalanche"].order);

  // Simulasi per bulan: bunga berjalan, semua cicilan dibayar, dana tambahan ke urutan
  // nomor 1, cicilan utang yang sudah lunas ikut dialihkan ke utang berikutnya.
  function simulatePayoff(debts, extra = 0, maxMonths = 120) {
    const cmp = DEBT_METHODS[S.milestones.debtMethod || "avalanche"].order;
    const list = debts.filter(debtOpen).map(d => ({ d, b: Number(d.remaining), r: debtRate(d) / 100, pay: debtInstallment(d) }));
    const total = () => list.reduce((s, x) => s + Math.max(0, x.b), 0);
    const series = [total()];
    let m = 0;
    while (series[series.length - 1] > 1 && m < maxMonths) {
      m++;
      let pool = extra + list.filter(x => x.b <= 0).reduce((s, x) => s + x.pay, 0);
      for (const x of list) { if (x.b <= 0) continue; x.b += x.b * x.r; x.b -= Math.min(x.b, x.pay); }
      for (const x of list.filter(x => x.b > 0).sort((a, b) => cmp({ ...a.d, remaining: a.b }, { ...b.d, remaining: b.b }))) {
        if (pool <= 0) break; const p = Math.min(x.b, pool); x.b -= p; pool -= p;
      }
      series.push(total());
    }
    return { months: series[series.length - 1] <= 1 ? m : null, series };
  }

  // ---------- tabungan ----------
  // Rata-rata pendapatan ojol per hari narik, batas atas slider setoran harian.
  function dailyAppIncome(c) {
    const fromApps = S.profile.platforms.reduce((s, id) => s + (Number(S.income.perPlatform[id]) || 0), 0);
    return fromApps || Number(S.income.weekAvg) || (c.income / Math.max(1, S.profile.daysPerWeek * WEEKS));
  }
  function savingsEta(gap, perWorkday) {
    if (gap <= 0) return { workdays: 0, days: 0, date: new Date() };
    if (!(perWorkday > 0)) return null;
    const workdays = Math.ceil(gap / perWorkday);
    const days = Math.ceil((workdays * 7) / Math.max(1, S.profile.daysPerWeek));
    const date = new Date(); date.setDate(date.getDate() + days);
    return { workdays, days, date };
  }
  const verifiedMonths = () => dataTrust().months;

  // ---------- Tier kepercayaan data + pendapatan yang diakui bank ----------
  // Satu aturan (dokumen "Semua Skenario Data Uang dan Rekening"): hanya uang yang terbukti dari sumbernya
  // yang dipakai untuk pengajuan kredit. Isian manual tetap dipakai, tapi hanya untuk panduan.
  // Kalau ragu, hitung lebih rendah: uang masuk yang tidak dikenali tidak pernah jadi pendapatan bank.
  const TIER = {
    0: { label: "Tanpa data", tone: "critical", apply: "Belum bisa ajukan kredit. Isi data atau hubungkan e-wallet dulu." },
    1: { label: "Terverifikasi penuh", tone: "good", apply: "Boleh ajukan kredit resmi." },
    2: { label: "Terverifikasi sebagian", tone: "warn", apply: "Boleh ajukan, tapi plafon dibatasi." },
    3: { label: "Mandiri", tone: "serious", apply: "Belum bisa ajukan lewat skor. Laju tetap jadi panduan." },
  };
  const medianOf = (a) => { const v = [...a].sort((x, y) => x - y), m = v.length >> 1; return !v.length ? 0 : v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
  // Aplikasi yang dipakai tapi pencairannya tidak terlihat di dompet yang terhubung (Kasus A5, B4)
  function payoutGaps(live = S.wallets.filter(w => w.summary && !w.stale)) {
    if (!live.length) return [];
    return (S.profile.platforms || []).filter(p => !live.some(w => (w.summary.incomeByPlatform || {})[p] > 0)).map(p => {
      const wid = PLATFORM_WALLET[p], hint = wid && !live.some(w => w.walletId === wid);
      return { platform: p, wallet: hint ? wid : null,
        text: hint ? `Pencairan ${platformName(p)} biasanya masuk ke ${channelLabel(wid)}. Hubungkan ${channelLabel(wid)} supaya pendapatan terbaca.` : `Belum ada pencairan ${platformName(p)} di dompet yang terhubung.` };
    });
  }
  function dataTrust() {
    const live = S.wallets.filter(w => w.summary && !w.stale), stale = S.wallets.filter(w => w.summary && w.stale);
    const reasons = [], ew = editUrl("ewallet");
    const add = (t, act = null) => reasons.push({ t, act });
    if (!S.consent.useWallet || !live.length) {   // Kasus A2, A4, B2
      const tier = S.finished ? 3 : 0;
      if (stale.length) add(`Izin ${stale.map(w => channelLabel(w.walletId)).join(", ")} sudah berakhir. Hubungkan lagi untuk membuka pengajuan.`, { href: ew, label: "Hubungkan lagi" });
      else add("Belum ada e-wallet atau rekening yang terhubung. Isian manual hanya dipakai untuk panduan.", { href: ew, label: "Hubungkan e-wallet" });
      return { tier, ...TIER[tier], reasons, months: 0, classified: null, bankIncome: 0, live: 0 };
    }
    // riwayat semua dompet terhubung digabung per 30 hari (indeks 0 = 30 hari terakhir)
    const H = live.map(w => w.summary.history || { months: 1, monthlyPlatform: [w.summary.incomePlatform || 0], monthlyBonus: [0], classifiedShare: w.summary.categorizedRatio ?? 1 });
    const months = Math.max(...H.map(h => h.months));
    const series = (key) => Array.from({ length: months }, (_, i) => H.reduce((t, h) => t + (h[key][i] || 0), 0));
    const plat = series("monthlyPlatform"), bonus = series("monthlyBonus").filter(v => v > 0);
    const weight = live.map(w => (w.summary.incomePlatform || 0) + (w.summary.expenseTotal || 0) + 1);
    const classified = H.reduce((t, h, i) => t + h.classifiedShare * weight[i], 0) / weight.reduce((t, v) => t + v, 0);
    // median bulanan, bukan rata-rata (Kasus D1, G3). Bonus hanya kalau muncul minimal 3 bulan, bobot setengah (Kasus D2).
    const bankIncome = Math.round((medianOf(plat) + (bonus.length >= 3 ? 0.5 * medianOf(bonus) : 0)) / 1000) * 1000;
    let tier = months >= 6 && classified >= 0.85 ? 1 : months < 3 || classified < 0.6 ? 3 : 2;
    const cap2 = () => { if (tier === 1) tier = 2; };
    const missing = channelStatus().notConnected;
    if (missing.length) { cap2(); add(`${missing.map(channelLabel).join(", ")} belum terhubung.`, { href: ew, label: "Hubungkan" }); }   // Kasus G4, B6
    stale.forEach(w => { cap2(); add(`Izin ${channelLabel(w.walletId)} berakhir. Data terakhirnya masih dipakai.`, { href: ew, label: "Hubungkan lagi" }); });
    payoutGaps(live).forEach(g => { cap2(); add(g.text, g.wallet ? { href: ew, label: `Hubungkan ${channelLabel(g.wallet)}` } : null); });
    const unsupported = Object.entries(S.profile.payoutTo || {}).filter(([n, v]) => v === "ya" && (S.profile.channels || []).includes("c:" + n)).map(([n]) => n);
    if (unsupported.length) { cap2(); add(`Pencairan juga masuk ke ${unsupported.join(", ")} yang belum bisa dihubungkan.`); }   // Kasus C1
    if (months < 6) add(`Riwayat transaksi baru ${months} bulan. Butuh 6 bulan untuk terverifikasi penuh.`);   // Kasus C7, B1
    if (classified < 0.85) add(`${Math.round(classified * 100)}% transaksi dikenali. Butuh minimal 85%.`);   // Kasus F6
    const old = live.filter(w => w.syncedAt && Date.now() - new Date(w.syncedAt).getTime() > 14 * 864e5);
    if (old.length) add(`Data ${old.map(w => channelLabel(w.walletId)).join(", ")} terakhir diperbarui ${relTime(old[0].syncedAt)}. Label "data belum diperbarui" ikut terkirim ke bank.`, { href: ew, label: "Sinkron ulang" });   // Kasus C5
    return { tier, ...TIER[tier], reasons, months, classified, bankIncome, live: live.length };
  }

  // ---------- konteks bersama untuk semua tangga ----------
  function ladderContext() {
    const c = calc(), h = health(c);
    const openDebts = S.debts.filter(debtOpen);
    const highDebts = openDebts.filter(isHighCost);
    const x = {
      c, h, openDebts, highDebts,
      net: c.income - c.expense,
      emergency: Number(S.resilience.savings) || 0,
      goalSaved: Number(S.resilience.goalSaved) || 0,
      monthlySave: effectiveMonthlySave(),
      totalDebt: openDebts.reduce((s, d) => s + Number(d.remaining), 0),
      highTotal: highDebts.reduce((s, d) => s + Number(d.remaining), 0),
      goal: S.resilience.primaryGoal || "",
    };
    // jumlah utang tertinggi yang pernah tercatat → dasar menghitung "sudah dibayar"
    const bl = S.milestones.baseline;
    bl.high = Math.max(bl.high || bl.bunga || 0, x.highTotal);
    bl.all = Math.max(bl.all || bl.nolutang || 0, x.totalDebt);
    x.alloc = allocation(x);
    x.lane = debtLane(x);
    return x;
  }

  // ---------- pembagian sisa uang bulanan ----------
  // Fase mengikuti urutan prioritas: (1) bantalan Rp1 juta dulu supaya biaya mendadak
  // tidak ditutup pinjol baru, (2) serang utang bunga tinggi, (3) lengkapi dana darurat
  // 3 bulan, (4) kejar tujuan & investasi. Tujuan utama pengguna menggeser porsinya.
  const ALLOC_META = {
    emergency: { label: "Dana darurat", color: "var(--viz-in)" },
    debt: { label: "Tambahan bayar utang", color: "var(--viz-debt)" },
    goal: { label: "Tabungan tujuan", color: "var(--viz-out)" },
    invest: { label: "Tabungan jangka panjang", color: "var(--fg)" },
  };
  function allocation(x) {
    const net = x.net, perMonthDays = S.profile.daysPerWeek * WEEKS;
    if (net <= 0) return { phase: "minus", title: "Tutup kekurangan dulu", why: `Bulan ini pengeluaran lebih besar ${rp(-net)} dari pendapatan. Semua usaha diarahkan untuk menutup selisih itu.`, net, items: [] };
    const hasHigh = x.highDebts.length > 0, hasDebt = x.openDebts.length > 0;
    const starter = x.emergency >= 1e6, full = x.emergency >= 3 * x.c.expense;
    let phase, title, why, w;
    if (!starter) {
      phase = "bantalan"; title = "Bangun bantalan Rp1 juta dulu";
      why = "Tanpa bantalan, satu biaya mendadak (servis, sakit) biasanya ditutup pinjol baru. Bantalan kecil memutus lingkaran itu.";
      w = hasHigh ? { emergency: 0.7, debt: 0.3 } : hasDebt ? { emergency: 0.8, debt: 0.2 } : { emergency: 0.9, goal: 0.1 };
    } else if (hasHigh) {
      phase = "serang"; title = "Serang utang bunga tinggi";
      why = "Bunga pinjol/paylater bisa ±3% per bulan. Melunasinya sama dengan 'untung' ±36% setahun, lebih besar dari tabungan mana pun.";
      w = { debt: 0.7, emergency: 0.2, goal: 0.1 };
    } else if (!full) {
      phase = "darurat"; title = "Lengkapi dana darurat 3 bulan";
      why = "Pendapatan ojol naik-turun. Dana darurat 3 bulan menjaga Anda tetap aman saat order sepi panjang atau motor rusak.";
      w = hasDebt ? { emergency: 0.6, debt: 0.2, goal: 0.2 } : { emergency: 0.6, goal: 0.4 };
    } else {
      phase = "tujuan"; title = "Kejar tujuan utama";
      why = "Fondasi sudah aman. Sisa uang sekarang bisa bekerja untuk tujuan Anda.";
      w = hasDebt ? { goal: 0.6, debt: 0.2, invest: 0.2 } : { goal: 0.6, invest: 0.4 };
    }
    // tujuan utama menggeser porsi (tidak di fase bantalan, supaya bantalan tetap jadi prioritas)
    const shift = (from, to, amt) => { const a = Math.min(w[from] || 0, amt); if (a > 0) { w[from] -= a; w[to] = (w[to] || 0) + a; } };
    if (phase !== "bantalan") {
      if (x.goal === "lunas" && hasDebt) { shift("goal", "debt", 0.15); shift("invest", "debt", 0.1); }
      if (x.goal === "darurat") { shift("goal", "emergency", 0.15); shift("invest", "emergency", 0.1); }
    }
    const items = Object.entries(w).filter(([, v]) => v > 0.001).map(([key, v]) => ({
      key, share: v, amount: Math.round((net * v) / 1000) * 1000, perDay: Math.round((net * v) / perMonthDays / 500) * 500, ...ALLOC_META[key],
    })).sort((a, b) => b.share - a.share);
    return { phase, title, why, net, items };
  }
  const allocAmount = (x, key) => x.alloc.items.find(i => i.key === key)?.amount || 0;

  // ---------- jalur paralel: pelunasan utang ----------
  function debtLane(x) {
    const bl = S.milestones.baseline;
    const plan = S.milestones.plans.lane;
    const extra = plan?.extra ?? allocAmount(x, "debt");
    const sim = simulatePayoff(x.openDebts, extra);
    const base = bl.all || 0;
    const checkpoints = [
      { id: "high", label: "Utang bunga tinggi lunas", met: x.highTotal === 0, left: x.highTotal, base: bl.high || 0 },
      { id: "all", label: "Semua utang konsumtif lunas", met: x.totalDebt === 0, left: x.totalDebt, base },
    ];
    return {
      active: base > 0, done: base > 0 && x.totalDebt === 0,
      progress: base > 0 ? Math.round((1 - x.totalDebt / base) * 100) : 100,
      left: x.totalDebt, paid: Math.max(0, base - x.totalDebt), base, extra, planned: !!plan,
      months: sim.months, series: sim.series, checkpoints,
      method: S.milestones.debtMethod || "avalanche",
    };
  }

  // ---------- definisi langkah ----------
  const GOAL_STEPS = {
    lunas: { title: "Tujuan utama: bebas semua utang", caption: "Semua utang konsumtif lunas, sesuai tujuan yang Anda pilih.", kind: "debtall" },
    darurat: { title: "Tujuan utama: dana darurat 6 bulan", caption: "Bantalan penuh untuk pendapatan yang naik-turun.", kind: "emergency6" },
    kendaraan: { title: "Tujuan utama: kendaraan milik sendiri", caption: "Dana untuk uang muka atau pelunasan kendaraan.", kind: "pot" },
    usaha: { title: "Tujuan utama: modal usaha sampingan", caption: "Modal awal supaya pemasukan tidak hanya dari narik.", kind: "pot" },
    anak: { title: "Tujuan utama: biaya pendidikan anak", caption: "Dana sekolah yang disiapkan sebelum dibutuhkan.", kind: "pot" },
    rumah: { title: "Tujuan utama: rumah / renovasi", caption: "Dana untuk rumah atau perbaikan rumah.", kind: "pot" },
    "": { title: "Tujuan utama: tabungan tujuan", caption: "Pilih tujuan utama di Profil › Tujuan supaya langkah ini lebih tepat.", kind: "pot" },
  };

  const fmtMonths = (m) => `${m.toFixed(1).replace(".", ",")} bln`;
  function savingsStep(x, target, label) {
    const s = x.emergency;
    return {
      progress: target > 0 ? Math.round((s / target) * 100) : 100,
      cur: { label: "Dana darurat sekarang", value: rp(s) }, tgt: { label: "Target", value: label },
      gap: s < target ? `Kurang ${rp(target - s)}` : "",
      bar: { kind: "fill", cur: s, tgt: target, curLabel: "Dana darurat", tgtLabel: "Target", fmt: rp },
      criteria: [{ label: `Dana darurat ≥ ${rp(target)}`, met: s >= target, value: rp(s) }],
      short: `${rpShort(s)} dari ${rpShort(target)}`, pot: "emergency", target,
    };
  }

  function stepDefs(x) {
    const { c, h } = x;
    const g = GOAL_STEPS[x.goal] || GOAL_STEPS[""];
    const goalAmt = Number(S.resilience.goalAmount) || 0;
    const prot = { kes: !!S.profile.hasBpjsKes, ket: !!S.profile.hasBpjsKet };
    const t10 = Math.round((0.1 * c.income) / 1000) * 1000;
    const trust = dataTrust();
    const steps = [
      {
        id: "fondasi", title: "Fondasi: data rapi", pillar: "Arus kas", tool: "fondasi",
        caption: "Semua pendapatan dan pengeluaran tercatat di satu tempat.", explain: "100% saat onboarding sudah disimpan.",
        progress: S.finished ? 100 : 50,
        cur: { label: "Status sekarang", value: S.finished ? "Data lengkap" : "Belum lengkap" }, tgt: { label: "Target", value: "Onboarding selesai" },
        gap: S.finished ? "" : "Selesaikan onboarding",
        bar: { kind: "fill", cur: S.finished ? 1 : 0.5, tgt: 1, fmt: (v) => `${Math.round(v * 100)}%` },
        criteria: [{ label: "Onboarding selesai", met: S.finished }, { label: "E-wallet terhubung (disarankan, tidak wajib)", met: c.verified, optional: true }],
        short: S.finished ? "Data lengkap" : "Belum lengkap",
      },
      {
        id: "minus", title: "Keluar dari minus", pillar: "Arus kas", tool: "cashflow",
        caption: "Pendapatan menutup semua pengeluaran dan cicilan setiap bulan.", explain: "pendapatan ÷ (pengeluaran + cicilan).",
        progress: c.expense > 0 ? Math.round((c.income / c.expense) * 100) : 100,
        cur: { label: "Sisa per bulan sekarang", value: rp(x.net) }, tgt: { label: "Target", value: "Rp0 atau lebih" },
        gap: x.net < 0 ? `Tutup ${rp(-x.net)} per bulan` : "",
        bar: { kind: "fill", cur: c.income, tgt: c.expense, curLabel: "Pendapatan", tgtLabel: "Pengeluaran + cicilan", fmt: rp },
        criteria: [{ label: "Pendapatan ≥ pengeluaran + cicilan", met: x.net >= 0, value: `${rp(c.income)} vs ${rp(c.expense)}` }],
        short: x.net < 0 ? `Kurang ${rpShort(-x.net)}/bln` : `Sisa ${rpShort(x.net)}/bln`,
      },
      {
        id: "bantalan", title: "Bantalan pertama Rp1 juta", pillar: "Tabungan & ketahanan", tool: "savings",
        caption: "Uang khusus untuk servis mendadak atau motor rusak, supaya Anda tidak perlu pinjol.", explain: "dana darurat ÷ Rp1.000.000.",
        ...savingsStep(x, 1e6, "Rp1.000.000"),
      },
      {
        id: "proteksi", title: "Proteksi dasar: BPJS", pillar: "Rencana & proteksi", tool: "protect",
        caption: "Sakit atau kecelakaan di jalan tidak menghabiskan tabungan.", explain: "setiap BPJS aktif = 50%.",
        progress: (prot.kes ? 50 : 0) + (prot.ket ? 50 : 0),
        cur: { label: "Sekarang", value: [prot.kes && "BPJS Kesehatan", prot.ket && "BPJS TK"].filter(Boolean).join(" + ") || "Belum ada" },
        tgt: { label: "Target", value: "BPJS Kesehatan + Ketenagakerjaan" },
        gap: [!prot.kes && "Aktifkan BPJS Kesehatan", !prot.ket && "Daftar BPJS Ketenagakerjaan"].filter(Boolean).join(" · "),
        bar: { kind: "fill", cur: (prot.kes ? 1 : 0) + (prot.ket ? 1 : 0), tgt: 2, curLabel: "Aktif", tgtLabel: "Target", fmt: (v) => `${Math.round(v)} dari 2` },
        criteria: [{ label: "BPJS Kesehatan aktif", met: prot.kes }, { label: "BPJS Ketenagakerjaan aktif", met: prot.ket }, { label: "Asuransi lain (opsional)", met: !!S.profile.hasInsurance, optional: true }],
        short: `${(prot.kes ? 1 : 0) + (prot.ket ? 1 : 0)} dari 2 BPJS aktif`,
      },
      {
        id: "darurat", title: "Dana darurat 3 bulan", pillar: "Tabungan & ketahanan", tool: "savings",
        caption: "Bantalan penuh saat sakit, kecelakaan, atau order sepi panjang.", explain: "dana darurat ÷ (3 × pengeluaran bulanan).",
        ...savingsStep(x, 3 * c.expense, `${rp(3 * c.expense)} (3 bulan)`),
      },
      {
        id: "rutin", title: "Menabung rutin 10% pendapatan", pillar: "Tabungan & ketahanan", tool: "monthly",
        caption: "Anda menyisihkan tabungan di awal bulan, tidak menunggu sisa.", explain: "disisihkan per bulan ÷ 10% pendapatan.",
        progress: t10 > 0 ? Math.round((x.monthlySave / t10) * 100) : 0,
        cur: { label: "Disisihkan per bulan", value: rp(x.monthlySave) }, tgt: { label: "Target (10%)", value: `${rp(t10)} / bln` },
        gap: x.monthlySave < t10 ? `Tambah ${rp(t10 - x.monthlySave)} per bulan` : "",
        bar: { kind: "fill", cur: x.monthlySave, tgt: t10, curLabel: "Disisihkan", tgtLabel: "10% pendapatan", fmt: rp },
        criteria: [{ label: "Menyisihkan ≥ 10% pendapatan", met: t10 > 0 && x.monthlySave >= t10, value: `${rp(x.monthlySave)} dari ${rp(t10)}` }],
        short: `${rpShort(x.monthlySave)} dari ${rpShort(t10)}/bln`,
      },
      goalStep(x, g, goalAmt),
      {
        id: "kredit", title: "Siap ajukan kredit resmi", pillar: "Rencana & proteksi", tool: "credit",
        caption: "Rekam jejak yang bisa dibawa ke bank untuk modal usaha.", explain: "rata-rata dari empat syarat di bawah.",
        criteria: [
          { label: "Skor kesehatan ≥ 70", met: h.total >= 70, value: `skor ${h.total}`, part: Math.min(1, h.total / 70), act: `Naikkan skor ${70 - h.total} poin` },
          { label: "Status data untuk bank: Tier 1 atau 2", met: trust.tier === 1 || trust.tier === 2, value: `Tier ${trust.tier}`, part: { 1: 1, 2: 1, 3: 0.3, 0: 0 }[trust.tier], act: "Hubungkan e-wallet" },
          { label: "Tidak ada utang bunga tinggi", met: !x.highDebts.length, value: x.highDebts.length ? `${x.highDebts.length} tersisa` : "", part: x.lane.checkpoints[0].base ? 1 - x.highTotal / x.lane.checkpoints[0].base : 1, act: "Lunasi utang bunga tinggi" },
          { label: "Cicilan ≤ 30% pendapatan", met: h.dsr <= 0.3, value: pct(h.dsr), part: h.dsr <= 0.3 ? 1 : Math.max(0, 1 - (h.dsr - 0.3) / 0.3), act: "Turunkan cicilan ke ≤30% pendapatan" },
        ],
        cur: { label: "Sekarang", value: `Skor ${h.total} · Tier ${trust.tier}` }, tgt: { label: "Target", value: "Skor 70 · Tier 1 atau 2" },
        bar: { kind: "fill", cur: h.total, tgt: 70, curLabel: "Skor", tgtLabel: "Skor minimal", fmt: (v) => String(Math.round(v)) },
        short: `Skor ${h.total}/70 · Tier ${trust.tier}`,
      },
    ];
    const kredit = steps[steps.length - 1];
    kredit.progress = Math.round((kredit.criteria.reduce((s, k) => s + clamp(k.part, 0, 1), 0) / kredit.criteria.length) * 100);
    kredit.gap = kredit.criteria.filter(k => !k.met).map(k => k.act).slice(0, 2).join(" · ");
    return steps;
  }

  function goalStep(x, g, goalAmt) {
    const base = { id: "tujuan", title: g.title, caption: g.caption, pillar: "Rencana & proteksi", goalKind: g.kind };
    if (g.kind === "debtall") {
      const L = x.lane;
      return { ...base, tool: "debtgoal", explain: "utang yang sudah dibayar ÷ jumlah tertinggi yang pernah tercatat.",
        progress: L.base > 0 ? L.progress : 100,
        cur: { label: "Sisa semua utang", value: rp(x.totalDebt) }, tgt: { label: "Target", value: "Rp0 (lunas)" },
        gap: x.totalDebt > 0 ? `Lunasi ${rp(x.totalDebt)}` : "",
        bar: { kind: "paid", paid: L.paid, left: x.totalDebt, fmt: rp },
        criteria: [{ label: "Semua utang konsumtif lunas", met: x.totalDebt === 0, value: x.openDebts.length ? `${x.openDebts.length} tersisa` : "" }],
        short: x.totalDebt ? `Sisa ${rpShort(x.totalDebt)}` : "Lunas" };
    }
    if (g.kind === "emergency6") return { ...base, tool: "savings", explain: "dana darurat ÷ (6 × pengeluaran bulanan).", ...savingsStep(x, 6 * x.c.expense, `${rp(6 * x.c.expense)} (6 bulan)`) };
    // tabungan tujuan (pot terpisah dari dana darurat)
    const s = x.goalSaved, months = Number(S.resilience.horizon) || 12;
    const start = S.finishedAt ? new Date(S.finishedAt) : new Date();
    const deadline = new Date(start); deadline.setMonth(deadline.getMonth() + months);
    const monthsLeft = Math.max(1, Math.round((deadline - Date.now()) / (30 * 864e5)));
    const needPerMonth = goalAmt > s ? Math.ceil((goalAmt - s) / monthsLeft / 1000) * 1000 : 0;
    return { ...base, tool: "goal", explain: "tabungan tujuan ÷ target tujuan.", target: goalAmt, pot: "goal", deadline, needPerMonth,
      progress: goalAmt > 0 ? Math.round((s / goalAmt) * 100) : 0,
      cur: { label: "Tabungan tujuan", value: rp(s) }, tgt: { label: "Target", value: goalAmt ? `${rp(goalAmt)} · ${deadline.toLocaleDateString("id-ID", { month: "short", year: "numeric" })}` : "Belum ditentukan" },
      gap: !goalAmt ? "Tentukan nominal tujuan dulu" : s < goalAmt ? `Kurang ${rp(goalAmt - s)} · ±${rp(needPerMonth)}/bln` : "",
      bar: { kind: "fill", cur: s, tgt: Math.max(goalAmt, 1), curLabel: "Terkumpul", tgtLabel: "Target", fmt: rp },
      criteria: [{ label: goalAmt ? `Tabungan tujuan ≥ ${rp(goalAmt)}` : "Nominal tujuan ditentukan", met: goalAmt > 0 && s >= goalAmt, value: rp(s) }],
      short: goalAmt ? `${rpShort(s)} dari ${rpShort(goalAmt)}` : "Nominal belum diisi" };
  }

  // Semua tangga + status. Rapor selalu di ujung tangga.
  function buildMilestones() {
    const x = ladderContext();
    const today = isoOf(new Date());
    let activeFound = false;
    const steps = stepDefs(x).map((m, i) => {
      const allMet = m.criteria.filter(k => !k.optional).every(k => k.met);
      m.progress = allMet ? 100 : Math.min(99, Math.max(0, Math.round(m.progress)));   // 100% hanya bila semua syarat terpenuhi
      const done = m.progress >= 100;
      const status = done ? "done" : !activeFound ? (activeFound = true, "active") : "next";
      if (done && !S.milestones.doneAt[m.id]) S.milestones.doneAt[m.id] = today;
      if (!done && S.milestones.doneAt[m.id]) delete S.milestones.doneAt[m.id];
      return { ...m, x, index: i, number: i + 1, status };
    });
    const doneN = steps.filter(s => s.status === "done").length;
    steps.push({
      id: "rapor", title: "Rapor & kesimpulan", pillar: "Ringkasan", tool: "rapor", x, index: steps.length, number: steps.length + 1,
      caption: "Ringkasan perjalanan dan kondisi keuangan Anda.", progress: Math.round((doneN / steps.length) * 100),
      status: doneN === steps.length ? "done" : "next", final: doneN === steps.length, short: doneN === steps.length ? "Rapor akhir siap" : "Rapor sementara",
      gap: "", criteria: [],
    });
    return steps;
  }

  // ---------- catatan (ledger) dengan urungkan ----------
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  function recordChange({ type, label, amount = 0, step = "", paths, apply }) {
    const before = Object.fromEntries(paths.map(p => [p, clone(get(p))]));
    apply();
    const after = Object.fromEntries(paths.map(p => [p, clone(get(p))]));
    const e = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), type, label, amount, step, before, after };
    S.ledger.push(e);
    if (S.ledger.length > 300) S.ledger.splice(0, S.ledger.length - 300);
    return e;
  }
  const lastChange = () => [...S.ledger].reverse().find(e => !e.undone);
  // Hanya catatan terakhir yang bisa diurungkan, supaya perubahan sesudahnya tidak tertimpa.
  function undoChange(id) {
    const e = lastChange();
    if (!e || e.id !== id) return false;
    for (const [p, v] of Object.entries(e.before)) set(p, clone(v));
    e.undone = true;
    return true;
  }

  // ---------- potret kondisi (untuk rapor "awal vs sekarang") ----------
  function snapshotMetrics() {
    const x = ladderContext();
    return {
      d: isoOf(new Date()), score: x.h.total, income: Math.round(x.c.income), expense: Math.round(x.c.expense), net: Math.round(x.net),
      emergency: x.emergency, emergencyMonths: Math.round(x.h.months * 10) / 10, goalSaved: x.goalSaved, monthlySave: x.monthlySave,
      totalDebt: x.totalDebt, highDebt: x.highTotal, dsr: Math.round(x.h.dsr * 100) / 100,
      bpjs: (S.profile.hasBpjsKes ? 1 : 0) + (S.profile.hasBpjsKet ? 1 : 0),
    };
  }

  // =====================================================================
  // Konteks untuk analisis AI (Claude API), lihat docs/ai-data-contract.md
  // Prinsip: hanya data yang dibutuhkan untuk membimbing keuangan, TANPA data
  // identitas (nama, nomor HP, username, password, area narik detail).
  // =====================================================================
  function buildAIContext() {
    const ms = buildMilestones(), x = ms[0].x, c = x.c, h = x.h, p = S.profile, r = S.resilience, inc = S.income;
    const vol = volatility(), agg = aggregate();
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const recent = S.ledger.filter(e => !e.undone && e.at >= since);
    const sum = (t) => recent.filter(e => e.type === t).reduce((s, e) => s + (e.amount || 0), 0);
    const goalOf = (id) => GOALS.find(g => g.id === id)?.label || id;
    return {
      schema: "laju.ai-context.v1",
      generatedAt: new Date().toISOString(),
      currency: "IDR",
      profile: {
        city: S.account.city === "Lainnya" ? S.account.cityOther : S.account.city,
        platforms: p.platforms.map(platformName),
        vehicle: p.vehicle, vehicleOwnership: OWNERSHIP.find(o => o.id === p.ownership)?.label || "",
        hoursPerDay: p.hoursPerDay, daysPerWeek: p.daysPerWeek,
        householdStatus: statusLabel(p.status), dependents: p.dependents, sideIncome: p.sideJobs,
        hasBankAccount: p.hasBank, protection: { bpjsKesehatan: p.hasBpjsKes, bpjsKetenagakerjaan: p.hasBpjsKet, otherInsurance: p.hasInsurance },
        recordsIncome: RECORDS_LABEL[p.recordsIncome] || "",
      },
      // Isian manual = gambaran lengkap; e-wallet = verifikasi. Setiap baris diberi status verifikasinya.
      dataMode: c.verified ? "isian manual, diverifikasi e-wallet" : "isian manual (belum terverifikasi)",
      moneyChannels: (S.profile.channels || []).map(channelLabel),
      income: {
        monthlyUsed: Math.round(c.income), monthlyFromApps: Math.round(c.appIncome), verifiedShare: Math.round(c.shareIn * 100) / 100,
        lines: c.lines.income.map(l => ({ item: l.label, perMonth: Math.round(l.amount), source: { verified: "terverifikasi", partial: "sebagian terverifikasi", self: "isian sendiri" }[l.src], basis: l.formula })),
        week: { avgPerDay: Number(inc.weekAvg) || 0, best: Number(inc.best) || 0, worst: Number(inc.worst) || 0 },
        volatility: vol.ready ? { label: vol.label, cv: Math.round(vol.cv * 100) / 100 } : null,
        updatedByUser: S.overrides.income != null,
        eWallet: { wallets: agg.count, monthlyPayouts: Math.round(agg.incomePlatform), otherTransfersIn: Math.round(agg.incomeOther), months: verifiedMonths() },
        dataTrust: (() => { const t = dataTrust(); return { tier: t.tier, label: t.label, historyMonths: t.months, classifiedShare: t.classified, bankRecognisedIncomeMonthly: t.bankIncome, reasons: t.reasons.map(r => r.t) }; })(),
      },
      expenses: {
        monthlyUsed: Math.round(c.expMid), range: { min: Math.round(c.expMin), max: Math.round(c.expMax) }, verifiedShare: Math.round(c.shareOut * 100) / 100,
        installmentsPerMonth: Math.round(c.debtMonthly), installmentsEstimated: c.debtGuess.length > 0,
        byCategory: EXPENSE_CATEGORIES.filter(k => S.expenses[k.id]?.on || (c.verified && agg.byCategory[k.id])).map(k => ({ category: k.label, manual: S.expenses[k.id]?.on ? { min: S.expenses[k.id].min, max: S.expenses[k.id].max } : null, eWallet: c.verified ? agg.byCategory[k.id] || 0 : null })),
        unrecognizedFromWallet: c.verified ? agg.byCategory.lainnya || 0 : 0,
        updatedByUser: S.overrides.expense != null,
      },
      verification: c.items.map(i => ({ item: i.label, manual: i.m, eWallet: i.w, status: { ok: "cocok", part: "sebagian terverifikasi", none: "tidak lewat e-wallet", over: "isian lebih kecil dari e-wallet", missing: "tidak diisi tapi ada di e-wallet" }[i.status], explanation: REASON_LABEL(i.reason) || null, usedEWalletFigure: i.adjusted })),
      dataChecks: dataChecks(c).filter(k => k.lv !== "ok").map(k => k.text),
      debts: S.debts.map(d => ({
        type: debtTypeLabel(d), remaining: Number(d.remaining) || 0, paidOff: !debtOpen(d),
        ratePerMonthPct: debtRate(d), rateEstimated: !(Number(d.rate) > 0), monthsLeft: Number(d.months) || null,
        installmentPerMonth: Math.round(debtInstallment(d)), highCost: isHighCost(d), nextDue: d.due || null,
      })),
      savings: {
        emergencyFund: x.emergency, emergencyMonths: Math.round(h.months * 10) / 10, goalFund: x.goalSaved,
        monthlySave: x.monthlySave, habit: HABITS.find(hb => hb.id === r.habit)?.label || "", places: r.places,
        shockTest1M: SHOCK_LABEL[r.shock] || "",
      },
      goals: { primary: goalOf(r.primaryGoal), all: r.goals.map(goalOf), targetAmount: Number(r.goalAmount) || 0, horizonMonths: r.horizon, wantsFormalCredit: r.wantsBankLoan },
      health: {
        score: h.total, category: h.grade.label, surplusRatio: Math.round(h.surplusRatio * 100) / 100, debtServiceRatio: Math.round(h.dsr * 100) / 100,
        debtToAnnualIncome: Math.round(h.dti * 100) / 100,
        pillars: h.pillars.map(pl => ({ id: pl.id, label: pl.label, points: pl.pts, max: pl.max, parts: pl.parts.map(pt => ({ label: pt.label, points: pt.pts, max: pt.max, value: pt.value })) })),
      },
      plan: {
        monthlyAllocation: { phase: x.alloc.phase, title: x.alloc.title, surplus: Math.round(x.alloc.net), items: x.alloc.items.map(i => ({ to: i.label, perMonth: i.amount, perWorkday: i.perDay })) },
        debtLane: x.lane.active ? { progressPct: x.lane.progress, remaining: x.lane.left, method: DEBT_METHODS[x.lane.method].label, extraPerMonth: x.lane.extra, monthsToDebtFree: x.lane.months } : null,
        milestones: ms.map(m => ({ n: m.number, id: m.id, title: m.title, status: m.status, progressPct: m.progress, current: m.cur?.value, target: m.tgt?.value, gap: m.gap || null })),
      },
      activity: {
        last30Days: { deposits: sum("deposit") + sum("goal-deposit"), debtPayments: sum("pay"), entries: recent.length },
        recent: S.ledger.filter(e => !e.undone).slice(-10).map(e => ({ at: e.at.slice(0, 10), type: e.type, label: e.label, amount: e.amount })),
      },
      history: { start: S.startSnap, scoreLog: S.scoreLog.slice(-30) },
      excludedForPrivacy: ["nama lengkap", "nomor HP", "username", "password", "area narik detail", "token e-wallet"],
    };
  }

  // Panel bawah menempel di tepi bawah layar yang terlihat. Di browser HP, bilah alamat yang muncul saat
  // menggulir ke atas memperkecil layar terlihat. Selisihnya dipakai untuk mengangkat panel. Selisih besar
  // berarti keyboard terbuka: panel dibiarkan di belakang keyboard.
  if (typeof window !== "undefined" && window.visualViewport) {
    const vv = window.visualViewport;
    const pin = () => {
      const gap = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--vv-gap", `${gap > 0 && gap < 150 ? gap : 0}px`);
    };
    vv.addEventListener("resize", pin);
    vv.addEventListener("scroll", pin);
    window.addEventListener("scroll", pin, { passive: true });
    window.addEventListener("resize", pin);
    window.addEventListener("load", pin);
    pin();
  }
