# Konteks Laju untuk chat baru

Dokumen ini dibuat 5 November 2026 supaya chat baru bisa langsung melanjutkan pekerjaan.
Baca dari atas ke bawah sebelum mengerjakan apa pun.

---

## 1. Proyek

- Nama kerja: **Laju**, aplikasi kesehatan finansial untuk driver ojol Indonesia.
- Folder: `C:\Users\User\Documents\Dickson Diamond Tajudin\Claude\Claude Code\Laju`
- Stack: HTML, CSS, dan JavaScript vanilla di `public/`. Server Python bawaan tanpa framework (`server.py`, folder `openfinance/`).
- Repo GitHub: `tumbalprojek315-png/hackathon-APRU` (remote `origin`). Catatan sebelumnya menyebut repo ini private, jadi perlu dibuat public agar GitHub Pages bisa dipakai.
- Branch: `main`, `dickson` (kerja aktif Dickson), `grace` (milik rekan, jangan disentuh).
- Link deploy: https://tumbalprojek315-png.github.io/hackathon-APRU/public/ (GitHub Pages, dari branch main folder root).
- Bahasa: user menulis Indonesia kasual. Balas dalam Indonesia.

---

## 2. Preferensi kerja (wajib diikuti)

- Layout portrait di semua layar: satu kolom, lebar HP, tanpa tata letak multi-kolom desktop.
- Teks aplikasi dan balasan ke user: Indonesia, tanpa em dash, tanpa titik koma. Versi Inggris lewat `i18n-en.js`.
- User menjalankan server sendiri di port 5174. Tes saya di port 5175. Jangan pernah mematikan proses user.
- Commit dan push hanya saat diminta. Memanggil `/update-github` dianggap izin commit dan push.
- Jangan force push. Jangan push ke branch `grace`. Jangan commit file rahasia (`.env`, kunci, password).
- Kunci API hanya di server, tidak pernah di `public/`.
- Data yang dikirim ke AI tidak boleh berisi data pribadi: nama, nomor HP, password, token e-wallet.
- File workflow GitHub Actions: user tegas tidak mau file itu masuk branch mana pun. Hapus dari proyek kalau muncul.
- Push ke `main`: user pernah menulis "jangan push ke main" saat meminta file PDF dari grace. Skill `/update-github` memang mendorong ke main di langkah 6. Konfirmasi dulu sebelum push ke main.
- Desain alur: user minta wireframe berisi screenshot halaman asli dengan panah antar halaman, bukan diagram abstrak.
- Ambisi perubahan: setiap perubahan UI dicek di lebar 375 px, tanpa scroll horizontal, dan mode EN juga dicek.

---

## 3. Keadaan repo sekarang

Hasil `git` per 5 November 2026:

- Branch aktif: `dickson`, sejajar dengan `origin/dickson` di commit `1abf073`.
- Commit terbaru di dickson:
  - `1abf073` tanda server mati hanya kalau server tidak menjawab
  - `374543d` perbaiki tombol unggah PDF hilang setelah server dijalankan ulang
  - `5890397` dickson: pindahan antar akun pakai pasangan dan nomor HP, nomor HP tiap e-wallet di Izin data, reset hapus e statement
  - `624636b` Update project from dickson (juga ada di main)
  - `0a693cd` Pengeluaran diketik, rincian skor terbuka di Tangga
- `origin/main` ada di `624636b`, jadi main tertinggal 3 commit dari dickson.
- Tiga commit terbaru (`5890397`, `374543d`, `1abf073`) dibuat dengan nama "DummyBasket", bukan nama Dickson atau tumbalprojek. Konfirmasi dulu apakah itu akun user.
- Satu berkas belum di-commit: `docs/panduan-ai-claude.md` (panduan integrasi Claude API) dan dokumen ini.
- Catatan lama di ringkasan sesi menyebut belum ada commit sejak `0a693cd`. Itu sudah tidak benar. Jangan pakai klaim itu.

---

## 4. Yang sudah jadi

Urutan dari yang terbaru:

