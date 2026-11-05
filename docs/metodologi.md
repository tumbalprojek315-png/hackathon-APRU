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

**Pindahan antar akun sendiri.** Tarik saldo, top up, dan transfer antar akun hanya dianggap pindahan (tidak dihitung sebagai pemasukan maupun pengeluaran) kalau akun satunya terdaftar di Laju dan pasangannya ketemu di sana:
- arah berlawanan di akun yang berbeda;
- jumlah keluar dikurangi jumlah masuk antara 0 dan Rp10.000, selisihnya dicatat sebagai "Biaya admin & transfer";
- salah satu keterangan menyebut akun satunya;
- uang masuk tercatat 0 sampai 1 hari kemudian antar e-wallet, 0 sampai 3 hari kalau melibatkan rekening bank atau e statement.

**Nomor HP lebih dulu.** Nomor tiap e-wallet diisi di Izin data dan harus sama dengan nomor akun yang terhubung. Kalau keterangan menyebut nomor lengkap (termasuk di dalam nomor virtual account top up, yang terdiri dari kode bank + nomor HP), nomor itu yang menentukan: nomor milik akun terdaftar berarti pindahan sendiri, nomor orang lain berarti bukan, walaupun jumlah dan tanggalnya cocok. Nomor yang disamarkan hanya petunjuk. Aturan pasangan di atas dipakai kalau tidak ada nomor lengkap.

Teks seperti "Top up dari OVO" saja tidak cukup, karena tidak menunjukkan OVO itu milik siapa. Uang keluar tanpa pasangan dihitung sebagai pengeluaran "Ke rekening atau dompet lain", uang masuk tanpa pasangan dihitung sebagai uang masuk lain. Semua akun dihitung ulang bersama setiap ada akun atau e statement yang ditambah atau dihapus (`pair_transfers` di `openfinance/categorize.py`).

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
| Rencana & proteksi | Asuransi lain | 5 | opsional |
| | Rekening bank | 7 | ada / belum |
| | Tujuan yang jelas | 7 | ada tujuan + nominal |
| | Simpanan di tempat aman | 6 | jumlah tempat selain uang tunai |

**Skor dihitung live.** Setiap catatan langsung menghitung ulang skor. Snackbar menampilkan "Skor X → Y", dan halaman "Cara naik ke skor 70" selalu menampilkan komponen dengan poin hilang terbesar beserta tautan ke langkah yang memperbaikinya.

## 3. Step 0 sampai 5 (landasan milestone v1)

Tangga 8 langkah diganti enam step. Semua ambang disimpan sebagai konstanta `MILESTONE` di `public/core.js`.

| Step | Nama | Selesai jika | Mundur jika |
|---|---|---|---|
| 0 | Data rapi | onboarding selesai | tidak pernah |
| 1 | Keluar dari minus | sisa 30 hari ≥ 5% pendapatan | sisa 30 hari < 0, dan bukan Mode Sakit |
| 2 | Bantalan Rp3 jt + lunasi utang bunga tinggi | uang beku ≥ Rp3 jt **dan** tidak ada utang bunga tinggi, bertahan 28 hari | utang bunga tinggi baru, atau uang beku < Rp2 jt selama 30 hari karena pengambilan bukan darurat |
| 3 | Dana darurat + mulai tujuan wajib | uang beku ≥ bulan target × pengeluaran bulanan terkunci, bertahan 28 hari | uang beku < 2/3 target selama 30 hari karena pengambilan bukan darurat |
| 4 | Investasi 10% selama 3 bulan | setoran uang tumbuh ≥ 10% pendapatan, 3 bulan beruntun | satu bulan di bawah 10% memutus beruntun, uang tumbuh ditarik untuk konsumsi membuka step lagi |
| 5 | Tujuan tumbuh | tiap tabungan tujuan mencapai nominalnya | tidak ada |
| ★ | Rapor & kesimpulan | selalu bisa dibuka | - |

**Bulan target dana darurat** mengikuti jumlah tanggungan: 0 sampai 3 orang jadi 3 bulan, 4 jadi 4, 5 jadi 5, 6 atau lebih jadi 6.

**Uang beku** adalah satu saldo untuk bantalan Step 2 dan dana darurat Step 3. **Uang tumbuh** adalah dana investasi Step 4. **Tabungan tujuan** terpisah dari keduanya.

### Mesin status

```
terkunci -> aktif -> selesai
                      |-> isi_ulang (darurat sah) -> selesai
                      \-> dibuka_lagi -> aktif
dijeda (step di bawahnya dibuka_lagi) -> kembali ke status sebelumnya saat step bawah pulih
```

