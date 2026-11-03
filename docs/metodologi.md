# Metodologi analisis keuangan Laju

Dokumen ini menjelaskan cara Laju menilai kondisi keuangan driver ojol, menyusun tangga milestone, dan menulis rapor. Semua angka dihitung di `public/core.js`.

## 1. Prinsip

1. **Data objektif, bukan perasaan.** Skor hanya memakai angka dan fakta yang bisa dicek (pendapatan, pengeluaran, utang, tabungan, kepesertaan BPJS). Pertanyaan "bagaimana perasaan Anda soal uang" dihapus karena tidak bisa dipakai untuk membimbing dan sulit diverifikasi.
2. **Pendapatan tidak tetap = rencanakan dari hari sepi.** Driver ojol tidak punya gaji bulanan. Anggaran dan setoran dihitung per *hari narik*, dan kestabilan pendapatan (koefisien variasi dari isian hari ramai/sepi/rata-rata) ikut dinilai.
3. **Urutan prioritas yang jelas.** Arus kas positif → bantalan kecil → proteksi → dana darurat penuh → kebiasaan menabung → tujuan utama → siap kredit resmi. Utang dibayar di jalur paralel, jadi tidak menahan tangga lain.
4. **Setiap perubahan bisa dicek dan dibatalkan.** Setiap catatan (setoran, bayar utang, ubah angka) lewat layar konfirmasi *sebelum → sesudah*, lalu bisa diurungkan.

## 1b. Isian manual + verifikasi e-wallet

**Isian manual adalah gambaran lengkap** (tunai maupun non-tunai) dan selalu menjadi dasar hitungan. **E-wallet opsional, untuk verifikasi**: transaksi 30 hari dicocokkan dengan isian, lalu selisihnya dijelaskan.

Di Profil, pengguna memilih **lewat mana saja uangnya masuk & keluar**: GoPay, OVO, DANA, ShopeePay, LinkAja, rekening bank, tunai, atau lainnya. Saran awal diambil dari aplikasi yang dipakai (Gojek → GoPay, ShopeeFood → ShopeePay), tapi pengguna yang memutuskan. Langkah E-wallet menampilkan e-wallet pilihan itu lebih dulu dan menjelaskan jalur yang tidak bisa dihubungkan.

**Verifikasi per item.** Item yang dicek: pendapatan dari aplikasi, pemasukan di luar ojol, tiap kategori pengeluaran, dan cicilan. M = isian, W = e-wallet.

| Status | Kondisi | Yang diminta dari pengguna |
|---|---|---|
| Cocok | W ≥ 90% isian (atau masih di dalam rentang) | - |
| Sebagian terverifikasi | W < isian | jelaskan selisihnya: tunai / rekening bank / e-wallet lain (nama yang belum terhubung) / perkiraan terlalu tinggi |
| Tidak lewat e-wallet | W = 0 | jelaskan jalurnya (sama seperti di atas) |
| Isian terlalu kecil | W > isian | "Sesuaikan isian ke Rp W" atau "bukan milik saya (titipan / pinjaman)" |
| Belum diisi | isian 0, W > 0 | sama seperti di atas |

**Aturan hitungan**
- Yang sudah terbukti di e-wallet adalah **batas bawah**:
  - batas bawah rentang = maks(isian min, W)
  - batas atas = maks(isian max, W)
  - Aturan ini juga berlaku saat W masih di dalam rentang. Pengecualian: item yang ditandai "bukan milik saya".
- Pemasukan di luar ojol **tidak** dinaikkan otomatis, karena transfer masuk bisa saja pinjaman atau titipan. Pengguna hanya diingatkan.
- Cicilan = daftar utang, kecuali e-wallet mencatat lebih besar (dan tidak ditandai "bukan cicilan saya").
- Tanpa e-wallet, semua angka berlabel "isian sendiri" dan tidak ada verifikasi.

**Pengecekan** (kartu "Hasil verifikasi" di Hasil & Dashboard):
- porsi terverifikasi pendapatan & pengeluaran
- jalur uang yang belum terhubung
- daftar item dengan statusnya
- selisih yang belum dijelaskan
- cek asal uang di luar e-wallet: pengeluaran yang tidak terlihat harus tertutup oleh pendapatan yang tidak terlihat + tarik saldo
- total uang keluar e-wallet melebihi perkiraan tertinggi

Bila server dimulai ulang (izin e-wallet prototipe disimpan di memori), ringkasan terakhir tetap dipakai dan ditandai "Data terakhir" sampai e-wallet dihubungkan lagi.