- **E-wallet**: tombol Ubah langsung ke Profil bagian Uang & rekening. Kartu channel yang tidak bisa dihubungkan digabung jadi satu kartu. Kalender 30 hari: hover menampilkan net income, tap menampilkan rincian hari itu (penghasilan, pengeluaran, sisa bersih = penghasilan - pengeluaran).
- **Izin data**: pilihan ya atau tidak untuk e-wallet. Isian manual selalu wajib. Dua jalur saling eksklusif: e-wallet ATAU manual, tidak keduanya. Jalur manual punya langkah Dokumen (upload PDF, bisa dilewati).
- **Penghasilan**: kartu "sebulan terakhir" dengan rata-rata harian.
- **Pengeluaran**: dua kotak ketik per kategori (paling sedikit dan paling banyak). Slider sudah dibuang.
- **Tangga**: rincian skor selalu terlihat. Setiap komponen pilar yang belum penuh bisa diketuk dan membawa ke tempat memperbaikinya.
- **Cakupan (coverage)**: membandingkan isian manual dengan data e-wallet. Jika isian lebih kecil dari e-wallet, atau data e-wallet tidak ada, diberi tanda.
- **Profil**: opsi "punya rekening bank aktif" dan channel Tunai/Rekening bank sudah dihapus. Setiap e-wallet yang tidak terintegrasi punya kartu upload e-statement (hanya bagian upload dari grace, lewat `openfinance/statement.py`).
- **E-wallet strict**: semua e-wallet yang diklaim di Profil harus terhubung. Tunai sudah dibuang dari tab ini. Tombol "lanjut tanpa e-wallet" sudah dihapus.
- **Milestone v1** (spec `laju-milestone-spec.md`, langkah 0 sampai 5): 6 langkah (`data`, `minus`, `bantalan`, `darurat`, `investasi`, `tumbuh`) dan 6 status (`terkunci`, `aktif`, `selesai`, `isi_ulang`, `dijeda`, `dibuka_lagi`). Bunga efektif dihitung dengan bisection, utang dianggap bunga tinggi di atas 18 persen. Uji `uji-spec.js` 4/4 dan `uji-status.js` 10/10 lulus. `verify_invariants.js` PASS.
- **Mode contoh (demo mode)** untuk GitHub Pages: `public/demo-mode.js` dan `public/demo-data.json`. Saat tidak ada server, `api()` beralih otomatis ke mode ini. Contoh PDF: `public/contoh-estatement-jojo.pdf`.
- **Simulasi penyedia**: `public/simulasi-penyedia.html`, OTP simulasi selalu 123456.
- **Skor demo**: 22 / 52 / 90 (sebelumnya 25 / 50 / 93, berubah karena redistribusi poin BPJS, sudah dijelaskan ke user).
- **Panduan integrasi Claude**: `docs/panduan-ai-claude.md`. Belum diterapkan ke kode.

---

## 5. Yang belum selesai

1. **Integrasi Claude API** (permintaan terakhir user). Panduan sudah ada. User belum punya credit API. Yang ditawarkan: pasang Langkah 1 sampai 3 dan Langkah 6 sekarang tanpa kunci (endpoint, modul `ai_analisis.py`, tombol, jawaban contoh berlabel). User belum menjawab apakah mau diterapkan.
   - Tombol: kartu "Data untuk analisis AI" di halaman Rapor, `public/app-page.js`.
   - Endpoint baru: `POST /api/analisis` di `server.py`.
   - Kunci: variabel lingkungan `ANTHROPIC_API_KEY`, hanya di server.
   - Default: `claude-opus-5-5`, effort `medium`. Untuk demo murah: `LAJU_AI_MODEL=claude-haiku-5-5` dan `LAJU_AI_EFFORT=low`.
   - Centang "Izinkan analisis AI" di Izin data belum ada. Wajib sebelum fitur ini dipakai sungguhan.
2. **Dari spec milestone**: pemindahan dana saat ganti tujuan belum ada (`GOAL_SWITCH_MIN_DAYS` belum dipakai). Proyeksi deadline tujuan tumbuh baru berupa peringatan saat lewat tenggat.
3. **Deploy GitHub Pages**: perlu repo public dan Pages dari branch main folder root. Link harus tetap sama saat ada update. Pages hanya statis, jadi fitur yang butuh server akan jatuh ke mode contoh di link itu.
4. **Push ke main**: konfirmasi dulu sebelum `/update-github` mendorong ke main (lihat bagian 2).

---

## 6. Peta file penting

