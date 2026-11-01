# Kontrak data untuk analisis AI (Claude API)

**Tujuan:** Claude membimbing driver ojol menuju stabilitas keuangan, mengikuti tujuan utama yang mereka pilih. Claude hanya menerima data yang **dibutuhkan untuk tujuan itu**. Data identitas tidak pernah dikirim.

- **Sumber:** `buildAIContext()` di `public/core.js`
- **Skema:** `laju.ai-context.v1`
- **Ukuran:** ±6 KB per pengguna
- **Pratinjau:** halaman Rapor → "Data untuk analisis AI"

## 1. Apa yang dikirim dan kenapa

| Bagian | Isi | Dipakai Claude untuk |
|---|---|---|
| `profile` | kota, aplikasi, kendaraan + status kepemilikan, jam/hari narik, status keluarga, jumlah tanggungan, usaha sampingan, rekening bank, BPJS/asuransi, kebiasaan mencatat | konteks hidup: beban tanggungan, biaya kendaraan (kredit/sewa/milik), ruang untuk menambah jam, opsi pemasukan tambahan, risiko tanpa proteksi |
| `dataMode` | `"isian manual (belum terverifikasi)"` atau `"isian manual, diverifikasi e-wallet"` | tahu seberapa jauh angka bisa dipercaya |
| `moneyChannels` | jalur uang yang dipilih pengguna (e-wallet, rekening bank, tunai, lainnya) | memahami bagian mana yang memang tidak bisa diverifikasi |
| `income` | pendapatan bulanan (dari isian), rincian per baris dengan sumber (`terverifikasi` / `sebagian terverifikasi` / `isian sendiri`) dan dasar hitungannya, porsi terverifikasi, hari ramai/sepi/rata-rata, volatilitas, ringkasan e-wallet | menilai stabilitas, membuat anggaran dari hari sepi, menghitung setoran per hari narik |
| `expenses` | pengeluaran bulanan, rentang min–max, porsi terverifikasi, cicilan (+ tanda perkiraan), per kategori: rentang isian + angka e-wallet, transaksi e-wallet belum dikenali | mencari pos yang bisa dihemat |
| `verification` | per item: isian, e-wallet, status (cocok / sebagian / tidak lewat e-wallet / isian lebih kecil / tidak diisi), penjelasan pengguna (tunai, rekening bank, e-wallet lain, perkiraan terlalu tinggi, bukan milik saya), apakah angka e-wallet dipakai | bertanya balik soal selisih yang belum jelas, dan menimbang angka terverifikasi lebih tinggi |
| `dataChecks` | hal yang masih ambigu: isian lebih kecil dari e-wallet, selisih belum dijelaskan, uang di luar e-wallet tanpa sumber, jalur belum terhubung, cicilan diperkirakan 12 bulan | tidak memberi saran dari angka yang belum pasti |
| `debts[]` | jenis, sisa, bunga/bln (+ tanda perkiraan), sisa tenor, cicilan, bunga tinggi?, jatuh tempo, lunas? | strategi pelunasan, peringatan jatuh tempo, cek DSR terhadap batas OJK 30% |
| `savings` | dana darurat (Rp & bulan), tabungan tujuan, setoran/bulan, kebiasaan, tempat simpan, jawaban tes guncangan | kesiapan menghadapi guncangan, saran tempat simpan yang aman |
| `goals` | tujuan utama, semua tujuan, nominal, horizon, minat kredit resmi | **mengarahkan semua saran ke tujuan utama** |
| `health` | skor, kategori, rasio sisa, DSR, rasio utang/pendapatan setahun, 4 pilar + semua komponen | menjelaskan skor dan memilih perbaikan dengan dampak terbesar |
| `plan` | pembagian sisa uang (fase + porsi), jalur utang (progres, metode, perkiraan lunas), status 8 tangga + rapor | menjaga saran tetap konsisten dengan rencana di aplikasi |
| `activity` | jumlah setoran/bayar utang 30 hari, 10 catatan terakhir | menilai konsistensi dan memberi apresiasi atau dorongan |
| `history` | potret saat onboarding selesai, skor harian (30 hari) | menulis kesimpulan "awal vs sekarang" |

