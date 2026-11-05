/* Laju: tombol reset ([data-reload]) di header semua halaman.
   Menghapus SEMUA data dan mulai lagi dari 0: akun, isian, catatan, rencana, dan e-wallet yang terhubung
   (diputus juga di server). Pilihan bahasa tetap disimpan. File halaman diambil ulang tanpa cache,
   lalu pengguna kembali ke halaman depan. Selalu minta konfirmasi dulu. */
(() => {
  "use strict";
  const KEEP = ["laju-lang"];

  // Dialog konfirmasi sendiri: confirm() bawaan browser bisa diblokir di browser dalam aplikasi.
  function ask() {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "sheet";
      dlg.innerHTML = `<div class="sheet-body">
        <h2>Reset semua dari awal?</h2>
        <p class="hint" style="font-size:.9rem">Semua data di perangkat ini dihapus: akun, isian, catatan, dan rencana. E-wallet yang terhubung diputus. Ini tidak bisa dibatalkan.</p>
        <div class="sheet-actions"><button type="button" class="btn secondary sm" data-r="0">Batal</button><button type="button" class="btn sm danger" data-r="1">Ya, reset semua</button></div>
      </div>`;
      document.body.appendChild(dlg);
      const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
      dlg.addEventListener("click", (e) => { if (e.target === dlg) return done(false); const b = e.target.closest("[data-r]"); if (b) done(b.dataset.r === "1"); });
      dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(false); });
      dlg.showModal();
      dlg.querySelector('[data-r="0"]').focus();
    });
  }

  // Semua e-wallet dan e statement di server dihapus sekaligus. Server lama tanpa endpoint itu: hapus satu per satu.
  async function dropServerWallets() {
    const h = { "X-Requested-With": "laju" };
    try {
      const all = await fetch("/api/wallets", { method: "DELETE", credentials: "same-origin", headers: h });
      if (all.ok) return;
      const res = await fetch("/api/wallets", { credentials: "same-origin", headers: h });
      if (!res.ok) return;
      const { wallets = [] } = await res.json();
      const url = (id) => (id.startsWith("c:") ? `/api/statements?name=${encodeURIComponent(id.slice(2))}` : `/api/wallets/${id}`);
      await Promise.all(wallets.map(w => fetch(url(w.walletId), { method: "DELETE", credentials: "same-origin", headers: h }).catch(() => {})));
    } catch (e) { /* server mati: data di perangkat tetap dihapus */ }
  }

  async function refetchFiles() {
    const same = (u) => u && u.startsWith(location.origin) && !/\/(api|__health)\b/.test(u);
    const urls = [
      location.href.split("#")[0],
      ...[...document.scripts].map(s => s.src),
      ...[...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href),
      ...performance.getEntriesByType("resource").map(r => r.name),
    ].filter(same);
    await Promise.all([...new Set(urls)].map(u => fetch(u, { cache: "reload" }).catch(() => {})));
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-reload]");
    if (!b || !(await ask())) return;
    b.disabled = true;
    b.classList.add("spin");
    await dropServerWallets();
    try {
      Object.keys(localStorage).filter(k => !KEEP.includes(k)).forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (err) { /* abaikan */ }
    await refetchFiles();
    location.href = "index.html";
  });
})();