**Batasan kategorisasi.** Transaksi dikelompokkan dengan kata kunci di deskripsi (`openfinance/categorize.py`), misalnya "SPBU" → Bensin dan "GoFood" → Makan. Di simulasi hasilnya rapi karena deskripsinya dibuat generator. Di data asli banyak yang tidak dikenali (misalnya "QRIS TOKO SINAR JAYA"). Transaksi itu tetap dihitung di total e-wallet dan disebut di pengecekan. Untuk versi asli: pakai kode kategori merchant (MCC) QRIS bila penyedia open finance menyediakannya, plus tombol koreksi kategori oleh pengguna.

## 2. Skor kesehatan finansial (0–100)

Kerangkanya mengikuti **FinHealth Score** dari Financial Health Network: 4 pilar (Spend, Save, Borrow, Plan) dan batas kategori <40 rentan dan ≥80 sehat. Laju memecah 40–79 menjadi dua kategori supaya kemajuan lebih terasa.

| Kategori | Skor |
|---|---|
| Rentan | 0–39 |
| Perlu dibenahi | 40–59 |
| Cukup sehat | 60–79 |
| Sehat | 80–100 |

Setiap pilar bernilai 25 poin. Setiap komponen menampilkan poin, nilai sekarang, dan saran (lihat "Rincian poin" di grafik pilar).

| Pilar | Komponen | Poin | Aturan |
|---|---|---|---|
| Arus kas | Sisa uang per bulan | 15 | sisa ≥10% pendapatan = penuh. Minus mengurangi poin |
| | Kestabilan pendapatan | 5 | stabil 5 · naik-turun 3 · fluktuatif 1 |
| | Kebiasaan mencatat | 5 | jawaban onboarding **atau** jumlah catatan di Laju 30 hari terakhir (≥8 → 5, ≥3 → 3), mana yang lebih tinggi |
| Tabungan & ketahanan | Dana darurat | 12 | dana darurat ÷ 3 bulan pengeluaran |
| | Tes guncangan Rp1 juta | 5 | jawaban onboarding **atau** dana darurat sekarang (≥Rp1 jt → 5, ≥Rp500 rb → 3) |
| | Menabung rutin | 8 | setoran per bulan ÷ 10% pendapatan. Setoran yang dicatat di Laju ikut dihitung |
| Utang | Porsi cicilan (DSR) | 12 | ≤10% penuh. Turun linear sampai 0 di 50% |
| | Utang bunga tinggi | 8 | tidak ada 8 · satu 3 · lebih dari satu 0 |
| | Total utang | 5 | total utang ÷ pendapatan setahun ≤30% penuh |
| Rencana & proteksi | BPJS Kesehatan | 6 | aktif / belum |
| | BPJS Ketenagakerjaan | 5 | aktif / belum |
| | Asuransi lain | 2 | opsional |
| | Rekening bank | 4 | ada / belum |
| | Tujuan yang jelas | 4 | ada tujuan + nominal |
| | Simpanan di tempat aman | 4 | jumlah tempat selain uang tunai |

**Skor dihitung live.** Setiap catatan langsung menghitung ulang skor. Snackbar menampilkan "Skor X → Y", dan halaman "Cara naik ke skor 70" selalu menampilkan komponen dengan poin hilang terbesar beserta tautan ke langkah yang memperbaikinya.

## 3. Tangga milestone

Langkah 7 mengikuti **tujuan utama** yang dipilih di onboarding (Ketahanan → Tujuan keuangan).

| # | Langkah | Selesai jika |
|---|---|---|
| 1 | Fondasi: data rapi | onboarding selesai |
| 2 | Keluar dari minus | pendapatan ≥ pengeluaran + cicilan |
| 3 | Bantalan pertama Rp1 juta | dana darurat ≥ Rp1 jt |
| 4 | Proteksi dasar: BPJS | BPJS Kesehatan + Ketenagakerjaan aktif |
| 5 | Dana darurat 3 bulan | dana darurat ≥ 3 × pengeluaran |
| 6 | Menabung rutin 10% | setoran/bulan ≥ 10% pendapatan |
| 7 | Tujuan utama | *bebas utang* → semua utang lunas · *dana darurat* → 6 bulan · *kendaraan/usaha/anak/rumah* → tabungan tujuan (pot terpisah) mencapai nominal sebelum tenggat |
| 8 | Siap ajukan kredit resmi | skor ≥70, riwayat terverifikasi 6 bulan, tanpa utang bunga tinggi, DSR ≤30% |
| ★ | Rapor & kesimpulan | selalu bisa dibuka. Menjadi "rapor akhir" saat 1–8 selesai |

Progres 100% hanya muncul bila **semua** syarat wajib terpenuhi, jadi pembulatan tidak bisa membuat langkah tampak selesai.

### Rencana setoran adaptif

