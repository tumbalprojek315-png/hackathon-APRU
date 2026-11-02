/* Laju: halaman Masuk. Butuh core.js dimuat lebih dulu.
   Prototipe: satu akun per perangkat. Nomor HP dan password dicocokkan dengan hash yang disimpan saat daftar. */
(() => {
  "use strict";

  // Sudah masuk: langsung ke aplikasi
  if (S.finished && S.account.pass && isLoggedIn()) { location.replace("app.html#dashboard"); return; }

  const form = $("#loginForm"), err = $("#loginErr"), note = $("#noAccount");
  if (!S.account.pass) {
    note.hidden = false;
    note.innerHTML = S.account.fullName && !S.finished
      ? `<span>Pendaftaran di perangkat ini belum selesai. <a href="onboarding.html">Lanjutkan pendaftaran</a></span>`
      : `<span>Belum ada akun di perangkat ini. <a href="onboarding.html">Daftar dulu</a></span>`;
  }

  const fail = (msg) => { err.textContent = msg; err.hidden = false; };
  $("#lgShow").addEventListener("click", (e) => {
    const pw = $("#lgPass"), show = pw.type === "password";
    pw.type = show ? "text" : "password";
    e.currentTarget.setAttribute("aria-label", `${show ? "Sembunyikan" : "Tampilkan"} password`);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const phone = $("#lgPhone").value, pw = $("#lgPass").value;
    if (!phoneDigits(phone) || !pw) return fail("Isi nomor HP dan password.");
    if (!S.account.pass) return fail("Belum ada akun di perangkat ini. Daftar dulu.");
    $("#loginBtn").disabled = true;
    const { hash } = await hashPass(pw, S.account.pass.salt);
    $("#loginBtn").disabled = false;
    if (phoneDigits(phone) !== phoneDigits(S.account.phone) || hash !== S.account.pass.hash) return fail("Nomor HP atau password salah.");
    setLoggedIn(true);
    location.href = "app.html#dashboard";
  });
})();