- `public/core.js`: state `S`, `GOALS`, konstanta `MILESTONE`, `CHANNELS`, `api()`, `buildAIContext()`, `autofillFromVerified()`, `evaluateStatus()`, `migrate()`. Bukan IIFE, skrip global.
- `public/onboarding.js`: langkah Izin data, Dokumen, e-wallet, kartu offline per wallet, `breakdown()` (kalender), `coverCard()`. IIFE.
- `public/app-page.js`: Fondasi, Cashflow, Buffer, Growth, Goals, Rapor, Catat, `SCORE_FIX`. IIFE. Rapor berisi kartu "Data untuk analisis AI".
- `public/i18n.js` dan `public/i18n-en.js`: terjemahan. Kamus `window.LAJU_EN`, aturan `window.LAJU_EN_RULES`.
- `public/demo-mode.js`, `public/demo-data.json`, `tools/buat-data-contoh.py`.
- `server.py`: rute `GET /api/config`, `GET /api/wallets`, `GET /api/wallets/callback`, `POST /api/wallets/link`, `POST /api/wallets/{id}/sync`, `POST /api/statements/upload` dan `/sample`, `DELETE /api/statements?name=`, `DELETE /api/wallets/{id}`. Penjaga CSRF: header `X-Requested-With: laju`.
- `openfinance/`: `statement.py` (dari grace), `mock.py`, `categorize.py`, `base.py`, `live.py` (belum diisi).
- `docs/metodologi.md`, `docs/ai-data-contract.md`, `docs/log-perbaikan-2026-10-29.md` (bagian H sampai R), `docs/panduan-ai-claude.md`, dokumen ini.
- Uji: `verify_invariants.js`, `uji-spec.js`, `uji-status.js`. Cek lokasinya dulu sebelum dijalankan.

---

## 7. Catatan teknis dan jebakan

- **i18n** menerjemahkan per text node. `<strong>` di tengah kalimat memutus pencarian kamus. Jangan pakai di teks yang perlu diterjemahkan.
- Kalimat dipecah di `". "`, daftar di `" · "`. Angka, tanggal, dan uang diganti `{0}`. Kunci tanggal yang benar: `"{0}/{1}/{2} sampai {3}/{4}/{5}"`.
- Aturan generik `^Hubungkan ([^·]+)$` bisa membajak kalimat yang lebih panjang.
- Heredoc bash menghilangkan backslash di regex. Untuk berkas yang memuat regex, pakai Edit atau Write.
- Skrip Python yang membaca folder tak tepercaya dijalankan dengan `python -I`.
- Browser pane: `requestAnimationFrame` dan smooth scroll membeku saat panel tersembunyi. Pakai `setTimeout` dan `behavior: "instant"`. Setelah edit, `fetch(f, {cache: "reload"})`. Perubahan `location.hash` tidak memuat ulang halaman.
- Jangan menyisipkan blok dengan `s.index(end_marker)`. Pernah menduplikasi sekitar 7 ribu karakter karena marker itu ketemu di kemunculan yang lebih awal.
- `set()` di `evaluateStatus()` mengubah objek di tempat. Jangan diganti objek baru, karena `clearedAt` akan hilang.
- Cek kunci i18n ganda: `grep -oE '^  "[^"]+":' public/i18n-en.js | sort | uniq -d`.
- `api()` punya latch `apiOffline`. Setelah sekali gagal, langsung memakai mode contoh.
- `isEvidence(w)` dan `hasEvidence(agg)` mengatur `verifyItems`, `calc().verified`, dan `live` di `dataTrust()`.
- Pilar 4 skor: Asuransi 5, Rekening bank 7 (hanya dari bukti, lewat `hasBankEvidence()`), Tujuan 7, Simpanan aman 6. Jumlah 25.

---

## 8. Cara melanjutkan di chat baru

1. Baca dokumen ini, lalu jalankan `git status` dan `git log -3` di folder Laju.
2. Tanyakan ke user dua hal dulu:
   - Apakah panduan Claude mau diterapkan sekarang tanpa kunci?
   - Apakah akun "DummyBasket" memang milik user, dan apakah boleh push ke main?
3. Untuk tes, pakai port 5175. Jangan sentuh server 5174.
4. Setiap perubahan UI: cek lebar 375 px, pastikan tidak ada scroll horizontal, dan cek mode EN.
5. Jangan commit atau push sebelum user meminta. Pakai `/update-github` bila user memintanya.