Slider "Setor per hari narik" bergerak dari **Rp1.000** sampai **rata-rata pendapatan ojol per hari** (jumlah pendapatan per aplikasi. Kalau kosong, dipakai rata-rata harian sebulan terakhir atau pendapatan bulanan ÷ hari kerja), dengan langkah Rp1.000. Tombol cepat 5% / 10% / 20% dari pendapatan harian. Nilai awalnya diambil dari pembagian sisa uang bulan ini.

## 4. Jalur paralel: pelunasan utang

Utang bunga tinggi tidak lagi menjadi satu anak tangga. Utang butuh berbulan-bulan, dan menahannya di satu langkah akan membuat driver "macet". Pelunasan menjadi **jalur paralel** yang membentang di bawah langkah 2–8:

- **Progres** = utang yang sudah dibayar ÷ jumlah utang tertinggi yang pernah tercatat.
- **Titik pemeriksaan**: (1) utang bunga tinggi lunas, (2) semua utang konsumtif lunas.
- **Metode** bisa dipilih pengguna:
  - *Bunga termahal dulu* (avalanche): paling hemat bunga.
  - *Sisa terkecil dulu* (snowball): riset Kellogg menunjukkan orang lebih sering menuntaskan utang bila memulai dari saldo kecil.
- **Simulasi** bulanan: semua cicilan tetap dibayar, tambahan diarahkan ke utang nomor 1, dan cicilan yang lunas digulirkan ke utang berikutnya.
- **Aturan selama jalur berjalan**:
  - DSR ≤30% (batas OJK untuk pinjol mulai 2026, SEOJK 19/2025).
  - Tidak mengambil pinjol/paylater baru.
  - Bayar tepat waktu.
- Langkah lain tetap terhubung ke jalur ini. Komponen skor "Utang bunga tinggi" dan syarat kredit (langkah 8) membaca jalur yang sama. Bila tujuan utama = bebas utang, langkah 7 memakai progres jalur ini.

## 5. Pembagian sisa uang bulanan

Sisa uang (pendapatan − pengeluaran − cicilan) dibagi menurut fase:

| Fase | Kondisi | Porsi |
|---|---|---|
| Tutup kekurangan | sisa ≤ 0 | fokus menutup minus (rencana hemat + jam narik, cadangan 10%) |
| Bantalan | dana darurat < Rp1 jt | 70–90% dana darurat, sisanya utang/tujuan |
| Serang utang | ada utang bunga tinggi | 70% tambahan bayar utang, 20% darurat, 10% tujuan |
| Lengkapi darurat | darurat < 3 bulan | 60% darurat, sisanya utang/tujuan |
| Kejar tujuan | fondasi aman | 60% tujuan, sisanya utang/tabungan jangka panjang |

Tujuan utama menggeser porsi (kecuali di fase bantalan):

- *bebas utang*: +15–25% ke utang.
- *dana darurat*: +15–25% ke darurat.

Setiap porsi juga ditampilkan **per hari narik**.

Urutan "bantalan kecil dulu, baru serang utang" sengaja dipilih. Survei IDEAS (2026) mencatat 91% driver berutang dan 43% memakai pinjol. Tanpa bantalan, satu biaya mendadak biasanya ditutup pinjol baru.

## 6. Rapor & kesimpulan

Rapor berisi:

1. **Kesimpulan otomatis** (berbasis aturan):
   - ringkasan sesuai kategori skor
   - hingga 3 komponen terkuat (≥80% poin)
   - 3 komponen dengan poin hilang terbesar beserta sarannya
   - prioritas 30 hari ke depan (langkah aktif, pembagian uang, jalur utang)
2. **Skor dari waktu ke waktu**: skor awal (saat onboarding selesai) dibanding sekarang, plus grafik harian.
3. **Awal vs sekarang**: skor, sisa per bulan, dana darurat (Rp & bulan), tabungan tujuan, total utang, utang bunga tinggi, DSR, dan BPJS. Setiap baris memakai ikon dan label "membaik / memburuk / tetap", bukan hanya warna.
4. **Perjalanan tangga**: tanggal selesai tiap langkah, ditambah jalur utang.
5. **Aktivitas tercatat**: total setoran, total bayar utang, dan 8 catatan terakhir.
6. **Data untuk analisis AI**: pratinjau JSON yang nanti dikirim ke Claude (lihat `ai-data-contract.md`).

Kesimpulan otomatis ini adalah lapisan dasar yang selalu tersedia. Nantinya Claude memperdalamnya dengan data yang sama.

## 6b. Status data untuk bank (tier kepercayaan)

Mengikuti dokumen tim "Semua Skenario Data Uang dan Rekening". Satu aturan: **hanya uang yang terbukti dari sumbernya yang dipakai untuk pengajuan kredit.** Isian manual tetap dipakai, tapi hanya untuk panduan (skor, tangga, rencana).

**Dua angka pendapatan**

