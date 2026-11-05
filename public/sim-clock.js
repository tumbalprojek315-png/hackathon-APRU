/* Laju: jam simulasi untuk demo ("Majukan 30 hari").
   Dimuat sebelum core.js. Kalau jam sudah dimajukan, Date di halaman ini ikut maju sejumlah hari itu, jadi semua
   hitungan (tanggal hari ini, cek bulanan, tangga, rapor) berjalan seolah waktu sudah lewat. Server menerima jumlah
   harinya lewat header X-Laju-Hari (lihat api() di core.js) dan membuat transaksi simulasi sampai tanggal itu.
   Hanya untuk mode simulasi. Tombol reset di header menghapusnya bersama data lain. */
(() => {
  "use strict";
  const KEY = "laju-sim-hari";
  let days = 0;
  try { days = Math.max(0, Math.min(400, Number(localStorage.getItem(KEY)) || 0)); } catch (e) { /* storage tidak tersedia */ }
  const RealDate = Date, off = days * 864e5;
  if (off) {
    class SimDate extends RealDate {
      constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off); }
      static now() { return RealDate.now() + off; }
    }
    window.Date = SimDate;
  }
  window.LajuSim = {
    days,
    advance(n = 30) {
      try { localStorage.setItem(KEY, String(Math.min(400, days + n))); } catch (e) { /* abaikan */ }
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
    },
  };
})();
