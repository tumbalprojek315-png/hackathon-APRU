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
  // Tujuan dibagi dua kelompok. Wajib = punya tenggat yang tidak bisa digeser, atau melindungi
  // dan menambah penghasilan. Selain itu tumbuh. Wajib mulai di Step 3, tumbuh mulai di Step 5.
  // Kelompoknya hanya dipakai di hitungan, tidak ditampilkan sebagai label di pilihan tujuan.
  // Modal menikah dan kendaraan untuk kerja dihapus dari pilihan (5 Nov); data lama dibersihkan di migrate.
  const GOALS = [
    { id: "pendidikan", label: "Biaya pendidikan awal", group: "wajib" },
    { id: "kendaraan", label: "Kendaraan pribadi", group: "tumbuh" },
    { id: "usaha", label: "Modal usaha sampingan", group: "tumbuh" },
    { id: "rumah", label: "Beli rumah", group: "tumbuh" },
  ];
  const goalGroup = (id) => GOALS.find(g => g.id === id)?.group || "tumbuh";
  const goalLabel = (id) => GOALS.find(g => g.id === id)?.label || id;

  // ---------- landasan milestone v1 ----------
  // Semua ambang di satu tempat supaya tim mudah mengubahnya.
  const MILESTONE = {
    STEP1_MIN_NET_RATIO: 0.05,
    STEP2_BUFFER_TARGET: 3000000,
    STEP2_BUFFER_REGRESS: 2000000,
    STEP2_SPLIT_DEBT: 0.70,
    STEP2_SPLIT_BUFFER: 0.30,
    STEP2_CHECKPOINTS: [500000, 1000000, 2000000, 3000000],
    REFILL_SHARE: 0.50,
    STEP3_REGRESS_RATIO: 2 / 3,
    STEP3_GOAL_MAX_SHARE: 0.30,
    STEP4_INVEST_RATIO: 0.10,
    STEP4_STREAK_MONTHS: 3,
    HOLD_DAYS: 28,
    REGRESS_WINDOW_DAYS: 30,
    HIGH_INTEREST_APR: 0.18,
    GOAL_SWITCH_MIN_DAYS: 90,
  };
  // Alasan pengambilan uang beku yang tidak dihitung sebagai kemunduran.
  const EMERGENCY_REASONS = ["sakit", "kecelakaan", "motor_rusak", "keluarga_meninggal", "akun_diblokir", "bencana"];
  const WITHDRAW_REASONS = [
    ["sakit", "Sakit"], ["kecelakaan", "Kecelakaan"], ["motor_rusak", "Motor rusak"],
    ["keluarga_meninggal", "Keluarga meninggal"], ["akun_diblokir", "Akun diblokir"], ["bencana", "Bencana"],
    ["lainnya", "Lainnya (bukan darurat)"],
  ];
  const isEmergencyReason = (r) => EMERGENCY_REASONS.includes(r);
  // Target dana darurat Step 3 mengikuti jumlah tanggungan: 0-3 jadi 3 bulan, lalu naik sampai 6.
  const ddMonths = (t) => (t <= 3 ? 3 : Math.min(6, t));
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
    { id: "tabungan", title: "Tabungan", steps: [["ketahanan", ["awal", "tabungan"]]] },   // kebiasaan, setoran per bulan, tes guncangan, saldo
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
    // st = status tiap step, stLog = riwayat perubahan status, expenseLock = pengeluaran bulanan terkunci
    milestones: { plans: {}, baseline: {}, log: {}, doneAt: {}, debtMethod: "avalanche", st: {}, stLog: [], expenseLock: null },
    ledger: [],      // catatan setoran/bayar/perubahan dari halaman tangga (bisa diurungkan)
    scoreLog: [],    // skor harian, untuk rapor
    startSnap: null, // potret kondisi saat onboarding selesai (rapor "awal vs sekarang")
    monthly: { checks: [] },   // cek bulanan: satu potret tiap 30 hari sejak onboarding selesai
    overrides: {},   // angka "bulan ini" yang diperbarui dari halaman tangga (menggantikan perkiraan onboarding)
    account: { fullName: "", phone: "", password: "", city: "", cityOther: "" },
    profile: {
      platforms: [], customPlatforms: [], vehicle: "", ownership: "", hoursPerDay: 9, daysPerWeek: 6, area: "",
      status: "", customStatuses: [], dependents: 0, sideJobs: [], customSideJobs: [],
      channels: [], customChannels: [],   // lewat mana uang masuk & keluar: e-wallet, rekening bank, tunai, lainnya
      hasInsurance: false, recordsIncome: "",
    },
    // Dua jalur yang saling meniadakan: useWallet true = lewat e-wallet, false = isi manual, null = belum memilih.
    consent: { useWallet: null, useManual: true, agreeTerms: false, agreeDataUse: false, walletPhones: {} },   // walletPhones: nomor HP per e-wallet (Izin data)
    autofill: null,            // catatan kapan kolom diisi otomatis dari transaksi, supaya tidak menimpa hasil edit
    wallets: [],
    income: { perPlatform: {}, bonus: 0, tips: 0, other: 0, weekAvg: 0, best: 0, worst: 0 },
    expenses: Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, { on: false, min: 0, max: 0 }])),   // rentang per bulan yang diketik, kosong = tidak dihitung
    debts: [],
    customDebtTypes: [],
    // Penjelasan selisih isian vs e-wallet per item, mis. { "exp:kontrakan": "tunai", "inc:other": "bukan" }
    verify: {},
    // savings = uang beku (bantalan Step 2 + dana darurat Step 3). growth = uang tumbuh Step 4.
    // goalData = rincian per tujuan: { amount, deadline, saved, startedAt }
    resilience: { savings: 0, growth: 0, monthlySave: 0, habit: "", places: [], customPlaces: [], shock: "", goals: [], goalData: {}, horizon: 12, wantsBankLoan: null },
    sick: [],            // rentang Mode Sakit: { from, to }
    growth: {},          // setoran uang tumbuh per bulan: { "2026-11": 250000 }
    withdrawals: [],     // pengambilan uang beku: { at, amount, reason }
    notes: "",
  });

  let S = load();
  const ui = { showErrors: false, analysisIdx: 0, analysisTimer: null, showPw: false, config: null, server: "checking", syncing: {}, walletError: "", openTx: null, docName: "", docError: "", docBusy: "", stBusy: {}, combo: { open: false, active: -1, items: [] }, cal: null, adder: {}, enter: true };

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
    if (!c.useManual && c.useWallet === false) c.useWallet = null;   // dulu belum memilih apa pun: sekarang pertanyaan ya/tidak e-wallet
    c.useManual = true;
    if (s.account.city && s.account.city !== "Lainnya" && !CITIES.some(x => x.name === s.account.city)) { s.account.cityOther = s.account.city; s.account.city = "Lainnya"; }
    // dulu ada saklar per kategori: sekarang kategori yang dimatikan = kosong, dan kategori dihitung kalau angkanya diisi
    for (const e of Object.values(s.expenses)) { if (!e.on) e.min = e.max = 0; e.on = e.max > 0; }
    delete s.expenses.jajan; delete s.income.volatility; delete s.reconcileChoice; delete s.cash;
    s.overrides = {};   // angka "bulan ini" dari halaman Tangga dihapus: pendapatan & pengeluaran hanya diubah di Profil
    // ---- landasan milestone v1 ----
    const rr = s.resilience;
    rr.goalData ||= {}; rr.growth = Number(rr.growth) || 0;
    s.sick ||= []; s.growth ||= {}; s.withdrawals ||= [];
    s.milestones.st ||= {}; s.milestones.stLog ||= [];
    if (s.milestones.expenseLock === undefined) s.milestones.expenseLock = null;
    // tujuan lama dipetakan ke kelompok baru. "lunas" kini Step 2 dan "darurat" kini Step 3, jadi dilepas.
    const GOAL_MAP = { anak: "pendidikan", kendaraan: "kendaraan", usaha: "usaha", rumah: "rumah" };
    if (Array.isArray(rr.goals)) {
      rr.goals = [...new Set(rr.goals.map(g => GOAL_MAP[g] || g).filter(g => GOALS.some(k => k.id === g)))];
    }
    if ("primaryGoal" in rr || "goalAmount" in rr || "goalSaved" in rr) {
      const prim = GOAL_MAP[rr.primaryGoal] || rr.primaryGoal;
      if (prim && GOALS.some(k => k.id === prim)) {
        if (!rr.goals.includes(prim)) rr.goals.unshift(prim);
        const d = (rr.goalData[prim] ||= {});
        if (!d.amount && Number(rr.goalAmount) > 0) d.amount = Number(rr.goalAmount);
        if (!d.saved && Number(rr.goalSaved) > 0) d.saved = Number(rr.goalSaved);
      }
      delete rr.primaryGoal; delete rr.goalAmount; delete rr.goalSaved;
    }
    // tunai dan rekening bank tidak lagi jadi pilihan jalur uang
    if (Array.isArray(s.profile.channels)) s.profile.channels = s.profile.channels.filter(c => c !== "tunai" && c !== "bank");
    // dompet buatan sendiri hanya terpilih kalau namanya ada di daftar opsi (dulu "Isi contoh" bisa menambahkannya diam diam)
    if (Array.isArray(s.profile.channels)) s.profile.channels = s.profile.channels.filter(c => !String(c).startsWith("c:") || (s.profile.customChannels || []).includes(String(c).slice(2)));
    delete s.profile.hasBank;
    // BPJS tidak lagi diukur
    delete s.profile.hasBpjsKes; delete s.profile.hasBpjsKet;
    // utang: cicilan nyata diturunkan dari bunga + tenor kalau belum diisi, dan tanggal masuk dicatat
    for (const d of s.debts || []) {
      if (!d.addedAt) d.addedAt = (s.finishedAt || new Date().toISOString()).slice(0, 10);
      if (!(Number(d.cicilan) > 0)) {
        const b0 = Number(d.remaining) || 0, n = Number(d.months) || 0, r = (Number(d.rate) || 0) / 100;
        if (b0 > 0 && n > 0) d.cicilan = Math.round(r > 0 ? (b0 * r) / (1 - Math.pow(1 + r, -n)) : b0 / n);
      }
    }
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
  const maskPhone = (s) => { const d = phoneDigits(s); return d.length >= 8 ? `${d.slice(0, 4)}****${d.slice(-4)}` : "-"; };
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
  // Bukti yang sah ada dua macam: e-wallet terhubung (hanya kalau jalur e-wallet yang dipilih)
  // dan e statement yang diunggah sendiri. Dompet sisa di jalur manual tidak dihitung.
  const isEvidence = (w) => w.source === "statement" || !!S.consent.useWallet;
  const hasEvidence = (agg) => agg.count > 0 && S.wallets.some(w => w.summary && isEvidence(w));

  // Rekening bank tidak lagi ditanyakan di Profil. Dianggap ada kalau ada buktinya:
  // rekening bank terhubung, atau e statement yang sudah diunggah.
  const hasBankEvidence = () => S.wallets.some(w => w.summary && (w.walletId === "bank" || w.source === "statement"));

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
    if (!hasEvidence(agg)) return [];
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
    const verified = hasEvidence(agg);
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
      expense: expMid + debtMonthly, verified, auto: verified, agg, items, lines, verifiedIn, verifiedOut,
      shareIn: share(verifiedIn, income), shareOut: share(verifiedOut, expMid), activeCount: active.length,
    };
  }

  // Nilai satu kategori yang benar-benar dipakai hitungan: titik tengah rentang, dengan batas bawah e-wallet.
  function catEffective(id, c) {
    const i = c.items.find(x => x.key === `exp:${id}`);
    if (!i || i.reason === "bukan" || i.w <= i.lo) return expMidOf(id);
    return (Math.max(i.lo, i.w) + Math.max(i.hi, i.w)) / 2;
  }

  // Mengisi kolom Pendapatan & Pengeluaran dari transaksi yang sudah terbukti (e-wallet atau e statement).
  // Dijalankan sekali saja. Setelah itu angka milik pengguna, bebas diedit, dan selisihnya dinilai lewat coverage.
  function autofillFromVerified() {
    const agg = aggregate();
    if (!agg.count || !agg.txCount) return null;
    const days = Math.max(1, S.profile.daysPerWeek * WEEKS), inc = S.income;
    const filled = { platforms: [], categories: [], harian: false, other: false };
    for (const id of S.profile.platforms) {
      const w = verifiedFor(id, agg);
      if (w > 0) { inc.perPlatform[id] = r1k(w / days); filled.platforms.push(id); }
    }
    if (agg.incomeOther > 0) { inc.other = r1k(agg.incomeOther); filled.other = true; }
    // hari ramai dan hari sepi diambil dari hari yang benar-benar ada pencairan
    const d = agg.daily.filter(v => v > 0);
    if (d.length >= 3) {
      inc.weekAvg = r1k(d.reduce((s, v) => s + v, 0) / d.length);
      inc.best = r1k(Math.max(...d));
      inc.worst = r1k(Math.min(...d));
      filled.harian = true;
    }
    // satu periode 30 hari hanya memberi satu angka, jadi batas bawah dan atas disamakan dulu
    for (const c of EXPENSE_CATEGORIES) {
      const v = agg.byCategory[c.id] || 0;
      if (v <= 0) continue;
      const e = S.expenses[c.id];
      e.min = e.max = r1k(v); e.on = true;
      filled.categories.push(c.id);
    }
    S.autofill = { at: new Date().toISOString(), wallets: agg.count, txCount: agg.txCount, filled };
    delete S.overrides.income; delete S.overrides.expense;
    return S.autofill;
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
      const id = key.slice(4), e = S.expenses[id], v = Math.ceil((agg.byCategory[id] || 0) / 1000) * 1000;
      if (!e.on) { e.min = v; e.max = v; } else { e.min = Math.max(e.min, v); e.max = Math.max(e.max, e.min); }
      e.on = e.max > 0;
    }
    delete S.verify[key];
  }

  // Jalur uang yang dipilih pengguna (Profil): e-wallet, rekening bank, tunai, atau lainnya.
  // Tunai dan rekening bank tidak lagi dipilih di Profil. Tunai dicatat di Pendapatan dan Pengeluaran,
  // rekening bank dibuktikan lewat unggah e statement di langkah E-wallet.
  const CHANNELS = WALLETS.filter(w => w.id !== "bank").map(w => ({ id: w.id, label: w.label, wallet: true }));
  const LEGACY_CHANNEL = { tunai: "Tunai", bank: "Rekening bank" };
  const PLATFORM_WALLET = { gojek: "gopay", shopeefood: "shopeepay", spx: "shopeepay", grab: "ovo", maxim: "dana" };   // tebakan awal saja
  const channelLabel = (id) => (isCustom(id) ? id.slice(2) : CHANNELS.find(c => c.id === id)?.label || LEGACY_CHANNEL[id] || id);
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
      // "N selisih belum dijelaskan" dihapus (5 Nov): pertanyaan "sisa lewat mana?" tidak ditampilkan lagi.
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
    // E statement di server yang tidak dikenal perangkat ini (mis. sisa sebelum reset) tidak dipakai, supaya tidak
    // ikut terhitung diam diam. Tidak dihapus dari server: bisa saja baru diunggah dari tab lain yang masih terbuka.
    const known = new Set(S.wallets.map(w => w.walletId));
    server = server.filter(w => w.source !== "statement" || known.has(w.walletId));
    const missing = S.wallets.filter(w => w.summary && !server.some(x => x.walletId === w.walletId));
    // E statement yang hilang dari server (mis. server dijalankan ulang) tetap dipakai apa adanya: isinya dari dokumen
    // yang sudah dibaca, bukan izin yang bisa berakhir. Hanya e-wallet yang ditandai "Data terakhir".
    const docs = missing.filter(w => w.source === "statement"), lost = missing.filter(w => w.source !== "statement");
    return { wallets: [...server.map(w => ({ ...w, stale: false })), ...docs, ...lost.map(w => ({ ...w, stale: true }))], lost };
  }
  function aggregate() {
    const a = { count: 0, incomePlatform: 0, incomeOther: 0, expenseTotal: 0, debtPayments: 0, internalIn: 0, internalOut: 0, txCount: 0, byPlatform: {}, byCategory: {}, daily: [], recognized: 0, days: {}, partialDays: false };
    for (const w of S.wallets) {
      const s = w.summary; if (!s) continue;
      a.count++; a.incomePlatform += s.incomePlatform; a.incomeOther += s.incomeOther; a.expenseTotal += s.expenseTotal;
      a.debtPayments += s.debtPayments; a.txCount += s.txCount; a.recognized += s.expenseTotal * s.categorizedRatio;
      a.internalIn += s.internalIn || 0; a.internalOut += s.internalOut || 0;
      for (const [k, v] of Object.entries(s.incomeByPlatform)) a.byPlatform[k] = (a.byPlatform[k] || 0) + v;
      for (const [k, v] of Object.entries(s.expenseByCategory)) a.byCategory[k] = (a.byCategory[k] || 0) + v;
      s.dailyIncome.forEach((v, i) => (a.daily[i] = (a.daily[i] || 0) + v));
      // per tanggal: uang masuk per sumber, uang keluar per kategori (sinkron lama hanya punya pencairan harian)
      if (!s.periodStart) continue;
      const st = parseIso(s.periodStart);
      if (!s.dailyOut) a.partialDays = true;
      (s.dailyIn || s.dailyIncome.map(v => (v ? { aplikasi: v } : {}))).forEach((inc, i) => {
        const day = a.days[isoOf(new Date(st.getFullYear(), st.getMonth(), st.getDate() + i))] ||= { inc: {}, out: {} };
        for (const [k, v] of Object.entries(inc)) day.inc[k] = (day.inc[k] || 0) + v;
        for (const [k, v] of Object.entries(s.dailyOut?.[i] || {})) day.out[k] = (day.out[k] || 0) + v;
      });
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

  // Seberapa naik-turun pendapatan, dihitung dari hari tersepi, rata-rata, dan hari teramai sebulan terakhir.
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
    const r = S.resilience, p = S.profile;
    const income = c.income, net = income - c.expense;
    const surplusRatio = income > 0 ? net / income : -1;
    const dsr = income > 0 ? c.debtMonthly / income : (c.debtMonthly > 0 ? 1 : 0);
    const emergency = Number(r.savings) || 0;
    const months = c.expense > 0 ? emergency / c.expense : 0;
    const pokok = pokokPerDay(c), days = pokok > 0 ? emergency / pokok : 0;
    const vol = volatility(), bud = budgetStatus(c);
    const open = S.debts.filter(debtOpen);
    const short = open.filter(isShort), high = open.filter(isHighCost);
    const shortTotal = short.reduce((s, d) => s + Number(d.remaining), 0);
    const risky = short.filter(isRisky);
    const totalDebt = open.reduce((s, d) => s + Number(d.remaining), 0);
    const dti = income > 0 ? totalDebt / (12 * income) : (totalDebt ? 1 : 0);
    const monthlySave = effectiveMonthlySave();
    const saveRate = income > 0 ? monthlySave / income : 0;
    const pay = paymentRecord(), trust = dataTrust(), tier = trust.tier || 3;
    const P = (label, pts, max, value, tip) => ({ label, pts: Math.round(clamp(pts, 0, max)), max, value, tip });

    // Skor grace-v2: dibangun dari ukuran tangga (budget harian, hari bertahan, utang jangka pendek, bayar tepat waktu).
    // Arus kas 30 · Tabungan 30 · Utang 30 · Rencana 10. BPJS tidak dihitung lagi (sudah syarat jadi driver ojol).
    const groups = [
      { id: "cash", label: "Arus kas", parts: [
        P("Sisa uang per bulan", surplusRatio >= 0.1 ? 15 : surplusRatio >= 0 ? 8 + (surplusRatio / 0.1) * 7 : 8 + (surplusRatio / 0.3) * 8, 15,
          `${rp(net)} · ${pctCap(surplusRatio)} dari pendapatan`, "Usahakan sisa minimal 10% pendapatan setiap bulan."),
        P("Patuh budget harian", bud.score * 10, 10, bud.value, "Belanja harian jangan melewati budget harian Laju."),
        P("Kestabilan pendapatan", vol.ready ? { stabil: 5, naikturun: 3, fluktuatif: 1 }[vol.id] : 2, 5,
          vol.ready ? `${vol.label} · naik-turun ±${pct(vol.cv)}` : "Belum ada data harian", "Pendapatan naik-turun: susun anggaran dari pendapatan hari paling sepi."),
      ] },
      { id: "save", label: "Tabungan & ketahanan", parts: [
        P("Hari bertahan", Math.min(1, days / 30) * 20, 20,
          pokok > 0 ? `${fmtDays(days)} tanpa narik · ${rp(emergency)}` : "Pengeluaran pokok belum diisi", "Kumpulkan dana darurat sampai 30 hari bertahan tanpa narik."),
        P("Tes guncangan Rp1 juta", Math.max({ ok: 5, partial: 3, borrow: 1 }[r.shock] || 0, emergency >= 1e6 ? 5 : emergency >= 5e5 ? 3 : 0), 5,
          emergency >= 1e6 ? "Bisa, dana darurat ≥ Rp1 juta" : SHOCK_LABEL[r.shock] || "Belum diisi", "Bantalan Rp1 juta membuat biaya mendadak tidak perlu ditutup utang."),
        P("Setoran rutin", Math.min(1, saveRate / 0.1) * 5, 5,
          `${rp(monthlySave)}/bln · ${pctCap(saveRate)} dari pendapatan`, "Setor sedikit setiap hari narik, targetnya 10% pendapatan."),
      ] },
      { id: "debt", label: "Utang", parts: [
        P("Porsi cicilan", dsr <= 0.1 ? 12 : dsr <= 0.3 ? 12 - ((dsr - 0.1) / 0.2) * 6 : dsr <= 0.5 ? 6 - ((dsr - 0.3) / 0.2) * 6 : 0, 12,
          `${pctCap(dsr)} dari pendapatan`, "Jaga cicilan di bawah 30% pendapatan (batas OJK untuk pinjol mulai 2026)."),
        P("Utang jangka pendek", !short.length ? 10 : risky.length ? 0 : 10 * Math.max(0, 1 - shortTotal / Math.max(1, income)), 10,
          short.length ? `${short.length} utang · ${rp(shortTotal)}${risky.length ? ` · ${risky.length} rentenir/tidak terdaftar` : ""}` : "Tidak ada", "Lunasi pinjol, paylater, dan utang ke orang dulu, mulai dari yang paling berisiko."),
        P("Bayar tepat waktu", pay.n ? 8 * pay.onTime / pay.n : pay.late ? 0 : 5, 8,
          pay.n ? `${pay.onTime} dari ${pay.n} tagihan tepat waktu` : pay.late ? `${pay.late} tagihan lewat jatuh tempo` : "Belum ada catatan bayar", "Bayar sebelum jatuh tempo. Laju mengingatkan 3 hari sebelumnya."),
      ] },
      { id: "plan", label: "Rencana", parts: [
        P("Tujuan yang jelas", primaryGoal() ? (primaryGoalAmount() > 0 ? 4 : 2) : 0, 4,
          primaryGoal() ? (primaryGoalAmount() > 0 ? `Ada target ${rp(primaryGoalAmount())}` : "Ada, belum ada nominal") : "Belum ada", "Tetapkan tujuan utama beserta nominal dan tenggatnya."),
        P("Rekening bank", hasBankEvidence() ? 3 : 0, 3, hasBankEvidence() ? "Terbukti" : "Belum ada bukti", "Opsional. Rekening membantu kalau nanti mengajukan kredit resmi."),
        P("Sumber data", { 1: 3, 2: 2, 3: 1 }[tier], 3, { 1: "E-wallet terhubung (Tier 1)", 2: trust.partial ? "E-wallet terhubung sebagian (Tier 2)" : "E statement (Tier 2)", 3: "Isian sendiri (Tier 3)" }[tier], "Hubungkan e-wallet supaya angka terisi sendiri dan terbukti."),
      ] },
    ];
    const pillars = groups.map(g => {
      const pts = g.parts.reduce((s, x) => s + x.pts, 0), max = g.parts.reduce((s, x) => s + x.max, 0);
      const worst = [...g.parts].sort((a, b) => (b.max - b.pts) - (a.max - a.pts))[0];
      return { ...g, pts, max, score: Math.round((pts / max) * 100), tip: worst.tip, note: g.parts.map(x => `${x.label}: ${x.value}`).slice(0, 2).join(" · ") };
    });
    const total = clamp(pillars.reduce((s, g) => s + g.pts, 0), 0, 100);
    return { total, grade: band(total), pillars, months, days, pokok, surplusRatio, dsr, dti, saveRate, net, emergency, totalDebt, highDebts: high, shortDebts: short };
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

  // fix(part) = { href } atau { act, kind } + label: tempat memperbaiki komponen yang belum penuh.
  // Dengan fix, rincian poin selalu terbuka dan komponen yang belum penuh bisa diketuk (halaman Tangga).
  function vizPillars(h, { fix = null, title = "Empat pilar kesehatan finansial" } = {}) {
    const part = (pt) => {
      const k = pt.pts >= pt.max ? "full" : pt.pts > 0 ? "part" : "zero";
      const go = k !== "full" && fix ? fix(pt) : null;
      const body = `<span class="pt-row"><span class="pt-name">${pt.label}</span><span class="pt-score num"><b>${pt.pts}</b>/${pt.max}</span></span>
        <span class="pt-bar" aria-hidden="true"><i style="width:${(pt.pts / pt.max) * 100}%"></i></span>
        <span class="pt-val">${esc(pt.value)}</span>
        ${go ? `<span class="pt-fix"><span>${pt.tip}</span><b><span>${go.label}</span><i aria-hidden="true">›</i></b></span>` : ""}`;
      if (!go) return `<li class="pt ${k}">${body}</li>`;
      return `<li class="pt ${k} fixable">${go.href ? `<a class="pt-link" href="${go.href}">${body}</a>` : `<button type="button" class="pt-link" data-act="${go.act}"${go.kind ? ` data-kind="${go.kind}"` : ""}>${body}</button>`}</li>`;
    };
    return `<section class="card viz-card" aria-labelledby="pil-h">
      <div class="card-head"><h2 id="pil-h">${title}</h2><p>${fix ? "Arus kas, tabungan, dan utang maksimal 30 poin, rencana 10 poin. Ketuk bagian yang belum penuh untuk memperbaikinya." : "Arus kas, tabungan, dan utang maksimal 30 poin, rencana 10 poin."}</p></div>
      <div class="hbars">${h.pillars.map(p => {
        const b = band(p.score);
        const list = `<ul class="pt-list">${p.parts.map(part).join("")}</ul>`;
        const done = p.pts >= p.max ? `<p class="pt-tip">${ST_ICON.good}<span>Semua poin pilar ini sudah terkumpul.</span></p>` : "";
        return `<div>
          <div class="hb-head"><span>${p.label}</span><span class="val"><b>${p.pts}<small class="of">/${p.max}</small></b>${statusPill(b.id, b.label)}</span></div>
          <div class="hb-track"><span class="grid" style="left:25%"></span><span class="grid" style="left:50%"></span><span class="target" style="left:80%"></span>
            <span class="hb-fill" style="width:${Math.max(p.score, 1)}%;background:${b.color}" tabindex="0" data-tip="${esc(p.label)}: ${p.pts} dari ${p.max} poin (${b.label})."></span></div>
          ${fix ? `${list}${done}` : `<details class="parts"><summary>Rincian poin <small>${p.parts.length} komponen</small></summary>
            ${list}${done || `<p class="pt-tip">${ICON.info}<span><b>Saran:</b> ${p.tip}</span></p>`}
          </details>`}
        </div>`;
      }).join("")}</div>
      ${ticks([[0, "0"], [25, "25%"], [50, "50%"], [80, "80% sehat", "tgt"], [100, "100%"]])}
      ${fix ? "" : vizTable(["Pilar", "Poin", "Status"], h.pillars.map(p => [p.label, `${p.pts}/${p.max}`, band(p.score).label]))}
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
  let apiOffline = false;
  // Hapus satu akun di server. E statement (id "c:Nama") punya endpoint sendiri.
  const dropRemote = (id) => api(String(id).startsWith("c:") ? `/api/statements?name=${encodeURIComponent(String(id).slice(2))}` : `/api/wallets/${id}`, { method: "DELETE" });
  async function api(path, { method = "GET", body } = {}) {
    // Sudah terbukti tidak ada server: langsung ke mode contoh, supaya tidak memanggil /api yang pasti gagal.
    if (apiOffline && window.LajuDemo) return window.LajuDemo.handle(path, { method, body });
    let res = null;
    try {
      res = await fetch(path, {
        method, credentials: "same-origin",
        headers: { "X-Requested-With": "laju", ...(body ? { "Content-Type": "application/json" } : {}),
          ...(window.LajuSim?.days ? { "X-Laju-Hari": String(window.LajuSim.days) } : {}) },   // jam simulasi, lihat sim-clock.js
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) { res = null; }   // server tidak bisa dihubungi
    if (res) {
      const data = await res.json().catch(() => null);
      if (res.ok && data) return data;
      // jawaban API Laju yang berisi error tetap diteruskan apa adanya
      if (data?.error) throw Object.assign(new Error(data.error.message), { code: data.error.code });
    }
    // Bukan jawaban API Laju: halaman dibuka tanpa server (mis. dari GitHub Pages).
    // Mode contoh melayani sendiri di browser supaya e-wallet tetap bisa didemokan.
    if (window.LajuDemo) { apiOffline = true; return window.LajuDemo.handle(path, { method, body }); }
    throw Object.assign(new Error("Server Laju tidak bisa dihubungi."), { code: "offline" });
  }

  // Tiga data contoh driver, dipakai tombol "Isi contoh" dan "Data contoh".
  // Urutan: skor di bawah rata-rata → sekitar rata-rata → di atas rata-rata.
  const demoExpenses = (o) => Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, o[c.id] ? { on: true, min: o[c.id][0], max: o[c.id][1] } : { on: false, min: 0, max: 0 }]));
  function demoState(variant = 1) {
    const nextOn = (day) => { const t = new Date(), d = new Date(t.getFullYear(), t.getMonth(), day); if (d <= t) d.setMonth(d.getMonth() + 1); return isoOf(d); };
    const consent = { useWallet: true, useManual: true, agreeTerms: true, agreeDataUse: true };
    const demos = [
      {   // di bawah rata-rata: minus tiap bulan, utang bunga tinggi berlapis, tanpa bantalan & proteksi
        account: { fullName: "Andi Saputra", phone: "085711223344", password: "contoh1234", city: "Bekasi" },
        profile: { platforms: ["maxim", "grab"], vehicle: "motor", ownership: "sewa", hoursPerDay: 11, daysPerWeek: 6, area: "Bekasi Timur", status: "menikah", dependents: 2, sideJobs: [], hasInsurance: false, channels: ["ovo", "dana"], recordsIncome: "kadang" },
        consent,
income: { perPlatform: { maxim: 90000, grab: 70000 }, bonus: 100000, tips: 50000, other: 0, weekAvg: 160000, best: 300000, worst: 60000 },
        expenses: demoExpenses({ makan: [1500000, 1900000], kontrakan: [800000, 900000], listrik: [200000, 300000], sekolah: [150000, 300000], bbm: [900000, 1300000], servis: [100000, 250000], pulsa: [100000, 150000], parkir: [50000, 100000], rokok: [400000, 600000], sosial: [100000, 200000] }),
        debts: [{ type: "Pinjol", remaining: 3500000, months: "", rate: "", due: nextOn(10) }, { type: "Paylater", remaining: 1200000, months: 3, rate: "3", due: nextOn(20) }, { type: "Rentenir", remaining: 2000000, months: 4, rate: "10", due: nextOn(7) }],
        resilience: { savings: 50000, growth: 0, monthlySave: 0, habit: "never", places: ["Uang tunai di rumah"], shock: "none", goals: ["pendidikan"], goalData: { pendidikan: { amount: 6700000, saved: 0 } }, horizon: 12, wantsBankLoan: false },
      },
      {   // sekitar rata-rata
        account: { fullName: "Sudirman Hasibuan", phone: "081234567890", password: "contoh1234", city: "Pekanbaru" },
        profile: { platforms: ["gojek", "shopeefood"], vehicle: "motor", ownership: "kredit", hoursPerDay: 10, daysPerWeek: 6, area: "Panam & Sudirman", status: "menikah", dependents: 3, sideJobs: ["Warung"], hasInsurance: false, channels: ["gopay", "shopeepay"], recordsIncome: "kadang" },
        consent,
income: { perPlatform: { gojek: 135000, shopeefood: 50000 }, bonus: 300000, tips: 120000, other: 900000, weekAvg: 185000, best: 280000, worst: 90000 },
        expenses: demoExpenses(Object.fromEntries(EXPENSE_CATEGORIES.filter(c => !c.off).map(c => [c.id, [c.min, c.max]]))),   // angka umum per kategori
        debts: [{ type: "Pinjol", remaining: 2400000, months: 6, rate: "4", due: nextOn(15) }, { type: "Cicilan", remaining: 9600000, months: 12, rate: "1.6", due: nextOn(5) }],
        resilience: { savings: 650000, growth: 0, monthlySave: 200000, habit: "sisa", places: ["E-wallet", "Uang tunai di rumah", "Arisan"], shock: "borrow", goals: ["usaha"], goalData: { usaha: { amount: 5000000, saved: 0 } }, horizon: 18, wantsBankLoan: true },
      },
      {   // di atas rata-rata: surplus sehat, dana darurat penuh, proteksi lengkap, utang murah
        account: { fullName: "Wayan Sudarsana", phone: "081999887766", password: "contoh1234", city: "Denpasar" },
        profile: { platforms: ["gojek", "grab"], vehicle: "motor", ownership: "lunas", hoursPerDay: 9, daysPerWeek: 6, area: "Denpasar Selatan", status: "menikah", dependents: 2, sideJobs: ["Jualan online"], hasInsurance: false, channels: ["gopay", "ovo"], recordsIncome: "kadang" },
        consent,
income: { perPlatform: { gojek: 160000, grab: 110000 }, bonus: 400000, tips: 150000, other: 1200000, weekAvg: 270000, best: 310000, worst: 230000 },
        expenses: demoExpenses({ makan: [1600000, 2000000], kontrakan: [700000, 700000], listrik: [200000, 300000], sekolah: [150000, 250000], kirim: [200000, 300000], bbm: [800000, 1000000], servis: [100000, 200000], pulsa: [100000, 150000], parkir: [50000, 100000], sosial: [100000, 200000] }),
        debts: [{ type: "Bank", remaining: 3000000, months: 10, rate: "0.5", due: nextOn(25) }],
        resilience: { savings: 12000000, growth: 0, monthlySave: 1200000, habit: "rutin", places: ["Rekening bank", "E-wallet", "Emas"], shock: "ok", goals: ["rumah", "pendidikan", "usaha"], goalData: { rumah: { amount: 20000000, saved: 6500000 } }, horizon: 24, wantsBankLoan: true },
      },
    ];
    return deepMerge(fresh(), demos[clamp(variant, 0, demos.length - 1)]);
  }
  // Setiap tekan tombol contoh berpindah ke data berikutnya (di bawah → rata-rata → di atas → ulang).
  // ---------- Skenario demo: driver dengan e-wallet + e statement (mode simulasi) ----------
  // Rudi memakai GoPay dan OVO (terhubung lewat simulasi) dan rekening BRI (contoh e statement), mulai dari minus dengan
  // utang jangka pendek. Dipakai tombol "Isi contoh" di onboarding (urutan ke-4) dan "Data contoh" di app.
  // finish=false: hanya mengisi onboarding, driver tetap menyelesaikan langkahnya sendiri.
  async function buildScenario({ finish = true } = {}) {
    const H = { "X-Requested-With": "laju", "Content-Type": "application/json" }, phone = "081234567890";
    window.LajuSim?.reset();
    try { await fetch("/api/wallets", { method: "DELETE", credentials: "same-origin", headers: H }); } catch (e) { /* abaikan */ }
    const wallets = [];
    for (const w of ["gopay", "ovo"]) {
      const { redirectUrl } = await api("/api/wallets/link", { method: "POST", body: { walletId: w, phone } });
      const q = new URL(redirectUrl, location.href).searchParams, cb = new URL(q.get("callback"));
      await fetch(`${cb.pathname}?${new URLSearchParams({ session: q.get("session"), code: q.get("code"), wallet: w, ref: phone })}`, { credentials: "same-origin" });
      const { others, ...v } = await api(`/api/wallets/${w}/sync`, { method: "POST", body: {} });
      wallets.push(v);
    }
    const { others, ...bri } = await api("/api/statements/sample", { method: "POST", body: { name: "BRI" } });
    for (const o of others || []) { const j = wallets.findIndex(x => x.walletId === o.walletId); if (j >= 0) wallets[j] = o; }
    wallets.push(bri);
    const nextOn = (n) => isoOf(new Date(Date.now() + n * 864e5));
    S = demoState(1);
    Object.assign(S.account, { fullName: "Rudi Hartono", phone, password: "contoh1234", city: "Bekasi" });
    Object.assign(S.profile, { platforms: ["gojek", "grab"], ownership: "kredit", channels: ["gopay", "ovo", "c:BRI"], customChannels: ["BRI"], payoutTo: { BRI: "tidak" }, dependents: 2 });
    S.consent.useWallet = true; S.consent.walletPhones = { gopay: phone, ovo: phone };
    S.debts = [
      { type: "Paylater", remaining: 900000, cicilan: 300000, months: 3, rate: "3", due: nextOn(9), addedAt: todayIso() },
      { type: "Pinjol", remaining: 1500000, cicilan: 500000, months: 3, rate: "4", due: nextOn(16), addedAt: todayIso() },
      { type: "Cicilan", remaining: 14000000, cicilan: 1400000, months: 10, rate: "1.5", due: nextOn(5), addedAt: todayIso() },
    ];
    Object.assign(S.resilience, { savings: 100000, growth: 0, monthlySave: 0, goals: ["usaha"], goalData: { usaha: { amount: 1500000, saved: 0, deadline: nextOn(240) } }, wantsBankLoan: true });
    Object.assign(S, { wallets, monthly: { checks: [] }, payments: [], daily: {}, growth: {}, ledger: [], scoreLog: [], startSnap: null });
    autofillFromVerified();
    // Sewa kontrakan dibayar tunai (tidak terlihat di e-wallet), jadi diisi sendiri. Besarnya dibuat supaya driver
    // mulai dari minus, sekitar Rp40 rb per hari di atas budget, berapa pun angka acak simulasinya.
    { const cc = calc(), budget = dailyBudget(cc), rent = r1k(Math.max(600000, (budget + 40000) * 30 - cc.expMid));
      S.expenses.kontrakan = { ...(S.expenses.kontrakan || {}), on: true, min: rent, max: rent }; }
    if (finish) {
      Object.assign(S, { finished: true, finishedAt: new Date().toISOString() });
      S.startSnap = snapshotMetrics();
    }
    S.account.pass = await hashPass(S.account.password);
    return S;
  }

  let demoIdx = -1;
  function nextDemoState() {
    try { demoIdx = Number(localStorage.getItem("laju-demo-idx") ?? -1); } catch (e) { /* storage tidak tersedia */ }
    demoIdx = (demoIdx + 1) % (ui.config?.mode === "simulasi" ? 4 : 3);   // ke-4: skenario e-wallet + e statement
    try { localStorage.setItem("laju-demo-idx", String(demoIdx)); } catch (e) { /* abaikan */ }
    return demoIdx === 3 ? null : demoState(demoIdx);   // null = pakai buildScenario()
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
  const DEBT_RATE_GUESS = { Pinjol: 3, Paylater: 3, Rentenir: 10, "Keluarga / teman": 0 };
  const debtRate = (d) => (Number(d.rate) > 0 ? Number(d.rate) : DEBT_RATE_GUESS[d.type] || 0);
  const debtOpen = (d) => (Number(d.remaining) || 0) > 0;
  const debtPrincipal = (d) => Number(d.remaining) || 0;
  const debtTenor = (d) => Number(d.months) || 0;
  const debtPayment = (d) => Number(d.cicilan) || 0;   // cicilan yang diisi pengguna
  const debtInstallment = (d) => {   // yang dipakai hitungan: isian pengguna, atau perkiraan sisa / tenor
    const pay = debtPayment(d); if (pay > 0) return pay;
    const b = debtPrincipal(d), m = debtTenor(d);
    return b <= 0 ? 0 : m > 0 ? b / m : b / 12;
  };

  // Bunga efektif per tahun dari pokok, cicilan, dan tenor (bisection pada nilai sekarang anuitas).
  // null kalau datanya kurang, dan menurut aturan tim data kurang dianggap bunga tinggi.
  function effectiveAPR(pokok, cicilan, tenor) {
    pokok = Number(pokok) || 0; cicilan = Number(cicilan) || 0; tenor = Number(tenor) || 0;
    if (!(pokok > 0 && cicilan > 0 && tenor > 0)) return null;
    if (cicilan * tenor <= pokok) return 0;                       // tidak ada bunga
    const pv = (r) => (r <= 1e-9 ? cicilan * tenor : (cicilan * (1 - Math.pow(1 + r, -tenor))) / r);
    let lo = 0, hi = 1;
    while (pv(hi) > pokok && hi < 1e4) hi *= 2;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (pv(mid) > pokok) lo = mid; else hi = mid; }
    return ((lo + hi) / 2) * 12;
  }
  const AUTO_HIGH = ["Pinjol", "Paylater", "Rentenir", "Kartu kredit"];
  const isFamilyDebt = (d) => /keluarga|teman/i.test(debtTypeLabel(d));
  function isHighInterest(d) {
    if (AUTO_HIGH.includes(d.type)) return true;
    if (isFamilyDebt(d)) return false;                            // tidak menahan Step 2, tapi wajib punya jadwal bayar
    const apr = effectiveAPR(debtPrincipal(d), debtPayment(d), debtTenor(d));
    if (apr !== null) return apr >= MILESTONE.HIGH_INTEREST_APR;
    const r = Number(d.rate) || 0;                                // cicilan belum diisi: pakai bunga kalau ada
    return r > 0 ? (r / 100) * 12 >= MILESTONE.HIGH_INTEREST_APR : true;
  }
  const isHighCost = isHighInterest;   // nama lama masih dipakai beberapa tempat
  const needsSchedule = (d) => isFamilyDebt(d) && debtOpen(d) && !String(d.jadwalBayar || "").trim();
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

  // ---------- penyesuaian data onboarding main untuk tangga grace-v2 ----------
  // Onboarding main menyimpan pengeluaran per kategori (rentang) dan banyak tujuan (goalData). Tangga grace-v2
  // butuh pengeluaran per hari per kelompok dan satu tujuan utama: diambil dari tujuan pertama yang dipilih.
  const POKOK_GROUPS = ["rumah", "kendaraan"];
  const expDailyOf = (g) => EXPENSE_CATEGORIES.filter(k => k.group === g).reduce((t, k) => t + expMidOf(k.id), 0) / 30;
  const primaryGoal = () => (S.resilience.goals || [])[0] || "";
  const primaryGoalAmount = () => Number((S.resilience.goalData || {})[primaryGoal()]?.amount) || 0;
  const primaryGoalSaved = () => Number((S.resilience.goalData || {})[primaryGoal()]?.saved) || 0;
  const primaryGoalDeadline = () => (S.resilience.goalData || {})[primaryGoal()]?.deadline || "";

  // ---------- tambahan grace-v2: jangka pendek dan panjang ----------
  // Jangka pendek (tahap 2): pinjol, paylater, rentenir, utang ke orang, tagihan menunggak.
  // Jangka panjang (jalur cicilan, bukan tahap): cicilan kendaraan, bank, koperasi. Driver bisa mengubahnya per utang.
  function defaultTerm(type) { return ["Cicilan", "Bank", "Koperasi"].includes(type) ? "panjang" : "pendek"; }
  const isShort = (d) => (d.term || defaultTerm(d.type)) === "pendek";
  const isFamily = (d) => d.type === "Keluarga / teman" || isFamilyDebt(d);
  const isRisky = (d) => d.type === "Rentenir" || (d.type === "Pinjol" && d.ojk === "tidak");
  const shortDebts = () => S.debts.filter(d => debtOpen(d) && isShort(d));
  const longDebts = () => S.debts.filter(d => debtOpen(d) && !isShort(d));
  const longMonthly = () => r1k(longDebts().reduce((s, d) => s + debtInstallment(d), 0));
  const dueAmount = (d) => r1k(Math.min(Number(d.remaining) || 0, debtInstallment(d)));

  // ---------- tanggal & hitung mundur ----------
  // Hitung mundur selalu ditulis sisa hari + tanggal: "33 hari lagi · sekitar 8 Des".
  const todayIso = () => isoOf(new Date());
  const daysUntil = (iso) => (iso ? Math.round((parseIso(iso) - parseIso(todayIso())) / 864e5) : null);
  const dayMonth = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
  const countdown = (n) => (n == null ? "" : n <= 0 ? "hari ini" : `${n} hari lagi · sekitar ${dayMonth(inDays(n))}`);
  const fmtDays = (d) => `${d >= 100 ? "lebih dari 99" : (Math.round(d * 10) / 10).toLocaleString("id-ID", { maximumFractionDigits: d < 10 ? 1 : 0 })} hari`;
  function rollDue(d) {   // tagihan dibayar: jatuh tempo maju satu bulan
    if (!d.due) return;
    const t = parseIso(d.due); t.setMonth(t.getMonth() + 1); d.due = isoOf(t);
  }

  // ---------- catatan bayar & pengingat ----------
  function paymentRecord() {
    const list = S.payments || [];
    const late = S.debts.filter(d => debtOpen(d) && d.due && daysUntil(d.due) < 0).length;
    return { n: list.length, onTime: list.filter(p => p.onTime).length, late, list };
  }
  const REMIND_DAYS = 3;
  // Tagihan yang jatuh tempo dalam 3 hari atau sudah lewat (semua utang, jangka pendek maupun panjang)
  const dueReminders = () => S.debts.map((d, i) => ({ d, i, days: daysUntil(d.due), amt: dueAmount(d) }))
    .filter(o => debtOpen(o.d) && o.d.due && o.days <= REMIND_DAYS).sort((a, b) => a.days - b.days);

  // ---------- budget harian & hari bertahan ----------
  // budget harian = (pendapatan bulanan − cicilan jangka panjang bulanan) ÷ 30.
  // Utang jangka pendek dibayar dari setoran (tahap 3), jadi tidak dipotong di sini.
  const dailyBudget = (c) => Math.max(0, Math.floor((c.income - longMonthly()) / 30 / 1000) * 1000);   // dibulatkan ke bawah per Rp1.000
  // Pengeluaran pokok per hari: kelompok rumah tangga + operasional kerja. Dasar bantalan (3 hari) dan dana darurat (30 hari).
  function pokokPerDay(c) {
    if (!c.auto) return POKOK_GROUPS.reduce((t, g) => t + expDailyOf(g), 0) || (c.expMid / 30) * 0.8;
    const ids = EXPENSE_CATEGORIES.filter(k => POKOK_GROUPS.includes(k.group)).map(k => k.id);
    const v = ids.reduce((t, id) => t + (c.agg.byCategory[id] || 0), 0) / 30;
    return v || (c.expMid / 30) * 0.8;
  }
  // Uang keluar per tanggal. Sumbernya, berurutan:
  //   1. transaksi (e-wallet terhubung atau e statement) kalau tanggal itu tercakup datanya;
  //   2. catatan "keluar hari ini" dari driver (S.daily);
  //   3. belum ada: e-wallet = belum disinkron, e statement = menunggu e statement bulan itu, isian sendiri = belum dicatat.
  // Hari yang belum ada datanya TIDAK dianggap sesuai budget. Tagihan bulanan (sewa, listrik, sekolah) tidak ikut cek
  // harian, supaya hari bayar sewa tidak terlihat boros; budget untuk cek dikurangi bagian per harinya (fixedPerDay).
  const FIXED_BILLS = ["kontrakan", "listrik", "sekolah"];
  const fixedPerDay = (c) => (c.auto ? FIXED_BILLS.reduce((t, id) => t + (c.agg.byCategory[id] || 0), 0) / 30 : 0);
  // Mode budget harian: e-wallet tercatat sendiri tiap hari; e statement dan isian sendiri dicatat driver.
  const budgetMode = () => (S.consent.useWallet && S.wallets.some(w => w.summary && !w.stale && w.source !== "statement") ? "wallet"
    : S.wallets.some(w => w.summary && w.source === "statement") ? "pdf" : "manual");
  const dataSpent = (iso, c) => { const day = c.agg?.days?.[iso]; return day ? Object.entries(day.out).reduce((t, [k, v]) => t + (FIXED_BILLS.includes(k) ? 0 : v), 0) : null; };
  function dayInfo(iso, c) {
    const v = dataSpent(iso, c);
    if (v != null) return { spent: v, src: "data" };
    if (S.daily?.[iso] != null) return { spent: Number(S.daily[iso]), src: "catatan" };
    return { spent: null, src: null };
  }
  const spentOn = (iso, c) => dayInfo(iso, c).spent;
  function spendLog(c, n = 7) {
    return Array.from({ length: n }, (_, k) => { const d = inDays(k - n); const iso = isoOf(d); return { iso, d, ...dayInfo(iso, c) }; });
  }
  // Patuh budget (skor): hari yang ada datanya dan tidak melewati budget. Hari tanpa data tidak dihitung.
  // Mode e statement: catatan driver bersifat sementara sampai e statement bulan itu diunggah.
  function budgetStatus(c) {
    const b = dailyBudget(c) - fixedPerDay(c), all = spendLog(c, 7), log = all.filter(x => x.spent != null);
    const provisional = budgetMode() === "pdf" && (log.some(x => x.src === "catatan") || log.length < all.length);
    if (log.length >= 3) {
      const ok = log.filter(x => x.spent <= b * 1.05).length;
      return { score: ok / log.length, value: `${ok} dari ${log.length} hari sesuai budget ${rpShort(b)}/hari${provisional ? " (sementara)" : ""}`, days: log.length, ok, provisional };
    }
    const avg = c.expMid / 30;
    return { score: avg <= b ? 1 : Math.max(0, 1 - (avg - b) / Math.max(1, b) / 0.3), value: `rata-rata ${rpShort(avg)}/hari · budget ${rpShort(b)}/hari`, days: 0, provisional };
  }
  // Verifikasi akhir bulan: catatan harian driver dibandingkan dengan transaksi (e statement) di tanggal yang sama.
  // Mutasi tidak memuat uang tunai, jadi catatan boleh lebih besar. Yang ditandai hanya catatan yang lebih kecil
  // dari transaksi (ada pengeluaran yang tidak dicatat).
  function verifyDaily(c, n = 30) {
    let days = 0, ok = 0, under = 0;
    for (let k = 1; k <= n; k++) {
      const iso = isoOf(inDays(-k)), v = dataSpent(iso, c);
      if (v == null || S.daily?.[iso] == null) continue;
      days++; if (Number(S.daily[iso]) >= v * 0.95) ok++; else under++;
    }
    return { days, ok, under };
  }

  // ---------- setoran harian & pembagiannya ----------
  // Setoran dipilih driver lewat penggeser. Batas bawah = kebutuhan per hari sampai tagihan jangka pendek terdekat,
  // batas atas = budget harian − pengeluaran pokok (makan, sewa, bensin tidak boleh dikorbankan).
  const MINI_DAYS = 3, FULL_DAYS = 30, SAFE_DAYS = 90;
  function nearestShortDue() {
    return shortDebts().filter(d => d.due && !isFamily(d)).map(d => ({ d, days: Math.max(1, daysUntil(d.due)), amt: dueAmount(d) }))
      .sort((a, b) => a.days - b.days)[0] || null;
  }
  function setoranRange(c) {
    const budget = dailyBudget(c), pokok = pokokPerDay(c), near = nearestShortDue();
    const need = near ? Math.ceil(near.amt / near.days / 1000) * 1000 : 0;
    const max = Math.max(0, Math.floor((budget - pokok) / 1000) * 1000);
    const slack = Math.max(0, Math.floor((budget - c.expMid / 30) / 1000) * 1000);   // sisa budget setelah belanja rata-rata
    const min = Math.min(need, max);
    // saran: ada tagihan jangka pendek = di tengah antara kebutuhan terdekat dan batas atas; tidak ada = sisa budget (minimal 5%)
    const suggested = clamp(near ? Math.round((need + max) / 2 / 1000) * 1000 : Math.max(slack, Math.round(budget * 0.05 / 1000) * 1000), min, max);
    const saved = Number(S.milestones.setoran) || 0;
    const value = saved > 0 ? clamp(saved, min, max) : suggested;
    return { budget, pokok, near, need, min, max, slack, suggested, value, chosen: saved > 0, spendBudget: Math.max(0, budget - value),
      shortfall: near && need > max ? r1k((need - max) * near.days) : 0 };
  }
  // Pembagian setoran ke bantalan dan utang mengikuti jatuh tempo terdekat:
  // kebutuhan/hari < 50% setoran = 20% bantalan, 50–80% = 10%, > 80% = 0%. Bantalan mini penuh = 0%.
  function cushionShare(x) {
    if (!x.shortDebts.length) return { share: 1, ratio: 0, tone: "aman" };
    if (x.emergency >= MINI_DAYS * x.pokok) return { share: 0, ratio: 0, tone: "penuh" };
    const n = x.setor.near, r = n ? (n.amt / n.days) / Math.max(1, x.setor.value) : 0;
    return r < 0.5 ? { share: 0.2, ratio: r, tone: "aman" } : r <= 0.8 ? { share: 0.1, ratio: r, tone: "agak mepet" } : { share: 0, ratio: r, tone: "mepet" };
  }

  // ---------- urutan pelunasan (rekomendasi Laju, driver tidak perlu memilih) ----------
  // Dicek dari atas: (1) tagihan terancam telat, (2) rentenir / pinjol tidak terdaftar OJK, (3) bisa lunas dalam 30 hari,
  // (4) bunga per bulan paling mahal, (terakhir) utang ke keluarga/teman tanpa bunga.
  function payoffOrder(debts, perDay) {
    const info = debts.map(d => { const days = d.due ? Math.max(0, daysUntil(d.due)) : null, amt = dueAmount(d);
      return { d, days, amt, need: days != null ? amt / Math.max(1, days) : 0, interest: Number(d.remaining) * debtRate(d) / 100 }; });
    for (const o of info) {
      if (isFamily(o.d) || (debtRate(o.d) === 0 && !isRisky(o.d))) { o.rank = 5; o.why = "Tanpa bunga. Tetap tepati janji tanggalnya."; }
      else if (o.days != null && (o.days <= 7 || (perDay > 0 && o.need > 0.8 * perDay))) { o.rank = 1; o.why = `Jatuh tempo ${dayMonth(parseIso(o.d.due))}. Kalau telat kena denda.`; }
      else if (isRisky(o.d)) { o.rank = 2; o.why = "Bunganya paling berat dan penagihannya paling berisiko."; }
      else if (perDay > 0 && Number(o.d.remaining) <= perDay * 30) { o.rank = 3; o.why = "Lunas sebulan lagi, tagihan bulananmu berkurang satu."; }
      else { o.rank = 4; o.why = `Bunganya ${rpShort(o.interest)} per bulan.`; }
    }
    const tie = { 1: (a, b) => a.days - b.days, 2: (a, b) => debtRate(b.d) - debtRate(a.d), 3: (a, b) => Number(a.d.remaining) - Number(b.d.remaining), 4: (a, b) => b.interest - a.interest, 5: (a, b) => (a.days ?? 999) - (b.days ?? 999) };
    info.sort((a, b) => a.rank - b.rank || tie[a.rank](a, b));
    const firstHigh = info.find(o => o.rank === 4); if (firstHigh) firstHigh.why = firstHigh.why.replace(/\.$/, ", paling mahal.");
    return info;
  }
  // Simulasi harian: bagian utang dari setoran dibayarkan berurutan, bunga berjalan per hari.
  // Tiap utang punya dua angka terpisah: tagihan berikutnya (jumlah, tanggal, aman/mepet) dan perkiraan lunas.
  function payoffPlan(x) {
    const debts = x.shortDebts, perDay = Math.round(x.setor.value * (1 - x.cushion.share));
    const order = payoffOrder(debts, perDay);
    const bal = order.map(o => Number(o.d.remaining)), fin = order.map(() => null);
    let day = 0;
    while (perDay > 0 && fin.some(f => f == null) && day < 3650) {
      day++; let pool = perDay;
      order.forEach((o, k) => { if (fin[k] == null) bal[k] += bal[k] * debtRate(o.d) / 100 / 30; });
      for (let k = 0; k < order.length && pool > 0; k++) { if (fin[k] != null) continue; const p = Math.min(pool, bal[k]); bal[k] -= p; pool -= p; if (bal[k] <= 1) fin[k] = day; }
    }
    const rows = order.map((o, k) => {
      const need = o.days != null ? o.amt / Math.max(1, o.days) : 0, r = perDay > 0 ? need / perDay : 1;
      const tone = o.days == null ? "" : r < 0.5 ? "aman" : r <= 0.8 ? "agak mepet" : r <= 1 ? "mepet" : "kurang";
      return { ...o, i: S.debts.indexOf(o.d), n: k + 1, finishDays: fin[k], tone };
    });
    const allDays = rows.length && rows.every(r => r.finishDays != null) ? Math.max(...rows.map(r => r.finishDays)) : rows.length ? null : 0;
    const base = Math.max(S.milestones.baseline.short || 0, debts.reduce((s, d) => s + Number(d.remaining), 0));
    return { perDay, rows, allDays, base };
  }


  // ---------- tabungan ----------
  // Rata-rata pendapatan ojol per hari narik, batas atas slider setoran harian.
  function dailyAppIncome(c) {
    if (c.auto) return c.agg.activeDays ? c.agg.incomePlatform / c.agg.activeDays : c.appIncome / Math.max(1, S.profile.daysPerWeek * WEEKS);
    return (c.appIncome || c.income) / Math.max(1, S.profile.daysPerWeek * WEEKS);
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

  const TIER = {
    0: { label: "Tanpa data", tone: "critical", apply: "Selesaikan onboarding dulu." },
    1: { label: "Terverifikasi penuh", tone: "good", apply: "Data lengkap untuk bank. Pengajuan terbuka kalau syarat lain di tahap Siap ajukan kredit juga terpenuhi." },
    2: { label: "Bukti dokumen", tone: "warn", apply: "Dipakai untuk panduan dan rapor. Pengajuan kredit butuh e-wallet terhubung (Tier 1)." },
    3: { label: "Mandiri", tone: "serious", apply: "Isian sendiri, dipakai untuk panduan. Pengajuan kredit butuh e-wallet terhubung (Tier 1)." },
  };
  const TIER_PARTIAL = { label: "Terhubung sebagian", tone: "warn", apply: "Sebagian dompet yang Anda pilih belum terhubung, jadi uang di sana tidak terbaca. Hubungkan semuanya supaya Tier 1." };
  const TIER1_PENDING = { label: "Terverifikasi, rekam jejak berjalan", tone: "good", apply: "Pengajuan kredit terbuka setelah syarat di bawah terpenuhi." };
  // ---------- Tier kepercayaan data + pendapatan yang diakui bank ----------
  // Satu aturan (dokumen "Semua Skenario Data Uang dan Rekening"): hanya uang yang terbukti dari sumbernya
  // yang dipakai untuk pengajuan kredit. Isian manual tetap dipakai, tapi hanya untuk panduan.
  // Kalau ragu, hitung lebih rendah: uang masuk yang tidak dikenali tidak pernah jadi pendapatan bank.
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
    const live = S.wallets.filter(w => w.summary && !w.stale && isEvidence(w)), stale = S.wallets.filter(w => w.summary && w.stale && isEvidence(w));
    const reasons = [], ew = editUrl("ewallet");
    const add = (t, act = null) => reasons.push({ t, act });
    if (!live.length) {   // Kasus A2, A4, B2
      const tier = S.finished ? 3 : 0;
      if (stale.length) add(`Izin ${stale.map(w => channelLabel(w.walletId)).join(", ")} sudah berakhir. Hubungkan lagi untuk membuka pengajuan.`, { href: ew, label: "Hubungkan lagi" });
      else add("Belum ada e-wallet atau rekening yang terhubung. Isian manual hanya dipakai untuk panduan.", { href: ew, label: "Hubungkan e-wallet" });
      return { tier, ...TIER[tier], reasons, months: 0, classified: null, bankIncome: 0, live: 0, partial: false, ready: false, checks: monthlyChecks().done, sources: [], chart: null };
    }
    // riwayat semua dompet terhubung digabung per 30 hari (indeks 0 = 30 hari terakhir)
    const H = live.map(w => w.summary.history || { months: 1, monthlyPlatform: [w.summary.incomePlatform || 0], monthlyBonus: [0], classifiedShare: w.summary.categorizedRatio ?? 1 });
    const months = Math.max(...H.map(h => h.months));
    const series = (key) => Array.from({ length: months }, (_, i) => H.reduce((t, h) => t + (h[key][i] || 0), 0));
    const plat = series("monthlyPlatform"), bonus = series("monthlyBonus").filter(v => v > 0);
    const track = monthlyTrack(H, months, plat, series);
    const weight = live.map(w => (w.summary.incomePlatform || 0) + (w.summary.expenseTotal || 0) + 1);
    const classified = H.reduce((t, h, i) => t + h.classifiedShare * weight[i], 0) / weight.reduce((t, v) => t + v, 0);
    // median bulanan, bukan rata-rata (Kasus D1, G3). Bonus hanya kalau muncul minimal 3 bulan, bobot setengah (Kasus D2).
    const bankIncome = Math.round((medianOf(plat) + (bonus.length >= 3 ? 0.5 * medianOf(bonus) : 0)) / 1000) * 1000;
    let tier = months >= 6 && classified >= 0.85 ? 1 : months < 3 || classified < 0.6 ? 3 : 2;
    const cap2 = () => { if (tier === 1) tier = 2; };
    const missing = channelStatus().notConnected, gapsNow = payoutGaps(live);
    const partial = tier <= 2 && (missing.length > 0 || gapsNow.length > 0);   // tampil "Terhubung sebagian" (grace-v2)
    if (missing.length) { cap2(); add(`${missing.map(channelLabel).join(", ")} belum terhubung.`, { href: ew, label: "Hubungkan" }); }   // Kasus G4, B6
    stale.forEach(w => { cap2(); add(`Izin ${channelLabel(w.walletId)} berakhir. Data terakhirnya masih dipakai.`, { href: ew, label: "Hubungkan lagi" }); });
    payoutGaps(live).forEach(g => { cap2(); add(g.text, g.wallet ? { href: ew, label: `Hubungkan ${channelLabel(g.wallet)}` } : null); });
    const unsupported = Object.entries(S.profile.payoutTo || {}).filter(([n, v]) => v === "ya" && (S.profile.channels || []).includes("c:" + n)).map(([n]) => n);
    if (unsupported.length) { cap2(); add(`Pencairan juga masuk ke ${unsupported.join(", ")} yang belum bisa dihubungkan.`); }   // Kasus C1
    if (months < 6) add(`Riwayat transaksi baru ${months} bulan. Butuh 6 bulan untuk terverifikasi penuh.`);   // Kasus C7, B1
    track.notes.forEach(t => add(t));
    if (classified < 0.85) add(`${Math.round(classified * 100)}% transaksi dikenali. Butuh minimal 85%.`);   // Kasus F6
    const old = live.filter(w => w.syncedAt && Date.now() - new Date(w.syncedAt).getTime() > 14 * 864e5);
    if (old.length) add(`Data ${old.map(w => channelLabel(w.walletId)).join(", ")} terakhir diperbarui ${relTime(old[0].syncedAt)}. Label "data belum diperbarui" ikut terkirim ke bank.`, { href: ew, label: "Sinkron ulang" });   // Kasus C5
    // tambahan untuk tangga dan Profil versi grace-v2: rekam jejak cek bulanan, siap kredit, grafik, asal data
    const mc = monthlyChecks(), checks = mc.done;
    if (tier === 1 && checks < CHECK_TOTAL) add(`Rekam jejak di Laju: ${checks} dari ${CHECK_TOTAL} cek bulanan. ${mc.pending ? "Cek bulan ini sudah bisa dilakukan." : `Cek berikutnya ${mc.nextAt ? fmtDate(isoOf(mc.nextAt)) : "setelah onboarding"}.`}`, mc.pending ? { href: "app.html#dashboard", label: "Cek sekarang" } : null);
    const ready = tier === 1 && months >= 6 && classified >= 0.85 && checks >= CHECK_TOTAL;
    const seriesOf = (idx, key) => Array.from({ length: months }, (_, i) => idx.reduce((t, k) => t + ((H[k][key] || [])[i] || 0), 0));
    const docIdx = live.map((w, i) => (w.source === "statement" ? i : -1)).filter(i => i >= 0);
    const apiIdx = live.map((w, i) => (w.source !== "statement" ? i : -1)).filter(i => i >= 0);
    const docMonths = Math.max(0, ...docIdx.map(i => H[i].months));
    const lowK = plat.length ? plat.indexOf(Math.min(...plat)) : -1;
    const chart = { api: seriesOf(apiIdx, "monthlyPlatform"), doc: docIdx.length ? seriesOf(docIdx, "monthlyPlatform").map((v, i) => (i < docMonths ? v : null)) : [],
      median: Math.round(medianOf(plat) / 1000) * 1000, debt: [], moneyIn: track.months ? series("monthlyIn") : [], moneyOut: track.months ? series("monthlyOut") : [],
      lowest: lowK >= 0 ? { i: lowK, v: plat[lowK] } : null };
    const sources = live.map(w => ({ id: w.walletId, label: channelLabel(w.walletId), kind: w.source === "statement" ? "dokumen" : "langsung",
      months: w.summary.history?.months || 0, syncedAt: w.syncedAt || "" }));
    const meta = partial ? TIER_PARTIAL : tier === 1 && !ready ? TIER1_PENDING : TIER[tier];
    return { tier, partial, ...meta, reasons, months, classified, bankIncome, live: live.length, track, checks, ready, chart, sources, docs: docIdx.length };
  }

  // Jejak per bulan (indeks 0 = 30 hari terakhir). Dinilai per bulan, bukan digabung, karena bank melihat konsistensi:
  // bulan terendah, penurunan tajam, dan seberapa lebar naik turunnya. Hanya bulan yang tercakup penuh 30 hari yang
  // dinilai (bulan paling lama biasanya sebagian). Tidak mengubah tier, hanya dicatat dan ikut di laporan bank.
  function monthlyTrack(H, months, plat, series) {
    // hanya bulan yang dicakup SEMUA akun: akun dengan riwayat lebih pendek (mis. e statement 1 bulan) akan
    // membuat bulan terbaru tampak naik kalau ikut dijumlah
    const full = Math.min(months, ...H.map(h => h.fullMonths ?? h.months));
    const hasFlow = H.every(h => Array.isArray(h.monthlyIn));
    const inc = plat.slice(0, full);
    const out = hasFlow ? series("monthlyOut").slice(0, full) : [];
    const moneyIn = hasFlow ? series("monthlyIn").slice(0, full) : [];
    const net = moneyIn.map((v, i) => v - (out[i] || 0));
    const notes = [];
    const t = { months: full, income: inc, out, net, lowest: null, cv: null, drop: null, minusMonths: 0, notes };
    if (full < 2) return t;
    const mean = inc.reduce((a, b) => a + b, 0) / full;
    t.lowest = Math.min(...inc);
    t.cv = mean > 0 ? Math.sqrt(inc.reduce((a, v) => a + (v - mean) ** 2, 0) / full) / mean : null;
    const before = medianOf(inc.slice(1));
    t.drop = before > 0 ? Math.max(0, 1 - inc[0] / before) : null;
    t.minusMonths = net.filter(v => v < 0).length;
    if (t.drop != null && t.drop >= 0.3) notes.push(`Pencairan 30 hari terakhir ${rp(inc[0])}, turun ${Math.round(t.drop * 100)}% dari biasanya (${rp(Math.round(before))}).`);
    if (full >= 3 && t.cv != null && t.cv > 0.35) notes.push(`Pencairan per bulan naik turun cukup lebar: terendah ${rp(t.lowest)}, tertinggi ${rp(Math.max(...inc))}.`);
    if (t.minusMonths) notes.push(`${t.minusMonths} dari ${full} bulan, uang keluar lebih besar dari uang masuk di akun yang terhubung.`);
    return t;
  }

  const ymOf = (d) => isoOf(d).slice(0, 7);
  const frozenMoney = () => Number(S.resilience.savings) || 0;          // bantalan Step 2 + dana darurat Step 3
  const growthMoney = () => Number(S.resilience.growth) || 0;           // uang tumbuh Step 4
  function investStreak(target) {
    const g = S.growth || {};
    let streak = 0;
    for (let i = 1; i <= 24; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const v = Number(g[ymOf(d)]) || 0;
      if (target > 0 && v >= target) streak++; else break;
    }
    const thisMonth = Number(g[ymOf(new Date())]) || 0;
    return { streak, thisMonth, done: streak >= MILESTONE.STEP4_STREAK_MONTHS };
  }
  const goalsOf = (group) => (S.resilience.goals || []).filter(id => goalGroup(id) === group);
  const goalInfo = (id) => (S.resilience.goalData || {})[id] || {};
  const goalSavedOf = (id) => Number(goalInfo(id).saved) || 0;
  const goalAmountOf = (id) => Number(goalInfo(id).amount) || 0;
  const goalDone = (id) => goalAmountOf(id) > 0 && goalSavedOf(id) >= goalAmountOf(id);
  // ---------- Satu cerita: kenapa langkah ini, dan di mana posisi driver ----------
  // Satu kalimat dari data driver yang menjelaskan kenapa langkah ini yang sedang dikerjakan.
  function stepReason(m) {
    const x = m.x, c = x.c;
    switch (m.id) {
      case "fondasi": return m.criteria.filter(k => !k.met).map(k => k.label).join(", ") ? `Belum lengkap: ${m.criteria.filter(k => !k.met).map(k => k.label.toLowerCase()).join(", ")}. Tahap ini tidak menahan tahap lain.` : "Data Anda sudah lengkap.";
      case "minus": return `Belanja Anda rata-rata ${rp(r1k(c.expMid / 30))} per hari, budget harian Anda ${rp(x.budget)}. Budget = (pendapatan ${rpShort(c.income)} − cicilan jangka panjang ${rpShort(longMonthly())}) ÷ 30.`;
      case "pendek": return x.shortDebts.length ? `Ada ${x.shortDebts.length} utang jangka pendek ${rp(x.shortDebts.reduce((s, d) => s + Number(d.remaining), 0))}. Bunganya mahal dan tagihannya dekat, jadi dilunasi dulu sambil mengisi bantalan ${MINI_DAYS} hari.` : `Dana darurat Anda ${fmtDays(x.days)} bertahan. Bantalan mini ${MINI_DAYS} hari mencegah biaya mendadak ditutup pinjol.`;
      case "darurat": return `Dana darurat Anda ${rp(x.emergency)}, cukup untuk ${fmtDays(x.days)} tanpa narik. Targetnya ${FULL_DAYS} hari.`;
      case "tujuan": return `Tujuan utama Anda: ${m.title.replace(/^Tujuan utama: /, "")}. ${m.cur?.label ? `${m.cur.label}: ${m.cur.value}.` : ""}`;
      case "kredit": return "Anda berencana mengajukan kredit resmi. Tahap ini mengecek apakah data dan rekam jejak Anda sudah siap.";
      default: return m.caption || "";
    }
  }
  // Posisi driver dalam perjalanan 6 bulan: cek bulanan, langkah tangga, skor.
  function journey(ms = buildMilestones()) {
    const steps = ms.filter(m => m.id !== "rapor"), act = steps.find(m => m.status === "active");
    const mc = monthlyChecks(), last = mc.list[mc.list.length - 1] || null;
    return { mc, month: Math.min(mc.done, CHECK_TARGET), act, doneN: steps.filter(m => m.status === "done").length, total: steps.length, score: ms[0].x.h.total, last };
  }

  // Grafik garis pendapatan ojol terbukti per 30 hari, maksimal 6 periode, lama di kiri.
  // Garis hijau = dompet terhubung (dasar median), garis oranye = e statement (bukti dokumen). Garis putus-putus = median.
  function vizIncomeHistory(t) {
    const ch = t.chart, n = t.months;
    if (!ch || n < 2) return `<p class="hint">Grafik pendapatan per bulan muncul setelah riwayat minimal 2 bulan.</p>`;
    const idx = Array.from({ length: n }, (_, k) => n - 1 - k);                     // lama → baru
    const label = (i) => { const d = new Date(Date.now() - i * 30 * 864e5); return `${MONTHS[d.getMonth()].slice(0, 3)}`; };
    const api = idx.map(i => ch.api[i] || 0), doc = idx.map(i => ch.doc[i] ?? null), hasDoc = doc.some(v => v != null);
    const debt = idx.map(i => ch.debt?.[i] || 0), hasDebt = debt.some(v => v > 0);
    const max = Math.max(...api, ...doc.filter(v => v != null), ...debt, ch.median, 1) * 1.15;
    const X = (k) => (n === 1 ? 50 : 4 + (k / (n - 1)) * 92), Y = (v) => 100 - (v / max) * 100;
    // bulan tanpa data (null) tidak digambar: garis putus, bukan turun ke nol
    const path = (vals) => vals.map((v, k) => (v == null ? "" : `${k && vals[k - 1] != null ? "L" : "M"}${X(k).toFixed(2)},${Y(v).toFixed(2)}`)).join(" ");
    const dots = (vals, cls) => vals.map((v, k) => (v != null ? `<span class="ih-dot ${cls}" style="left:${X(k)}%;top:${Y(v)}%"></span>` : "")).join("");
    const series = [{ cls: "api", name: "Pendapatan dompet terhubung", color: "var(--viz-in)", vals: api },
      ...(hasDoc ? [{ cls: "doc", name: "Pendapatan e statement", color: "var(--viz-out)", vals: doc }] : []),
      ...(hasDebt ? [{ cls: "ins", name: "Cicilan terlihat dibayar", color: "var(--viz-debt)", vals: debt }] : [])];
    const tip = (k) => `${label(idx[k])}: pendapatan ${rp(api[k])}${doc[k] != null ? ` · e statement ${rp(doc[k])}` : ""}${hasDebt ? ` · cicilan ${rp(debt[k])}` : ""}`;
    const low = ch.lowest;
    return `<figure class="ih" aria-labelledby="ih-h">
      <figcaption id="ih-h" class="sc-lbl">Pendapatan terbukti dan cicilan per bulan</figcaption>
      <dl class="ih-stats">
        <div><dt>Bulan terendah</dt><dd class="num">${low ? `${rp(low.v)} <small>${label(low.i)}</small>` : "-"}</dd></div>
        <div><dt>Median</dt><dd class="num">${rp(ch.median)}</dd></div>
        ${hasDebt ? `<div><dt>Cicilan tertinggi</dt><dd class="num">${rp(Math.max(...debt))}</dd></div>` : ""}
      </dl>
      <div class="ih-plot" role="img" aria-label="${esc(idx.map((i, k) => tip(k)).join(". "))}. Median ${rp(ch.median)}.">
        <span class="ih-max num">${rpShort(max / 1.15)}</span><span class="ih-zero num">Rp0</span>
        <span class="ih-median" style="top:${Y(ch.median)}%"></span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${series.map(s => `<path d="${path(s.vals)}" fill="none" stroke="${s.color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join("")}
        </svg>
        ${series.map(s => dots(s.vals, s.cls)).join("")}
        ${idx.map((_, k) => `<span class="ih-hit" style="left:${X(k)}%" data-tip="${esc(tip(k))}" tabindex="0"></span>`).join("")}
      </div>
      <div class="ih-x" aria-hidden="true">${idx.map((i, k) => `<span style="left:${X(k)}%">${label(i)}</span>`).join("")}</div>
      <ul class="ih-legend">${series.map(s => `<li><i class="ih-key ${s.cls}"></i>${s.name}</li>`).join("")}<li><i class="ih-key med"></i>Median pendapatan (dasar perkiraan)</li></ul>
      ${vizTable(["Bulan", "Dompet terhubung", ...(hasDoc ? ["E statement"] : []), ...(hasDebt ? ["Cicilan"] : [])], idx.map((i, k) => [label(i), rp(api[k]), ...(hasDoc ? [doc[k] != null ? rp(doc[k]) : "-"] : []), ...(hasDebt ? [rp(debt[k])] : [])]))}
    </figure>`;
  }

  // Ringkasan untuk bank: DATA per bulan dan asal datanya, bukan keputusan. Bank yang menilai pendapatan dan kelayakan.
  function bankSummary(t) {
    const ch = t.chart, n = t.months;
    if (!ch || !n) return "";
    const idx = Array.from({ length: n }, (_, k) => n - 1 - k);
    const label = (i) => { const d = new Date(Date.now() - i * 30 * 864e5); return `${MONTHS[d.getMonth()].slice(0, 3)}`; };
    const rows = idx.map(i => {
      const inc = (ch.api[i] || 0) + (ch.doc[i] || 0), mi = ch.moneyIn[i] || 0, mo = ch.moneyOut[i] || 0;
      return [label(i), rp(inc), rp(ch.debt[i] || 0), rp(mi), rp(mo), rp(mi - mo)];
    });
    const src = t.sources.map(s => `<li><b>${esc(s.label)}</b> · ${s.kind === "dokumen" ? "e statement (bukti dokumen)" : "langsung dari penyedia"} · ${s.months} bulan${s.syncedAt ? ` · diperbarui ${relTime(s.syncedAt)}` : ""}</li>`).join("");
    return `<details class="bank-sum"><summary>Ringkasan yang dikirim ke bank</summary>
      <p class="hint">Ini data, bukan keputusan. Penilaian pendapatan dan kelayakan kredit dilakukan oleh bank.</p>
      <div class="viz-table"><table>
        <thead><tr><th scope="col">Bulan</th><th class="n" scope="col">Pendapatan terbukti</th><th class="n" scope="col">Cicilan</th><th class="n" scope="col">Uang masuk</th><th class="n" scope="col">Uang keluar</th><th class="n" scope="col">Sisa</th></tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map((v, i) => `<td class="${i ? "n" : ""}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <dl class="kv-list">
        <div><dt>Status data</dt><dd>Tier ${t.tier} · ${esc(t.label)}</dd></div>
        <div><dt>Rekam jejak di Laju</dt><dd class="num">${t.checks} dari ${CHECK_TARGET} cek bulanan</dd></div>
        <div><dt>Transaksi dikenali</dt><dd class="num">${t.classified != null ? pct(t.classified) : "-"}</dd></div>
        <div><dt>Pencairan pinjaman dalam riwayat</dt><dd class="num">${rp(t.loanIn)}</dd></div>
      </dl>
      <p class="sc-lbl">Asal data</p><ul class="tr-list">${src}</ul>
      <p class="hint">Uang masuk tidak termasuk pindahan antar akun sendiri, refund, dan pinjaman. Satu bulan = 30 hari terakhir, 30 hari sebelumnya, dan seterusnya.</p>
    </details>`;
  }

  // ---------- konteks bersama untuk semua tangga ----------
  function ladderContext() {
    const c = calc(), h = health(c);
    const openDebts = S.debts.filter(debtOpen);
    const highDebts = openDebts.filter(isHighCost);
    const x = {
      c, h, openDebts, highDebts,
      shortDebts: openDebts.filter(isShort), longDebts: openDebts.filter(d => !isShort(d)),
      net: c.income - c.expense,
      emergency: Number(S.resilience.savings) || 0,
      goalSaved: primaryGoalSaved(),
      monthlySave: effectiveMonthlySave(),
      totalDebt: openDebts.reduce((s, d) => s + Number(d.remaining), 0),
      highTotal: highDebts.reduce((s, d) => s + Number(d.remaining), 0),
      goal: primaryGoal(),
      budget: dailyBudget(c), pokok: h.pokok, days: h.days,
    };
    x.shortTotal = x.shortDebts.reduce((s, d) => s + Number(d.remaining), 0);
    // jumlah utang tertinggi yang pernah tercatat → dasar menghitung "sudah dibayar"
    const bl = S.milestones.baseline;
    bl.high = Math.max(bl.high || bl.bunga || 0, x.highTotal);
    bl.all = Math.max(bl.all || bl.nolutang || 0, x.totalDebt);
    bl.short = Math.max(bl.short || 0, x.shortTotal);
    bl.long = Math.max(bl.long || 0, x.longDebts.reduce((s, d) => s + Number(d.remaining), 0));
    openDebts.forEach(d => { d.peak = Math.max(Number(d.peak) || 0, Number(d.remaining)); });   // garis progres per utang
    x.setor = setoranRange(c);
    x.cushion = cushionShare(x);
    x.payoff = payoffPlan(x);
    x.lane = debtLane(x);
    x.alloc = allocation(x, "");
    return x;
  }

  // ---------- pembagian setoran harian per tahap ----------
  // Tahap 2: belum ada setoran (fokus ke budget). Tahap 3: setoran ke bantalan mini + utang jangka pendek (aturan 20/10/0).
  // Tahap 4: 100% ke dana darurat. Tahap 5: ke tujuan dan ke dana darurat sampai 90 hari, porsinya dari tenggat tujuan.
  const ALLOC_META = {
    emergency: { label: "Dana darurat", color: "var(--viz-in)" },
    cushion: { label: "Bantalan mini", color: "var(--viz-in)" },
    debt: { label: "Utang jangka pendek", color: "var(--viz-debt)" },
    goal: { label: "Tabungan tujuan", color: "var(--viz-out)" },
  };
  function allocation(x, stage) {
    const s = x.setor.value, net = x.net;
    if (stage === "minus" || (!stage && x.c.expMid > x.c.income - longMonthly())) {
      const over = x.c.expMid / 30 - x.budget;
      return { phase: "minus", title: "Belanja di bawah budget dulu", why: `Belanja rata-rata ${rp(r1k(x.c.expMid / 30))} per hari, budget ${rp(x.budget)}. Selisih ${rp(r1k(over))} per hari ditutup dulu sebelum mulai menyetor.`, net, perDay: 0, items: [] };
    }
    let w, phase, title, why;
    if (x.shortDebts.length || x.emergency < MINI_DAYS * x.pokok) {
      phase = "pendek"; title = "Lunasi utang jangka pendek + bantalan mini";
      w = { cushion: x.cushion.share, debt: 1 - x.cushion.share };
      why = !x.shortDebts.length ? "Tidak ada utang jangka pendek, jadi semua setoran ke bantalan mini." : x.cushion.tone === "penuh" ? "Bantalan mini sudah penuh, semua setoran ke utang." : `Tagihan terdekat ${x.cushion.tone}: ${pct(x.cushion.share)} ke bantalan, sisanya ke utang.`;
    } else if (x.emergency < FULL_DAYS * x.pokok) {
      phase = "darurat"; title = `Isi dana darurat sampai ${FULL_DAYS} hari`; w = { emergency: 1 };
      why = "Semua setoran ke dana darurat. Kalau dipakai untuk keadaan darurat, tahap ini tidak gagal.";
    } else {
      const g = stepGoal(x), needDay = g.needPerMonth ? g.needPerMonth / 30 : 0;
      const safe = x.emergency >= SAFE_DAYS * x.pokok;
      const gs = safe || !s ? 1 : clamp(needDay / s, 0.3, 1);
      phase = "tujuan"; title = "Menabung untuk tujuan"; w = { goal: gs, emergency: 1 - gs };
      why = safe ? "Dana darurat sudah 90 hari, semua setoran ke tujuan." : `Porsi tujuan mengikuti tenggatnya. Sisanya menambah dana darurat sampai ${SAFE_DAYS} hari.`;
    }
    const items = Object.entries(w).filter(([, v]) => v > 0.001).map(([key, v]) => ({
      key, share: v, perDay: Math.round((s * v) / 500) * 500, amount: Math.round((s * v * 30) / 1000) * 1000, ...ALLOC_META[key],
    })).sort((a, b) => b.share - a.share);
    return { phase, title, why, net, perDay: s, items };
  }
  const allocAmount = (x, key) => x.alloc.items.find(i => i.key === key)?.amount || 0;

  // ---------- jalur cicilan jangka panjang (berjalan terus, bukan tahap) ----------
  // Cicilan kendaraan, bank, koperasi: bayar tepat waktu, jangan menambah cicilan baru sampai tahap kredit.
  function debtLane(x) {
    const bl = S.milestones.baseline, debts = x.longDebts;
    const left = debts.reduce((s, d) => s + Number(d.remaining), 0), base = bl.long || 0;
    const sim = simulatePayoff(debts, 0);
    return {
      active: base > 0, done: base > 0 && left === 0,
      progress: base > 0 ? Math.round((1 - left / base) * 100) : 100,
      left, paid: Math.max(0, base - left), base, extra: 0, planned: false,
      months: sim.months, series: sim.series, monthly: longMonthly(),
      checkpoints: [{ id: "all", label: "Semua cicilan jangka panjang lunas", met: left === 0, left, base }],
    };
  }

  // ---------- definisi tahap ----------
  const GOAL_STEPS = {
    lunas: { title: "Tujuan utama: bebas semua utang", caption: "Semua utang lunas, termasuk cicilan jangka panjang.", kind: "debtall" },
    darurat: { title: "Tujuan utama: dana darurat 90 hari", caption: "Bantalan penuh untuk pendapatan yang naik-turun.", kind: "emergency90" },
    kendaraan: { title: "Tujuan utama: kendaraan milik sendiri", caption: "Dana untuk uang muka atau pelunasan kendaraan.", kind: "pot" },
    usaha: { title: "Tujuan utama: modal usaha sampingan", caption: "Modal awal supaya pemasukan tidak hanya dari narik.", kind: "pot" },
    pendidikan: { title: "Tujuan utama: biaya pendidikan", caption: "Dana pendidikan yang disiapkan sebelum dibutuhkan.", kind: "pot" },
    anak: { title: "Tujuan utama: biaya pendidikan anak", caption: "Dana sekolah yang disiapkan sebelum dibutuhkan.", kind: "pot" },
    rumah: { title: "Tujuan utama: rumah / renovasi", caption: "Dana untuk rumah atau perbaikan rumah.", kind: "pot" },
    "": { title: "Tujuan utama: tabungan tujuan", caption: "Pilih tujuan utama di Profil › Tujuan supaya tahap ini lebih tepat.", kind: "pot" },
  };

  const fmtMonths = (m) => `${m.toFixed(1).replace(".", ",")} bln`;
  function savingsStep(x, target, label) {
    const s = x.emergency;
    return {
      progress: target > 0 ? Math.round((s / target) * 100) : 100,
      cur: { label: "Dana darurat sekarang", value: `${rp(s)} · ${fmtDays(x.days)}` }, tgt: { label: "Target", value: label },
      gap: s < target ? `Kurang ${rp(target - s)}` : "",
      bar: { kind: "fill", cur: s, tgt: target, curLabel: "Dana darurat", tgtLabel: "Target", fmt: rp },
      criteria: [{ label: `Dana darurat ≥ ${rp(target)}`, met: s >= target, value: rp(s) }],
      short: `${fmtDays(x.days)} dari ${target === FULL_DAYS * x.pokok ? FULL_DAYS : SAFE_DAYS} hari`, pot: "emergency", target,
    };
  }

  function stepDefs(x) {
    const { c } = x;
    const g = GOAL_STEPS[x.goal] || GOAL_STEPS[""];
    const goalAmt = primaryGoalAmount();
    const trust = dataTrust();
    const bankDsr = trust.bankIncome > 0 ? x.c.debtMonthly / trust.bankIncome : (x.c.debtMonthly > 0 ? 9 : 0);
    const wallet = !!S.consent.useWallet, ch = channelStatus(c.agg), gaps = wallet ? payoutGaps() : [];
    const avg = c.expMid / 30, room = c.income - longMonthly();
    const fondasiCrit = [
      { label: "Cara isi data dipilih", met: S.consent.useWallet != null && S.finished, value: wallet ? "e-wallet" : "isian sendiri" },
      wallet ? { label: "Semua dompet yang dipilih terhubung", met: ch.connected.length > 0 && !ch.notConnected.length, value: ch.notConnected.length ? `belum: ${ch.notConnected.map(channelLabel).join(", ")}` : "" }
        : { label: "Pendapatan dan pengeluaran pokok terisi", met: c.income > 0 && x.pokok > 0, value: c.income > 0 ? "" : "pendapatan belum diisi" },
      ...(wallet ? [{ label: "Pencairan setiap aplikasi terlihat", met: !gaps.length, value: gaps.map(k => platformName(k.platform)).join(", ") }] : []),
      { label: "Daftar utang diisi", met: S.debts.length > 0 || !!S.noDebt || !!S.finished, value: S.noDebt && !S.debts.length ? "tidak punya utang" : S.debts.length ? `${S.debts.length} utang` : "" },
    ];
    const metN = fondasiCrit.filter(k => k.met).length;
    const mini = MINI_DAYS * x.pokok, full = FULL_DAYS * x.pokok, pay = x.payoff;
    const debtPart = pay.base > 0 ? 1 - x.shortTotal / pay.base : 1, cushPart = mini > 0 ? Math.min(1, x.emergency / mini) : 1;
    const steps = [
      {
        id: "fondasi", title: "Fondasi data", pillar: "Sumber data", tool: "fondasi", nonBlocking: true,
        caption: "Semua sumber uang terbaca atau terisi, dan daftar utang lengkap.", explain: "syarat terpenuhi ÷ semua syarat. Tahap ini tidak menahan tahap lain.",
        progress: Math.round((metN / fondasiCrit.length) * 100),
        cur: { label: "Status sekarang", value: `${metN} dari ${fondasiCrit.length} syarat` }, tgt: { label: "Target", value: "Semua syarat terpenuhi" },
        gap: fondasiCrit.filter(k => !k.met).map(k => k.label).join(" · "),
        bar: { kind: "fill", cur: metN, tgt: fondasiCrit.length, fmt: (v) => `${Math.round(v)} syarat` },
        criteria: fondasiCrit, short: metN === fondasiCrit.length ? "Data lengkap" : `${metN} dari ${fondasiCrit.length} syarat`,
      },
      {
        id: "minus", title: "Keluar dari minus", pillar: "Arus kas", tool: "budget", sticky: true,
        caption: "Belanja harian tidak melewati budget harian, satu bulan penuh.", explain: "budget harian ÷ belanja rata-rata per hari.",
        progress: avg > 0 ? Math.round((x.budget / avg) * 100) : 100,
        cur: { label: "Belanja rata-rata", value: `${rp(r1k(avg))}/hari` }, tgt: { label: "Budget harian", value: `${rp(x.budget)}/hari` },
        gap: avg > x.budget ? `Kurangi ${rp(r1k(avg - x.budget))} per hari (${rp(r1k((avg - x.budget) * 30))} per bulan)` : "",
        bar: { kind: "fill", cur: Math.max(0, room), tgt: c.expMid, curLabel: "Pendapatan − cicilan jangka panjang", tgtLabel: "Belanja sebulan", fmt: rp },
        criteria: [{ label: "Belanja sebulan tidak melebihi budget", met: c.expMid <= room, value: `${rp(c.expMid)} vs ${rp(Math.max(0, room))}` }],
        short: avg > x.budget ? `Lebih ${rpShort((avg - x.budget) * 30)}/bln` : `Budget ${rpShort(x.budget)}/hari`,
      },
      {
        id: "pendek", title: "Utang jangka pendek + bantalan mini", pillar: "Utang", tool: "shortdebt",
        caption: `Pinjol, paylater, rentenir, dan utang ke orang lunas, dan ada bantalan ${MINI_DAYS} hari bertahan.`, explain: "rata-rata dari utang jangka pendek yang sudah dibayar dan isi bantalan mini.",
        progress: Math.round(((debtPart + cushPart) / 2) * 100),
        cur: { label: "Sisa utang jangka pendek", value: rp(x.shortTotal) }, tgt: { label: "Target", value: `Lunas + bantalan ${rpShort(mini)}` },
        gap: [x.shortDebts.length ? (pay.allDays != null ? `Lunas semua ${countdown(pay.allDays)}` : "Atur setoran supaya utang turun") : "", x.emergency < mini ? `Bantalan kurang ${rp(mini - x.emergency)}` : ""].filter(Boolean).join(" · "),
        bar: pay.base > 0 ? { kind: "paid", paid: Math.max(0, pay.base - x.shortTotal), left: x.shortTotal, fmt: rp } : { kind: "fill", cur: x.emergency, tgt: Math.max(mini, 1), curLabel: "Bantalan", tgtLabel: "3 hari", fmt: rp },
        criteria: [
          { label: "Semua utang jangka pendek lunas", met: !x.shortDebts.length, value: x.shortDebts.length ? `${x.shortDebts.length} tersisa · ${rp(x.shortTotal)}` : "" },
          { label: `Bantalan mini ${MINI_DAYS} hari bertahan (${rp(mini)})`, met: x.emergency >= mini, value: rp(x.emergency) },
        ],
        short: x.shortDebts.length ? `Sisa ${rpShort(x.shortTotal)}` : x.emergency < mini ? `Bantalan ${rpShort(x.emergency)} dari ${rpShort(mini)}` : "Lunas, bantalan penuh",
      },
      {
        id: "darurat", title: `Dana darurat ${FULL_DAYS} hari`, pillar: "Tabungan & ketahanan", tool: "savings",
        caption: "Bisa bertahan sebulan tanpa narik saat sakit, motor rusak, atau order sepi panjang.", explain: `dana darurat ÷ (${FULL_DAYS} × pengeluaran pokok per hari).`,
        ...savingsStep(x, full, `${rp(full)} (${FULL_DAYS} hari)`),
      },
      investStep(x),
      goalStep(x, g, goalAmt),
    ];
    if (S.resilience.wantsBankLoan === true) {
      const kredit = {
        id: "kredit", title: "Siap ajukan kredit resmi", pillar: "Rencana", tool: "credit",
        caption: "Rekam jejak 6 bulan yang bisa dibawa ke bank untuk modal usaha.",
        criteria: [
          // Kredit hanya lewat e-wallet (Tier 1). E statement (Tier 2) dan isian sendiri (Tier 3) untuk panduan.
          { label: "Status data: Tier 1 (e-wallet terhubung)", met: trust.tier === 1, value: `Tier ${trust.tier}`, part: { 1: 1, 2: 0.5, 3: 0.2, 0: 0 }[trust.tier], act: "Hubungkan e-wallet" },
          { label: "Rekam jejak 6 cek bulanan", met: trust.checks >= CHECK_TARGET, value: `${Math.min(trust.checks, CHECK_TARGET)} dari ${CHECK_TARGET}`, part: Math.min(1, trust.checks / CHECK_TARGET), act: "Cek bulanan tiap 30 hari" },
          { label: "Tidak ada utang jangka pendek", met: !x.shortDebts.length, value: x.shortDebts.length ? `${x.shortDebts.length} tersisa` : "", part: debtPart, act: "Lunasi utang jangka pendek" },
          // Untuk kredit, porsi cicilan dihitung dari pendapatan yang TERBUKTI (angka bank), bukan isian manual.
          { label: "Cicilan ≤ 30% pendapatan terbukti", met: bankDsr <= 0.3, value: pctCap(bankDsr), part: bankDsr <= 0.3 ? 1 : Math.max(0, 1 - (bankDsr - 0.3) / 0.3), act: "Turunkan cicilan ke ≤30% pendapatan terbukti" },
        ],
        cur: { label: "Sekarang", value: `Tier ${trust.tier} · ${Math.min(trust.checks, CHECK_TARGET)}/${CHECK_TARGET} cek` }, tgt: { label: "Target", value: "Tier 1 · 6 cek bulanan" },
        bar: { kind: "fill", cur: Math.min(trust.checks, CHECK_TARGET), tgt: CHECK_TARGET, curLabel: "Cek bulanan", tgtLabel: "6 cek", fmt: (v) => String(Math.round(v)) },
        short: `Tier ${trust.tier} · ${Math.min(trust.checks, CHECK_TARGET)}/${CHECK_TARGET} cek`,
      };
      kredit.explain = "rata-rata dari empat syarat di bawah.";
      kredit.progress = Math.round((kredit.criteria.reduce((s, k) => s + clamp(k.part, 0, 1), 0) / kredit.criteria.length) * 100);
      kredit.gap = kredit.criteria.filter(k => !k.met).map(k => k.act).slice(0, 2).join(" · ");
      steps.push(kredit);
    }
    return steps;
  }

  // Tahap investasi (dari main): uang tumbuh disetor minimal 10% pendapatan, 3 bulan berturut-turut.
  function investStep(x) {
    const target = Math.round(MILESTONE.STEP4_INVEST_RATIO * x.c.income / 1000) * 1000, inv = investStreak(target), N = MILESTONE.STEP4_STREAK_MONTHS;
    const net = x.c.income - x.c.expense;
    return {
      id: "investasi", title: `Investasi ${pct(MILESTONE.STEP4_INVEST_RATIO)} selama ${N} bulan`, pillar: "Rencana", tool: "growth",
      caption: "Uang tumbuh disetor rutin, bukan diambil untuk belanja.", explain: `bulan beruntun ÷ ${N}.`,
      progress: Math.round((Math.min(inv.streak, N) / N) * 100),
      cur: { label: "Beruntun", value: `${inv.streak} bulan` }, tgt: { label: "Target", value: `${N} bulan · ${rp(target)}/bln` },
      gap: inv.done ? "" : `Setor ${rp(target)} per bulan, ${N - inv.streak} bulan lagi`,
      bar: { kind: "fill", cur: inv.streak, tgt: N, curLabel: "Beruntun", tgtLabel: "Target", fmt: (v) => `${Math.round(v)} bln` },
      criteria: [{ label: `Setoran ≥ ${rp(target)} selama ${N} bulan beruntun`, met: inv.done && !S.milestones.growthSpent, value: `${inv.streak} bulan` }],
      warn: net < target ? `Sisa uang Anda ${rp(net)} per bulan, masih di bawah ${rp(target)}. Naikkan sisa uang dulu sebelum tahap ini.` : "",
      thisMonth: inv.thisMonth, target, short: `${inv.streak} dari ${N} bulan`,
    };
  }

  // Tenggat dan kebutuhan per bulan tabungan tujuan (dipakai tahap 5 dan pembagian setoran).
  function stepGoal(x) {
    const goalAmt = primaryGoalAmount(), s = x.goalSaved, months = Number(S.resilience.horizon) || 12;
    const start = S.finishedAt ? new Date(S.finishedAt) : new Date();
    const deadline = primaryGoalDeadline() ? parseIso(primaryGoalDeadline()) : new Date(start);
    if (!primaryGoalDeadline()) deadline.setMonth(deadline.getMonth() + months);
    const monthsLeft = Math.max(1, Math.round((deadline - Date.now()) / (30 * 864e5)));
    return { goalAmt, deadline, needPerMonth: goalAmt > s ? Math.ceil((goalAmt - s) / monthsLeft / 1000) * 1000 : 0 };
  }
  function goalStep(x, g, goalAmt) {
    const base = { id: "tujuan", title: g.title, caption: g.caption, pillar: "Rencana", goalKind: g.kind };
    if (g.kind === "debtall") {
      const left = x.totalDebt, bl = S.milestones.baseline.all || 0;
      return { ...base, tool: "debtgoal", explain: "utang yang sudah dibayar ÷ jumlah tertinggi yang pernah tercatat.",
        progress: bl > 0 ? Math.round((1 - left / bl) * 100) : 100,
        cur: { label: "Sisa semua utang", value: rp(left) }, tgt: { label: "Target", value: "Rp0 (lunas)" },
        gap: left > 0 ? `Lunasi ${rp(left)}` : "",
        bar: { kind: "paid", paid: Math.max(0, bl - left), left, fmt: rp },
        criteria: [{ label: "Semua utang lunas", met: left === 0, value: x.openDebts.length ? `${x.openDebts.length} tersisa` : "" }],
        short: left ? `Sisa ${rpShort(left)}` : "Lunas" };
    }
    if (g.kind === "emergency90") return { ...base, tool: "savings", explain: `dana darurat ÷ (${SAFE_DAYS} × pengeluaran pokok per hari).`, ...savingsStep(x, SAFE_DAYS * x.pokok, `${rp(SAFE_DAYS * x.pokok)} (${SAFE_DAYS} hari)`) };
    // tabungan tujuan (pot terpisah dari dana darurat)
    const s = x.goalSaved, { deadline, needPerMonth } = stepGoal(x);
    return { ...base, tool: "goal", explain: "tabungan tujuan ÷ target tujuan.", target: goalAmt, pot: "goal", deadline, needPerMonth,
      progress: goalAmt > 0 ? Math.round((s / goalAmt) * 100) : 0,
      cur: { label: "Tabungan tujuan", value: rp(s) }, tgt: { label: "Target", value: goalAmt ? `${rp(goalAmt)} · ${deadline.toLocaleDateString("id-ID", { month: "short", year: "numeric" })}` : "Belum ditentukan" },
      gap: !goalAmt ? "Tentukan nominal tujuan dulu" : s < goalAmt ? `Kurang ${rp(goalAmt - s)} · ±${rp(needPerMonth)}/bln` : "",
      bar: { kind: "fill", cur: s, tgt: Math.max(goalAmt, 1), curLabel: "Terkumpul", tgtLabel: "Target", fmt: rp },
      criteria: [{ label: goalAmt ? `Tabungan tujuan ≥ ${rp(goalAmt)}` : "Nominal tujuan ditentukan", met: goalAmt > 0 && s >= goalAmt, value: rp(s) }],
      short: goalAmt ? `${rpShort(s)} dari ${rpShort(goalAmt)}` : "Nominal belum diisi" };
  }

  // Semua tahap + status. Satu tahap fokus ("active"); tahap sesudahnya terkunci ("next").
  // Tahap yang syaratnya sudah terpenuhi langsung selesai walau belum gilirannya.
  // Fondasi tidak menahan tahap lain ("open"). Keluar dari minus yang sudah selesai tidak dibatalkan kalau bulan berikutnya minus lagi.
  function buildMilestones() {
    const x = ladderContext();
    const today = isoOf(new Date());
    let activeFound = false;
    const steps = stepDefs(x).map((m, i) => {
      const allMet = m.criteria.filter(k => !k.optional).every(k => k.met);
      const kept = m.sticky && S.finished && !!S.milestones.doneAt[m.id] && !allMet;
      m.progress = allMet || kept ? 100 : Math.min(99, Math.max(0, Math.round(m.progress)));   // 100% hanya bila semua syarat terpenuhi
      m.relapse = kept;
      const done = m.progress >= 100;
      const status = done ? "done" : m.nonBlocking ? "open" : !activeFound ? (activeFound = true, "active") : "next";
      if (done && S.finished && !S.milestones.doneAt[m.id]) S.milestones.doneAt[m.id] = today;
      if (!done && S.milestones.doneAt[m.id]) delete S.milestones.doneAt[m.id];
      return { ...m, x, index: i, number: i + 1, status };
    });
    const act = steps.find(s => s.status === "active");
    x.alloc = allocation(x, act?.id === "minus" ? "minus" : "");
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
      totalDebt: x.totalDebt, highDebt: x.highTotal, shortDebt: x.shortTotal, dsr: Math.round(x.h.dsr * 100) / 100,
      days: Math.round(x.days * 10) / 10, budget: Math.round(x.budget), payments: paymentRecord().n, onTime: paymentRecord().onTime,
    };
  }

  // ---------- cek bulanan ----------
  // Tiap 30 hari sejak onboarding selesai, driver melakukan satu cek: perbarui data, jawab dua pertanyaan, simpan.
  // Tiap cek menyimpan potret (skor, sisa uang, dana darurat, utang, posisi tangga). 6 cek = rekam jejak 6 bulan.
  // Cek tidak mengubah aturan tangga. Tangga bergerak karena datanya diperbarui (sinkron e-wallet, e statement baru).
  const CHECK_DAYS = 30, CHECK_GRACE = 7, CHECK_TOTAL = 6, CHECK_TARGET = CHECK_TOTAL;
  function monthlyChecks() {
    const m = (S.monthly ||= { checks: [] });
    const list = m.checks || (m.checks = []), done = list.length;
    const anchor = S.finishedAt || (S.startSnap?.d ? `${S.startSnap.d}T00:00:00` : "");
    if (!S.finished || !anchor) return { done, due: 0, pending: false, n: done + 1, nextAt: null, late: false, list };
    const start = new Date(anchor).getTime();
    const due = Math.min(CHECK_TOTAL, Math.floor((Date.now() - start) / (CHECK_DAYS * 864e5)));
    const nextAt = new Date(start + (done + 1) * CHECK_DAYS * 864e5);
    return { done, due, pending: due > done, n: done + 1, nextAt, late: Date.now() - nextAt.getTime() > CHECK_GRACE * 864e5, list, total: CHECK_TOTAL };
  }
  const dataSource = () => S.wallets.some(w => w.summary && w.source !== "statement" && !w.stale) ? "e-wallet"
    : S.wallets.some(w => w.summary && w.source === "statement") ? "e statement" : "isian sendiri";
  function recordCheck(answers) {
    const st = monthlyChecks();
    if (!st.pending) return null;
    const steps = buildMilestones().filter(m => m.id !== "rapor");
    const act = steps.find(m => m.status === "active" || m.status === "aktif" || m.status === "dibuka_lagi");
    const entry = {
      n: st.n, at: new Date().toISOString(), dueAt: st.nextAt.toISOString(), late: st.late, source: dataSource(), answers,
      snap: snapshotMetrics(), tier: dataTrust().tier, budgetMode: budgetMode(), dailyVerify: verifyDaily(calc()),
      steps: { done: steps.filter(m => m.status === "done" || m.status === "selesai").length, total: steps.length, active: act?.id || "", activeNumber: act?.number ?? null, activeTitle: act?.title || "", progress: act?.progress ?? 100 },
    };
    S.monthly.checks.push(entry);
    return entry;
  }

  // Pergerakan per bulan dari riwayat akun terhubung (indeks 0 = 30 hari terakhir), lama di kiri.
  // Pendapatan = pencairan aplikasi. Perubahan dihitung terhadap bulan sebelumnya.
  function monthlyMovement() {
    const t = dataTrust().track;
    if (!t || t.months < 2) return null;
    const n = t.months, label = (i) => { const d = new Date(Date.now() - (i * 30 + 15) * 864e5); return `${MONTHS[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`; };
    const rows = Array.from({ length: n }, (_, k) => n - 1 - k).map(i => ({ label: label(i), income: t.income[i] || 0, out: t.out[i] ?? null, net: t.net[i] ?? null }));
    rows.forEach((r, k) => {
      const prev = rows[k - 1];
      r.incomeChange = prev && prev.income > 0 ? (r.income - prev.income) / prev.income : null;
      r.netChange = prev && prev.net != null && r.net != null ? r.net - prev.net : null;
    });
    return rows;
  }

  // =====================================================================
  // Konteks untuk analisis AI (Claude API), lihat docs/ai-data-contract.md
  // Prinsip: hanya data yang dibutuhkan untuk membimbing keuangan, TANPA data
  // identitas (nama, nomor HP, password, area narik detail).
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
        hasBankAccount: hasBankEvidence(), protection: { otherInsurance: p.hasInsurance },
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
        dataTrust: (() => { const t = dataTrust(); return { tier: t.tier, label: t.label, historyMonths: t.months, classifiedShare: t.classified, bankRecognisedIncomeMonthly: t.bankIncome, reasons: t.reasons.map(r => r.t),
          // per 30 hari, indeks 0 = 30 hari terakhir. Hanya bulan yang tercakup penuh.
          monthly: t.track ? { incomePlatform: t.track.income, moneyOut: t.track.out, net: t.track.net, lowestIncome: t.track.lowest, incomeVariation: t.track.cv == null ? null : Math.round(t.track.cv * 100) / 100, latestDropVsUsual: t.track.drop == null ? null : Math.round(t.track.drop * 100) / 100, monthsOutflowAboveInflow: t.track.minusMonths } : null }; })(),
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
      goals: {
        wajib: goalsOf("wajib").map(id => ({ id, label: goalLabel(id), amount: goalAmountOf(id), saved: goalSavedOf(id), deadline: goalInfo(id).deadline || null })),
        tumbuh: goalsOf("tumbuh").map(id => ({ id, label: goalLabel(id), amount: goalAmountOf(id), saved: goalSavedOf(id), deadline: goalInfo(id).deadline || null })),
        horizonMonths: r.horizon, wantsFormalCredit: r.wantsBankLoan,
      },
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
      excludedForPrivacy: ["nama lengkap", "nomor HP", "password", "area narik detail", "token e-wallet"],
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