| Angka | Sumber | Dipakai untuk |
|---|---|---|
| Isian Anda (panduan) | Isian manual, dinaikkan ke angka e-wallet bila e-wallet lebih besar | Skor, tangga, rencana uang |
| Pendapatan yang diakui bank | Median bulanan pencairan aplikasi di dompet yang terhubung (riwayat 6 bulan). Bonus hanya dihitung kalau muncul minimal 3 bulan, bobot setengah | Status data untuk bank |

Transfer dari orang, top up dari akun sendiri, uang masuk yang tidak dikenali, dan isian manual tidak pernah masuk angka bank. Uang keluar yang tidak dikenali tetap dihitung sebagai pengeluaran.

**Tier**

| Tier | Syarat | Pengajuan |
|---|---|---|
| 1 Terverifikasi penuh | Riwayat 6 bulan, minimal 85% transaksi dikenali (dihitung dari jumlah uang), semua dompet yang dipilih terhubung, pencairan tiap aplikasi terlihat | Boleh ajukan |
| 2 Terverifikasi sebagian | Riwayat 3 sampai 6 bulan, atau 60 sampai 85% dikenali, atau ada dompet yang dipilih belum terhubung, izin dompet berakhir, pencairan aplikasi tidak terlihat, atau pencairan masuk ke dompet "Lainnya" | Boleh ajukan, plafon dibatasi |
| 3 Mandiri | Hanya isian manual, riwayat di bawah 3 bulan, atau di bawah 60% dikenali | Belum bisa lewat skor, hanya panduan |
| 0 Tanpa data | Belum ada data sama sekali | Belum bisa |

Setiap alasan tier ditampilkan ke pengguna bersama cara menaikkannya. Data yang terakhir diperbarui lebih dari 14 hari diberi label "data belum diperbarui" yang ikut terkirim ke bank. Plafon tidak ditampilkan dalam rupiah, karena angkanya masih perlu dikalibrasi.

Dicakup di prototipe: kasus A1 sampai A5, B1, B2, B5, B6, C1 (dompet "Lainnya" + pencocokan salah ketik), C2 (rekening bank bisa dihubungkan), C3 (OTP salah 3 kali), C4 (izin ditolak), C5, C7, D1, D2, D4, E1 (status kendaraan Kredit tanpa cicilan), F6, G3, G4. Belum dibangun: unggah PDF mutasi, KYC, SLIK OJK, layar "Bantu kenali transaksi", pengenalan pinjol/bansos/dana talangan, dan semua kasus setelah pinjaman cair.

## 7. Sumber

- Financial Health Network: FinHealth Score methodology: https://finhealthnetwork.org/score/score-methodology/
- FinHealth Score Toolkit (2021): https://finhealthnetwork.org/wp-content/uploads/2021/11/FinHealthScoreToolkit-2021.pdf
- UNSGSA: Measuring Financial Health: https://www.unsgsa.org/sites/default/files/resources-files/2021-11/Measuring-Financial-Health-note-v2.pdf
- Brookings: Measuring the financial health of Americans: https://www.brookings.edu/articles/measuring-the-financial-health-of-americans/
- OJK batasi utang pinjol maksimal 30% penghasilan (CNN Indonesia, Jan 2026): https://www.cnnindonesia.com/ekonomi/20260112163314-78-1316215/ojk-batasi-utang-pinjol-maksimal-30-persen-dari-penghasilan
- OJK perketat aturan pinjol (IDX Channel): https://www.idxchannel.com/banking/ojk-perketat-aturan-pinjol-utang-dibatasi-30-persen-dari-penghasilan
- Diskon 50% iuran BPJS Ketenagakerjaan ojol hingga Maret 2027 (detikFinance): https://finance.detik.com/moneter/d-8340262/kabar-baik-buat-ojol-iuran-bpjs-ketenagakerjaan-diskon-50-hingga-maret-2027
- Paket ekonomi 2025: iuran BPJSTK ojol (Bisnis): https://ekonomi.bisnis.com/read/20250916/12/1911619/paket-ekonomi-2025-ojol-cukup-bayar-iuran-bpjstk-rp10800
- Survei IDEAS: 91% pengemudi ojol terjerat utang (Republika): https://ekonomi.republika.co.id/berita/tm6fwv423/survei-ideas-91-persen-pengemudi-ojol-terjerat-utang
- Kellogg School: The snowball approach to debt: https://www.kellogg.northwestern.edu/news_articles/2012/snowball-approach.aspx
- PayPal: How to budget with irregular income: https://www.paypal.com/us/money-hub/article/how-to-budget-with-irregular-income
- Emergency fund with irregular income: https://jobble.com/articles/building-an-emergency-fund-with-irregular-income

Nominal iuran dan aturan bisa berubah. Cek kanal resmi OJK dan BPJS sebelum dipakai di produksi.
