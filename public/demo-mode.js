/* Laju: mode contoh, dipakai saat halaman dibuka tanpa server.py (misalnya dari GitHub Pages).

   GitHub Pages hanya menyajikan berkas, tidak bisa menjalankan Python, jadi /api/... tidak ada.
   Berkas ini melayani permintaan itu dari demo-data.json + localStorage, sehingga penghubungan
   e-wallet tetap bisa didemokan lewat tautan.

   Datanya persis keluaran MockProvider saat server berjalan (lihat tools/buat-data-contoh.py),
   jadi tidak ada yang hilang: transaksi di mode server pun memang simulasi.
   Yang tidak bisa ditiru di sini cuma membaca PDF asli, karena itu butuh Python. */
(() => {
  "use strict";

  const KEY = "laju-demo-linked";     // { walletId: isoWaktuHubung }
  const SKEY = "laju-demo-statement"; // nama dokumen contoh yang sedang dipakai
  let data = null;

  const store = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } };
  const linked = () => store(KEY) || {};
  const now = () => new Date().toISOString();
  const fail = (code, message, status = 400) => { throw Object.assign(new Error(message), { code, status }); };

  async function ready() {
    if (!data) {
      const res = await fetch("demo-data.json", { cache: "force-cache" });
      if (!res.ok) fail("no_demo", "Data contoh tidak ditemukan.");
      data = await res.json();
    }
    return data;
  }

  const view = (rec, at) => ({ ...rec, linkedAt: at, syncedAt: at });

  function walletList() {
    const L = linked(), out = [];
    for (const [id, at] of Object.entries(L)) if (data.wallets[id]) out.push(view(data.wallets[id], at));
    const sname = store(SKEY);
    if (sname) out.push({ ...data.statement, linkedAt: sname.at, syncedAt: sname.at });
    return out;
  }

  // Jeda kecil supaya langkah sinkron tetap terasa seperti memanggil penyedia sungguhan.
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  async function handle(path, { method = "GET", body } = {}) {
    await ready();
    const url = new URL(path, location.href);
    const p = url.pathname.replace(/.*\/api\//, "/api/");

    if (method === "GET" && p === "/api/config") {
      return { mode: "contoh", provider: "Contoh (tanpa server)", demo: true, periodDays: data.periodDays,
        supportedWallets: Object.keys(data.wallets), categoryLabels: data.categoryLabels, platformLabels: data.platformLabels };
    }
    if (method === "GET" && p === "/api/wallets") return { wallets: walletList() };

    if (method === "POST" && p === "/api/wallets/link") {
      const id = String(body?.walletId || "");
      if (!data.wallets[id]) fail("unsupported_wallet", "E-wallet ini belum didukung di mode contoh.");
      const phone = String(body?.phone || "").replace(/\D/g, "");
      return { redirectUrl: `simulasi-penyedia.html?demo=1&wallet=${encodeURIComponent(id)}${phone ? `&phone=${phone}` : ""}` };
    }

    let m = p.match(/^\/api\/wallets\/([a-z]+)\/sync$/);
    if (method === "POST" && m) {
      const id = m[1], L = linked();
      if (!L[id]) fail("not_linked", "E-wallet ini belum terhubung. Hubungkan lagi.", 404);
      await wait(400);
      L[id] = now(); put(KEY, L);
      return view(data.wallets[id], L[id]);
    }

    m = p.match(/^\/api\/wallets\/([a-z]+)$/);
    if (method === "DELETE" && m) { const L = linked(); delete L[m[1]]; put(KEY, L); return { ok: true }; }

    if (method === "POST" && p === "/api/statements/sample") {
      await wait(400);
      const at = now(); put(SKEY, { at });
      return { ...data.statement, linkedAt: at, syncedAt: at };
    }
    if (method === "POST" && p === "/api/statements/upload") {
      fail("need_server", "Membaca PDF asli butuh server Laju. Di mode contoh, pakai tombol Pakai contoh.");
    }
    if (method === "DELETE" && p === "/api/statements") { put(SKEY, null); return { ok: true }; }

    fail("not_found", "Alamat ini tidak ada di mode contoh.", 404);
  }

  // Dipanggil tombol reset: data contoh ikut dibersihkan.
  const clear = () => { put(KEY, null); put(SKEY, null); };

  window.LajuDemo = { handle, clear, ready };
})();