| Status | Arti |
|---|---|
| `terkunci` | step sebelumnya belum selesai |
| `aktif` | sedang dikerjakan |
| `selesai` | syarat terpenuhi, dan sudah bertahan untuk Step 2 dan 3 |
| `isi_ulang` | uang beku dipakai untuk darurat sah. Bukan kegagalan, skor tidak dikurangi karena ini |
| `dijeda` | step di bawahnya sedang `dibuka_lagi`. Progres tidak dihapus |
| `dibuka_lagi` | syarat mundur terpenuhi, step dikerjakan ulang |

Aturan global: saldo dan riwayat tidak pernah dihapus saat mundur, batas mundur selalu lebih rendah dari batas selesai, semua target yang bergantung pengeluaran memakai **pengeluaran bulanan terkunci** (dikunci tiap awal bulan), dan tiap perubahan status dicatat di `S.milestones.stLog` untuk ditampilkan di Rapor.

**Darurat sah**: sakit, kecelakaan, motor rusak, keluarga meninggal, akun diblokir, bencana. Pengambilan uang beku wajib memilih alasan.

**Mode Sakit**: periode yang ditandai pengguna tidak bisa narik. Hari di periode ini tidak memicu kemunduran Step 1.

### Pembagian tujuan

| Pilihan | Kelompok |
|---|---|
| Biaya pendidikan awal, modal menikah dengan tanggal pasti, kendaraan untuk kerja | wajib, mulai Step 3 |
| Modal menikah tanpa tanggal, kendaraan pribadi, modal usaha sampingan, beli rumah | tumbuh, mulai Step 5 |

Wajib kalau punya tenggat yang tidak bisa digeser, atau melindungi dan menambah penghasilan. Selain itu tumbuh. Total porsi ke semua tujuan wajib dibatasi 30% dari sisa uang. Kalau tenggat tujuan wajib jatuh sebelum perkiraan driver sampai di Step 3, onboarding menampilkan peringatan.

**Tujuan wajib dengan tenggat.** Untuk tiap tujuan wajib yang punya tenggat, Laju menunjukkan berapa yang perlu disisihkan per hari sampai tanggal itu: (nominal − yang sudah ditabung) ÷ sisa hari, dibulatkan ke atas per Rp1.000. Kalau angkanya lebih besar dari sisa uang harian ((pendapatan − pengeluaran) ÷ 30), Laju menyarankan cicil, cari keringanan, atau kecilkan nominal. Ini hanya catatan, tidak mengubah urutan tangga.

## 4. Utang bunga tinggi dan jalur pelunasan

Utang bunga tinggi menjadi **syarat selesai Step 2**, bukan jalur terpisah. `debtLane` tetap dipakai untuk progres dan simulasi pelunasan.

**Klasifikasi** (`isHighInterest` di `core.js`):
- Pinjol, paylater, rentenir, dan kartu kredit langsung dianggap tinggi.
- Utang keluarga dan teman tidak pernah dianggap tinggi, jadi tidak menahan Step 2. Tetapi wajib punya jadwal bayar, dan pengingat muncul kalau belum ada.
- Selain itu dihitung bunga efektif per tahun dari pokok, cicilan, dan tenor (bisection pada nilai sekarang anuitas). Tinggi kalau ≥ 18% per tahun. **Data kurang dianggap tinggi.**

Contoh uji: pokok Rp1.000.000, cicilan Rp600.000, tenor 2 bulan menghasilkan sekitar 13% per bulan, terklasifikasi tinggi.

**Pembagian sisa uang selama Step 2**: selama ada utang bunga tinggi, 70% ke utang dan 30% ke bantalan. Setelah lunas, 100% ke bantalan, dan cicilan yang lunas menambah sisa uang. Saat status `isi_ulang`, 50% sisa uang diarahkan ke uang beku sampai kembali ke target.

**Metode pelunasan** tetap bisa dipilih: bunga termahal dulu (avalanche) atau sisa terkecil dulu (snowball).

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

**Jejak per bulan.** Selain tier, Laju menilai tiap bulan (per 30 hari, mundur dari hari ini), bukan gabungan semua bulan. Yang dinilai hanya bulan yang dicakup penuh oleh semua akun terhubung, supaya akun dengan riwayat lebih pendek tidak membuat bulan terbaru tampak naik:
- penurunan tajam: pencairan 30 hari terakhir turun 30% atau lebih dari median bulan sebelumnya;
- naik turun lebar: koefisien variasi pencairan bulanan di atas 0,35 (minimal 3 bulan);
- bulan minus: uang keluar lebih besar dari uang masuk di akun terhubung (pindahan antar akun sendiri tidak dihitung, biaya admin dihitung keluar).

Hasilnya menjadi catatan di status data dan ikut di laporan bank. Tier tidak berubah karenanya. E statement dihitung dengan cara yang sama dengan e-wallet: angka utama dari 30 hari terakhir dokumen, bulan sebelumnya hanya untuk riwayat.

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