## 2. Yang TIDAK dikirim

| Data | Alasan |
|---|---|
| Nama lengkap, nomor HP, username | identitas. Tidak diperlukan untuk analisis |
| Password | tidak pernah disimpan di browser. Tidak pernah dikirim ke AI |
| Area narik detail | bisa melacak lokasi. Kota sudah cukup untuk konteks biaya hidup |
| Token/akses e-wallet | hanya ada di server (`server.py`). AI cukup menerima ringkasan |
| Transaksi e-wallet mentah | hanya ringkasan per bulan yang dikirim (prinsip minimisasi data, UU PDP) |

Nama tetap dipakai **di aplikasi** (sapaan "Halo, …"). Bila respons Claude butuh sapaan, aplikasi menyisipkan nama secara lokal setelah respons diterima.

## 3. Audit isian onboarding

| Isian | Status | Catatan |
|---|---|---|
| Nama, HP, username, password | ❌ tidak dikirim | identitas |
| Kota | ✅ | konteks biaya hidup & UMR |
| Aplikasi, kendaraan, kepemilikan | ✅ | kepemilikan kredit = cicilan tersembunyi |
| Jam & hari narik | ✅ | dasar setoran per hari & tarif per jam |
| Area narik | ❌ tidak dikirim | tidak dipakai di perhitungan. Risiko privasi. **Kandidat dihapus dari onboarding.** |
| Status keluarga, tanggungan | ✅ | menentukan besar dana darurat yang wajar |
| Usaha sampingan | ✅ | potensi menambah pemasukan |
| Pendapatan per aplikasi, bonus, tip, lain-lain, hari ramai/sepi | ✅ | inti analisis arus kas |
| Kebiasaan mencatat | ✅ | komponen skor |
| Pengeluaran per kategori (min–max) | ✅ | inti analisis arus kas |
| Utang (jenis, sisa, bunga, tenor, jatuh tempo) | ✅ | jalur utang |
| Tabungan, kebiasaan, tempat simpan, tes guncangan | ✅ | pilar tabungan |
| Tujuan, nominal, horizon, minat kredit | ✅ | arah bimbingan |
| BPJS, asuransi, rekening | ✅ | pilar proteksi |
| Jalur uang (e-wallet, rekening, tunai, lainnya) | ✅ | menjelaskan bagian yang memang tidak bisa diverifikasi |
| ~~Perasaan soal uang~~ | dihapus | subjektif, tidak bisa ditindaklanjuti |

## 4. Rancangan integrasi (berikutnya)

1. **Server-side saja.** Browser mengirim konteks ke `POST /api/ai/analyze` di `server.py`. Server memanggil Claude API dengan kunci dari variabel lingkungan (`ANTHROPIC_API_KEY`). Kunci tidak pernah ada di browser.
2. **System prompt** berisi:
   - peran: penasihat keuangan untuk driver ojol, bahasa Indonesia sederhana
   - aturan: tidak menyarankan pinjol, tidak memberi saran investasi spesifik, selalu hormati tujuan utama
   - ringkasan metodologi (`metodologi.md`)
3. **Keluaran terstruktur** (JSON):
   - `kesimpulan`
   - `kekuatan[]`
   - `perbaikan[]`, masing-masing dengan `langkahId`
   - `prioritas30Hari[]`
   - `peringatan[]` (mis. jatuh tempo dekat, DSR > 30%)

   Aplikasi menampilkannya di Rapor menggantikan kesimpulan otomatis. Kesimpulan otomatis tetap menjadi cadangan bila API gagal.
4. **Persetujuan.** Tambahkan centang "Izinkan analisis AI" di langkah Izin data. Tanpa centang, data tidak dikirim.
5. **Biaya & cache.** Konteks berubah hanya saat ada catatan baru, jadi analisis cukup dijalankan ulang bila `history.scoreLog` atau `activity` berubah. Bagian system prompt yang statis bisa memakai prompt caching.
