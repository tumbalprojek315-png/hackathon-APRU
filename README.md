# Laju: prototipe

Onboarding kesehatan finansial untuk pengemudi ojol, dengan penghubungan e-wallet lewat open finance.

## Menjalankan

```bash
python server.py
```

Buka http://127.0.0.1:5174 (Oracle memakai 5173, jadi keduanya bisa jalan bersamaan). Tidak perlu install apa pun (Python 3.10+ saja).

## Mode contoh (tanpa server)

Kalau halaman dibuka tanpa `server.py`, misalnya dari GitHub Pages, aplikasi otomatis memakai **mode contoh**:
semua jawaban `/api/...` dilayani di browser oleh `public/demo-mode.js` dari `public/demo-data.json`.
Jadi penghubungan e-wallet tetap bisa didemokan lewat tautan. Isi datanya sama dengan keluaran `MockProvider`
saat server berjalan, karena memang dibuat olehnya. Yang tidak bisa jalan tanpa server hanya pembacaan PDF
e statement asli, dan di mode contoh tombolnya diganti "Pakai contoh".

Kalau `openfinance/mock.py` diubah, buat ulang datanya:

```bash
python tools/buat-data-contoh.py
```

## Struktur

| Bagian | Isi |
|---|---|
| `public/` | Halaman web (landing, onboarding, aplikasi, halaman penyedia simulasi) |
| `public/core.js` | Logika bersama: data acuan, state, skor kesehatan (4 pilar ala FinHealth, live), tangga milestone (`buildMilestones`), jalur utang (`debtLane`), pembagian sisa uang (`allocation`), catatan + urungkan (`recordChange`/`undoChange`), konteks AI (`buildAIContext`) |
| `public/onboarding.html` + `onboarding.js` | Wizard 7 atau 8 langkah sampai halaman Hasil (langkah E-wallet hanya muncul kalau dipilih). Isian manual selalu wajib dan jadi dasar hitungan. E-wallet opsional untuk memverifikasi isian (selisih dijelaskan: tunai, rekening bank, e-wallet lain) |
| `public/app.html` + `app-page.js` | Setelah onboarding: tab bawah **Beranda**, **Tangga**, **+ Catat**, **Rapor**, **Profil**. Profil = data yang jarang berubah (tiap bagian membuka `onboarding.html?edit=<bagian>` dengan tombol Batal/Simpan). + Catat = kejadian yang memindahkan uang (setor, ambil tabungan, bayar utang), selalu lewat konfirmasi dan bisa diurungkan. Tangga hanya menampilkan progres dan rencana |
| `public/i18n.js` + `i18n-en.js` | Tombol bahasa ID / EN. Teks ditulis dalam bahasa Indonesia, terjemahan Inggris diambil dari kamus `i18n-en.js` saat EN dipilih. Teks baru: tambahkan entrinya di kamus, angka ditulis `{0}` |
| `public/masuk.html` + `masuk.js` | Halaman Masuk (nomor HP + password). Prototipe satu akun per perangkat. Password tidak disimpan, hanya hash PBKDF2 + salt. Keluar lewat Profil |
| `public/muat-ulang.js` | Tombol reset (↻) di header semua halaman: setelah konfirmasi, menghapus semua data di perangkat (akun, isian, catatan, rencana), memutus e-wallet di server, mengambil ulang file tanpa cache, lalu kembali ke halaman depan. Hanya pilihan bahasa yang disimpan |
| `docs/metodologi.md` | Cara skor, tangga, jalur utang, pembagian uang, dan rapor dihitung + sumber riset |
| `docs/ai-data-contract.md` | Data apa yang dikirim ke Claude API (dan yang tidak), audit isian onboarding, rancangan integrasi |
| `public/components.css` | Komponen v3: pencarian kota, slider rentang, kalender, grafik halaman Hasil (warna grafik lolos validator buta warna) |
| `.claude/skills/` | Skill desain terpasang: `frontend-design` (Anthropic), `web-design-guidelines` (Vercel), `web-perf` (Cloudflare) |
| `server.py` | Menyajikan halaman + API `/api/wallets/*`. Kunci API dan token akun hanya ada di sini |
| `openfinance/base.py` | Kontrak `Provider` yang harus dipenuhi penyedia mana pun |
| `openfinance/mock.py` | Penyedia simulasi (dipakai sekarang) |
| `openfinance/live.py` | **Penyedia asli, 4 metode yang masih TODO** |
| `openfinance/categorize.py` | Memisahkan pencairan aplikasi, transfer antar-akun, cicilan, dan kategori pengeluaran |

## Alur penghubungan e-wallet

1. Pengguna klik **Hubungkan** → dialog izin di Laju.
2. `POST /api/wallets/link` → server minta sesi ke penyedia → browser diarahkan ke halaman penyedia.
3. Pengguna login (nomor HP + OTP) **di halaman penyedia**, lalu menyetujui akses hanya-baca.
4. Penyedia mengarahkan kembali ke `GET /api/wallets/callback` → server menukar token, menyimpannya.
5. `POST /api/wallets/{id}/sync` → server mengambil transaksi 30 hari, mengolahnya, mengirim ringkasan ke browser.

Langkah 1–5 sudah berjalan penuh dengan penyedia simulasi.

## Yang tersisa untuk data asli

1. Daftar akun developer di penyedia open finance berlisensi (mis. Brick atau Ayoconnect), minta akses sandbox, dan konfirmasi e-wallet mana yang didukung.
2. Isi 4 metode di `openfinance/live.py` sesuai dokumentasi resmi mereka.
3. Jalankan dengan kunci API:
   ```bash
   set LAJU_PROVIDER=live
   set OPEN_FINANCE_BASE_URL=...
   set OPEN_FINANCE_CLIENT_ID=...
   set OPEN_FINANCE_CLIENT_SECRET=...
   python server.py
   ```
4. Sebelum dipakai pengguna sungguhan: database dengan token terenkripsi (sekarang masih di memori), login akun yang benar, HTTPS, dan pencatatan persetujuan sesuai UU PDP.
