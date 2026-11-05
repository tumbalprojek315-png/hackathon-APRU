# Log perbaikan & pengujian: 29 & 31 Okt 2026

> **Catatan 31 Okt:** model "e-wallet + tunai" di bagian A diganti dengan model **isian manual + verifikasi e-wallet** (lihat bagian D). Perbaikan lain di bagian A–C tetap berlaku.

Cadangan sebelum perubahan: `laju-before-sources.tgz` (scratchpad sesi).
Pengujian dijalankan di server uji port 5175 (port 5174 dipakai server milik pengguna).

## A. Perbaikan dari daftar bug

| # | Masalah | Perbaikan |
|---|---|---|
| 1 | E-wallet dan isian manual saling bersaing (pilih salah satu, batas 15%) | Model baru **e-wallet + tunai**. Isian manual wajib. Dengan e-wallet, pengguna hanya mengisi bagian yang tidak lewat e-wallet. Pilihan "pakai angka transaksi / angka saya" dihapus. |
| 2 | Centang "Isi manual" tidak berpengaruh | Pilihan dihapus. Kartu "Isian manual, selalu dipakai" + "Tambahkan e-wallet (opsional)". |
| 3 | Pendapatan harus diisi ulang walau e-wallet terhubung | Pencairan aplikasi terbaca otomatis. Pertanyaan wajib "Ada pendapatan yang tidak lewat e-wallet?", lalu order tunai per hari, tip tunai, dan bonus ke rekening lain. Aplikasi yang tidak cair ke e-wallet terhubung diminta perkiraannya. |
| 4 | Pengeluaran per kategori dari e-wallet tidak dipakai | Tiap kategori: angka e-wallet (otomatis) + rentang tunai (prefill = perkiraan manual − e-wallet). Transaksi "belum dikenali" tetap dihitung. |
| 5 | Pencocokan hanya cek total | Diganti kartu **Sumber data & pengecekan**: % terverifikasi (pendapatan & pengeluaran), cek asal uang tunai (termasuk tarik saldo / top up), kategori wajib nol, cicilan e-wallet vs daftar utang, transfer masuk lain. Tombol "Perbaiki di langkah …". |
| 6 | Tombol "Pakai angka ini" tidak terlihat + dobel bonus/tip | Tidak diperlukan lagi (e-wallet dipakai langsung). Bonus/tip manual tidak ikut dihitung di mode e-wallet. Tombol jelas "Isi dari transaksi" untuk rata-rata/ramai/sepi. |
| 7 | Utang tanpa "sisa bulan" dianggap cicilan Rp0 | Semua tempat memakai asumsi 12 bulan dan ditandai perkiraan (hint di form, rincian hitungan, pengecekan). |
| 8 | Grafik arus kas "melayang" | Satu batang pendapatan dibagi pengeluaran / cicilan / sisa (defisit diarsir), legenda + persen, dan **Rincian hitungan** per baris dengan rumus dan label sumber. Angka bulanan dibulatkan ke ribuan. |
| 9 | Pertanyaan kredit resmi ambigu | "Berencana mengajukan pinjaman ke bank atau koperasi resmi dalam 12 bulan ke depan?" + penjelasan KUR/bunga + syarat e-wallet. Sekarang wajib dijawab. |
| 10 | Snackbar menutupi tombol | Snackbar tanpa tombol tidak menghalangi ketukan dan hilang dalam 2,2 detik. |
| 11 | Header sesak, tab langkah terpotong | Tombol header tidak patah baris (ikon disembunyikan di ≤440px). Tab langkah memudar di tepi saat masih bisa digeser. |
| 12 | README "8 langkah" | "7 atau 8 langkah". |

## B. Loop pengujian sebagai pengguna

| Percobaan | Skenario | Temuan | Status |
|---|---|---|---|
| 1 | Pengguna baru, manual saja (Budi, Medan): isi semua langkah lewat form, tekan Lanjut saat kosong, ketik "abc150.000xyz", rata-rata di luar rentang, utang tanpa jenis, matikan Makan | Validasi semua benar. **Bug #1:** baris "Perkiraan total cicilan" tidak muncul saat sisa utang diketik (hanya muncul setelah render ulang). Label sumber di rincian sedikit menjorok. | Diperbaiki |
| 2 | Budi kembali lewat Ubah data, aktifkan e-wallet, hubungkan GoPay (halaman penyedia simulasi, OTP), isi tunai | **Gap #2:** peringatan cicilan hanya muncul bila daftar utang kosong. Budi mencatat Pinjol Rp250rb/bln padahal e-wallet bayar Rp1,1 jt/bln. **Bug #3:** "Isi dari transaksi" melupakan Maxim (tidak cair ke GoPay). **Bug #4 (hitungan):** cicilan yang dibayar lewat e-wallet tidak masuk arus kas sama sekali, sehingga sisa terlihat ±Rp850rb lebih baik dan porsi cicilan 4% (seharusnya 18%). | Diperbaiki: cicilan = max(daftar, e-wallet), peringatan selisih, Maxim ikut dihitung |
| 3 | Selesai → semua halaman app dalam mode e-wallet, data AI | Semua 10 halaman tampil, "pengeluaran terbesar" memakai e-wallet + tunai, konteks AI memuat sumber & pengecekan. | Lulus |
| 4 | Tandai uang masuk lain, jawab "Tidak ada" untuk pengeluaran tunai lalu "Ya" lagi, putuskan e-wallet dari Izin | Angka berubah tepat sesuai yang ditandai. Nilai tunai tersimpan. Setelah diputus, kembali ke mode manual dengan isian lama. | Lulus |
| 5 | Kota di dekat bar Lanjut (laporan tab lain) | **Bug #6:** daftar kota terbuka ke bawah melewati tepi layar / tertutup bar Lanjut saat halaman sudah mentok bawah. | Diperbaiki: halaman bergeser secukupnya, bila mentok daftar dibuka ke atas |
| 6 | "Isi contoh" ×3 lalu jalan dari Akun sampai app | Tidak tertahan di langkah E-wallet. Snackbar tidak menghalangi. | Lulus |
| 7 | Uji otomatis 13 kelompok invarian (Node) | Tidak ada hitungan dobel di kombinasi mana pun. Override tidak diklaim terverifikasi. Tidak ada NaN dari isian aneh. Tidak ada PII di konteks AI. | Lulus |
| 8 | Alur yang bisa membuat pengguna tersangkut / data hilang | **Gap #7:** pengguna yang mengaktifkan e-wallet tapi tidak jadi menghubungkan tertahan di langkah E-wallet. **Bug #8:** setelah server dimulai ulang, ringkasan e-wallet dihapus diam-diam dan dashboard berpindah ke mode manual. | Diperbaiki: tombol "Lanjut tanpa e-wallet". Data terakhir tetap dipakai (label "Data terakhir" + tombol "Hubungkan lagi" + pemberitahuan) |
| 9 | Header 360/375/414px dengan font asli dan font cadangan | Satu baris di semua kombinasi, tab memudar di tepi. | Lulus |
| 10 | Regresi: invarian + skor contoh + 12 halaman app dengan data e-wallet basi | Tidak ada temuan baru. | **Berhenti** |

## C. Catatan

- Langkah maju lewat tab memang dikunci (harus lewat Lanjut) sesuai permintaan sebelumnya. Tombol "Perbaiki di langkah …" membawa pengguna mundur.
- Skor contoh sedikit berubah karena cicilan tanpa lama bulan kini dihitung: Andi 27 → 25. Sudirman 50. Wayan 93.
- Pengguna lama yang sebelumnya sudah menghubungkan e-wallet akan diminta menjawab pertanyaan tunai saat membuka Ubah data.
- Server lama di port 5174 masih menjalankan kode sebelumnya. Mulai ulang supaya perubahan ini terlihat.


## D. Revisi 31 Okt: isian manual sebagai dasar, e-wallet sebagai verifikasi

Cadangan sebelum revisi: `laju-before-verify.tgz` (scratchpad sesi).

### Perubahan
| Bagian | Perubahan |
|---|---|
| Model data | Isian manual = gambaran lengkap (tunai + non-tunai) dan dasar hitungan. E-wallet hanya memverifikasi: per item (pendapatan aplikasi, pemasukan lain, tiap kategori, cicilan) dibandingkan dengan transaksi. Status: cocok / sebagian / tidak lewat e-wallet / isian terlalu kecil / belum diisi. |
| Selisih | Pengguna memilih penjelasannya: tunai, rekening bank, e-wallet lain (menyebut nama e-wallet pilihannya yang belum terhubung), atau perkiraan terlalu tinggi. Bila e-wallet lebih besar: tombol "Sesuaikan isian ke Rp …" atau "Bukan milik saya / bukan pendapatan / bukan cicilan saya". |
| Hitungan | Angka e-wallet = batas bawah yang terbukti (kecuali ditandai "bukan"). Pemasukan lain tidak dinaikkan otomatis. Tanpa e-wallet, isian dipakai apa adanya. Memutus e-wallet tidak mengubah total. |
| Jalur uang | Pertanyaan baru di Profil (wajib): "Uang Anda biasanya masuk & keluar lewat mana saja?" dengan pilihan GoPay, OVO, DANA, ShopeePay, LinkAja, Rekening bank, Tunai, + Lainnya, ditambah saran dari aplikasi yang dipakai. Langkah E-wallet mengurutkan e-wallet pilihan lebih dulu dan menjelaskan jalur yang tidak bisa dihubungkan. |
| Hasil | Kartu "Hasil verifikasi": porsi terverifikasi, jalur uang (✓ terhubung), rincian per item, dan pengecekan (selisih belum dijelaskan, uang di luar e-wallet tanpa sumber, jalur belum terhubung). |
| Data AI | `dataMode`, `moneyChannels`, `verification[]` (isian, e-wallet, status, penjelasan, apakah angka e-wallet dipakai). |
| Data lama | Field `cash` dari versi sebelumnya dihapus otomatis. Pengguna lama diminta mengisi jalur uang saat membuka Ubah data. |

### Loop pengujian
| Percobaan | Skenario | Temuan | Status |
|---|---|---|---|
| 1 | Rina (Surabaya, Gojek + ShopeeFood): pilih jalur uang lewat saran + Tunai + "SeaBank", aktifkan e-wallet, hubungkan GoPay lewat halaman penyedia (OTP), isi pendapatan | Jalur wajib, saran tepat, langkah E-wallet mengurutkan GoPay/ShopeePay. **#1:** kotak verifikasi pendapatan langsung merah "Belum diisi" sebelum pengguna mengetik. **#2:** setelah memilih "bukan pendapatan saya", kotak tetap merah "Belum diisi". | Diperbaiki: pesan netral saat belum diisi. Status "Dikecualikan" |
| 1 (lanj.) | Pengeluaran: status per kategori, pilih alasan, Sesuaikan, tambah utang | **#3:** teks "dibayar / diterima" untuk pengeluaran. **#4:** pilihan "bukan milik saya (titipan)" muncul di cicilan. **#5 (hitungan):** "Sesuaikan" pada Pulsa malah **menurunkan** total pengeluaran, karena titik tengah rentang baru (200rb) di bawah angka e-wallet (284rb). | Diperbaiki: angka e-wallet jadi batas bawah rentang di semua status. Sesuaikan menaikkan batas bawah. Teks per jenis item |
| 2 | Selesai → 12 halaman app, data AI | **#6:** daftar "pengeluaran terbesar" menampilkan angka janggal (Rp1.338.637) karena dihitung dengan aturan lama lalu diskalakan. | Diperbaiki: satu fungsi nilai per kategori. Jumlah per kategori = total persis |
| 3 | Putus e-wallet, data contoh ×3, jalan sampai Hasil hanya lewat Lanjut | Total tidak berubah saat e-wallet diputus (isian = dasar). Tidak ada kotak verifikasi di mode manual. | Lulus |
| 4 | Pengguna lama (format `cash`, tanpa jalur uang) + data e-wallet basi | Migrasi bersih. Data terakhir tetap dipakai. Ubah data meminta jalur uang dengan saran. | Lulus |
| 5 | Pendapatan kosong dengan bonus terisi. Teks langkah E-wallet | Status "isian terlalu kecil" benar (bonus + tip > 0). Judul langkah E-wallet masih bahasa model lama. | Teks diperbarui |
| 6 | Tampilan Pengeluaran di lebar HP | **#7:** label "Tercatat di e-wallet" menempel pada nama kategori. | Diperbaiki (baris sendiri) |
| 7 | Regresi: 13 kelompok invarian (termasuk "Sesuaikan tidak pernah menurunkan total"), skor contoh, 12 halaman app, konsol | Tidak ada temuan baru. | **Berhenti** |

### Revisi lanjutan 31 Okt: Izin data
Halaman Izin data dikembalikan ke format awal atas permintaan pengguna: dua kartu yang bisa dipilih ("Hubungkan e-wallet saya" dan "Saya isi sendiri"), minimal satu wajib dipilih, dan langkah E-wallet hanya muncul bila kartu e-wallet dipilih. Diuji: keduanya / e-wallet saja / manual saja / tidak memilih (Lanjut terkunci). Memutus e-wallet yang sudah terhubung tetap minta konfirmasi. Model verifikasi (isian manual = dasar hitungan) tidak berubah.
Langkah E-wallet sekarang hanya menampilkan e-wallet yang dicentang di Profil (bagian "E-wallet lain" dihapus). Bila tidak ada yang dicentang, muncul tombol "Pilih e-wallet di Profil". Menghapus centang e-wallet yang sudah terhubung meminta konfirmasi lalu memutusnya, supaya tidak ada e-wallet tersembunyi yang tetap ikut dihitung. Diuji: hanya GoPay/ShopeePay tampil. Tanpa e-wallet dicentang. Hapus centang OVO yang terhubung (Batal → tetap, Ya → diputus). E-wallet yang belum terhubung bisa dicentang/lepas tanpa dialog.

## E. Revisi 1 Nov: satu data, satu tempat

Masalah: data yang sama bisa diubah di beberapa tempat (Ubah data, kartu di Tangga, tombol di Dashboard), sehingga driver bingung angka mana yang benar.

| Jenis | Tempat | Isi |
|---|---|---|
| Keadaan (jarang berubah) | **Profil** | Identitas, Cara kerja, Keluarga, Uang & rekening, E-wallet & izin, Proteksi, Keuangan bulanan, Daftar utang, Tujuan. Tiap bagian membuka form bagian itu saja dengan Batal/Simpan |
| Kejadian (uang berpindah) | **+ Catat** | Setor tabungan, Setor ke tujuan, Ambil tabungan (baru), Bayar utang. Konfirmasi + urungkan |
| Jawaban awal | Profil (dikunci) | Kebiasaan mencatat, kebiasaan menabung, tes Rp1 juta, tabungan awal |
| Rencana | Tangga | Rencana setoran harian, rencana keluar minus, tambahan bayar utang, metode, rencana menabung per bulan |

Dihapus: "Perbarui angka bulan ini" di Tangga (angka ganda), tombol Ubah data & Data contoh di header (Data contoh pindah ke Profil dengan konfirmasi), koreksi total tabungan (diganti Ambil tabungan). Pengguna yang sudah selesai dan membuka onboarding.html langsung diarahkan ke Profil.

Diuji: Keuangan bulanan (2 langkah, kartu utang tersembunyi, Simpan + pesan), Batal di Daftar utang (angka kembali), 6 bagian lain (kartu tepat, tanpa password), Identitas tersimpan tanpa password, + Catat setor/ambil/bayar lunas (konfirmasi, skor live), Tangga tanpa form pengubah data, hubungkan DANA dari Profil lewat halaman penyedia (mode ubah bertahan setelah kembali), onboarding.html dialihkan ke Profil, pengguna baru tetap bisa menyelesaikan onboarding. Uji hitungan & skor contoh tidak berubah.

## F. Revisi 2 Nov: penekanan visual, bahasa EN, panel bawah

| Permintaan | Yang dikerjakan |
|---|---|
| Tombol di kanan atas seperti dulu | Data contoh dan tombol bahasa kembali di header kanan atas |
| Panel bawah selalu terlihat | Penyebab: di browser HP, bilah alamat yang muncul saat menggulir ke atas memotong 24px bagian bawah layar, jadi panel tertutup sebagian. Sekarang panel (dan bilah Lanjut di onboarding) diangkat sebesar selisih itu lewat `visualViewport` (`core.js`, variabel CSS `--vv-gap`). Saat keyboard terbuka panel tetap di belakang keyboard |
| Penanda di tiap bagian Profil | Ikon berwarna per bagian |
| Setelah satu bagian selesai, lanjut ke bagian berikutnya | Tombol "Simpan & lanjut" membuka bagian Profil berikutnya. Tombol Selesai di header untuk berhenti kapan saja |
| Bahasa EN / ID | Tombol ID / EN di header semua halaman. Teks sumber tetap bahasa Indonesia. `i18n.js` menerjemahkan teks yang tampil (termasuk yang muncul belakangan) memakai kamus `i18n-en.js` (sekitar 1.000 entri + pola untuk teks berisi nama). Angka, uang, dan tanggal ikut diformat: "Rp6,7 jt" jadi "Rp6.7M", "Okt" jadi "Oct". Pilihan bahasa disimpan di perangkat |
| Rapor lebih mudah dibaca | Cincin skor, perubahan sejak awal, 3 angka utama, Fokus 30 hari berupa kartu aksi bernomor, kondisi baik dan lemah dengan bar poin, tabel awal vs sekarang dengan panah |

Diuji: semua halaman aplikasi (3 data contoh, dengan dan tanpa e-wallet), semua langkah onboarding, 9 bagian Profil, dialog Catat, dan landing dalam mode EN. Pemindai teks sisa tidak menemukan teks Indonesia selain nama merek dan deskripsi transaksi dari e-wallet. Panel bawah diuji di layar 375x812 dengan bilah alamat: tepi bawah panel tepat di tepi layar. Uji hitungan dan skor contoh tidak berubah (25, 50, 93).

Menambah teks baru: tulis dalam bahasa Indonesia seperti biasa, lalu tambahkan terjemahannya di `public/i18n-en.js`. Angka ditulis sebagai `{0}`, `{1}`. Teks yang belum ada di kamus tetap tampil dalam bahasa Indonesia, tidak error.

## G. Revisi 3 Nov: skenario data Uang & rekening

Dari dokumen tim "Semua Skenario Data Uang dan Rekening" (Paket 1 + 2 yang dipilih Dickson). Rincian aturan ada di `docs/metodologi.md` bagian 6b.

| Bagian | Perubahan |
|---|---|
| Server dan simulator | Riwayat 6 bulan per dompet (berbeda per dompet: GoPay, OVO, rekening bank 6 bulan, ShopeePay 4, DANA 3, LinkAja 2). Ada transaksi yang tidak dikenali. Transfer dari orang dipisah dari uang masuk lain. Ringkasan per 30 hari (`history`) untuk angka bank dan tier. OTP salah 3 kali kembali ke Laju dengan pesan |
| Angka dan tier | Pendapatan yang diakui bank terpisah dari isian panduan. Tier 0 sampai 3 dengan alasan dan cara naik. Langkah 8 memakai tier sebagai syarat |
| Profil | Kartu "Status data untuk bank" di atas daftar bagian |
| Uang & rekening | Rekening bank bisa dihubungkan. Dompet "Lainnya" ditanya apakah pencairan masuk ke sana. Nama yang salah ketik dikenali (misal "gopey" jadi GoPay) |
| Langkah E-wallet | Peringatan "Pencairan Gojek biasanya masuk ke GoPay" kalau pencairan aplikasi tidak terlihat |
| Daftar utang | Status kendaraan Kredit tanpa cicilan: pengingat dengan tombol tambah cicilan atau ubah jadi lunas |

Diuji: hanya manual (Tier 3), OVO saja dari OVO + DANA (Tier 2, DANA belum terhubung, pencairan Maxim), keduanya terhubung (Tier 1), dompet "JOJO" dengan pencairan (Tier 2), "gopey", status Kredit, OTP salah 3 kali, rekening bank lewat simulator, mode EN. Uji hitungan dan skor contoh tetap (25, 50, 93).


## H. Revisi 4 Nov: langkah E-wallet

| Bagian | Perubahan |
|---|---|
| Tombol Ubah | Langsung ke kartu "Uang & rekening" di Profil (digulir ke kartunya dan diberi sorotan sebentar). Dari mode ubah Profil, membuka bagian Uang & rekening |
| Peringatan dihapus | "Pencairan Grab biasanya masuk ke OVO" dan kotak "1 dari 2 e-wallet terhubung" tidak tampil lagi di langkah ini. Kartu OVO sendiri sudah punya tombol Hubungkan. Penanda "E-wallet 1/2" di deretan langkah tetap ada |
| Kartu "Tidak bisa dihubungkan" | Semua jalur yang tidak bisa dihubungkan (dompet Lainnya seperti JOJO, tunai) dikumpulkan di satu kartu, dengan jawaban apakah pencairan masuk ke sana. Aplikasi yang pencairannya tidak terlihat di e-wallet mana pun ditulis di kartu yang sama |
| Rincian transaksi | Kalender 30 hari. Tiap tanggal menampilkan uang masuk (makin gelap makin besar, garis merah kalau keluar lebih besar dari masuk). Arahkan kursor untuk sisa bersih. Ketuk tanggal untuk rincian hari itu: uang masuk, uang keluar, sisa bersih, sumber uang masuk, lalu pengeluaran per kategori. Ketuk lagi untuk total 30 hari. Panah keyboard pindah tanggal |
| Server | Ringkasan per dompet sekarang membawa `dailyIn` (uang masuk per hari per aplikasi) dan `dailyOut` (pengeluaran per hari per kategori, cicilan = `utang`). Dompet yang disinkron sebelum revisi ini tetap tampil, dengan pesan untuk sinkron ulang supaya pengeluaran harian terlihat |

Diuji di layar 375x812, ID dan EN: GoPay terhubung lewat simulator, OVO belum, JOJO (pencairan masuk) dan tunai. Total harian cocok dengan total 30 hari. Uji hitungan dan skor contoh tetap.

## I. Revisi 4 Nov (lanjutan)

| Bagian | Perubahan |
|---|---|
| Kalender rincian | Rincian tanggal sekarang berupa hitungan: Penghasilan (per sumber) dikurangi Pengeluaran (per kategori) sama dengan Sisa bersih, angka yang sama dengan yang muncul saat kursor diarahkan ke tanggal itu. E-wallet yang disinkron sebelum ada data harian disinkron ulang otomatis sekali per sesi. Kalau datanya tidak bisa disinkron ulang (izin berakhir), kartu menyebut e-wallet mana yang perlu dihubungkan lagi |
| Izin data | Isian manual selalu dipakai, jadi pilihan "Saya isi sendiri" dihapus. Pengguna hanya menjawab Ya atau Tidak untuk menghubungkan e-wallet, lalu mencentang persetujuan. Data lama yang belum pernah memilih apa pun kembali ke pertanyaan ini |
| Pendapatan | Kartu "Pendapatan harian seminggu terakhir" jadi "Pendapatan harian sebulan terakhir" (rata-rata, hari paling ramai, hari paling sepi) |

Diuji di layar 375x812, ID dan EN: pilih Tidak lalu Ya, persetujuan, GoPay lewat simulator, hari dengan sisa minus (Rp177.900 dikurangi Rp226.300 sama dengan −Rp48.400, cocok dengan angka saat kursor diarahkan), e-wallet dengan data lama. Uji hitungan dan skor contoh tetap (25, 50, 93).

## J. Revisi 4 Nov: pengeluaran diketik

| Bagian | Perubahan |
|---|---|
| Langkah Pengeluaran | Slider diganti dua kotak rupiah per kategori: paling sedikit dan paling banyak per bulan. Kosong berarti tidak dihitung, jadi saklar per kategori dihapus. Contoh angka umum tampil sebagai "misal: ...". Makan & minum dan Bensin wajib diisi. Paling sedikit boleh kosong (dianggap Rp0). Kalau paling banyak kosong padahal paling sedikit diisi, atau paling sedikit lebih besar dari paling banyak, Lanjut tertahan dengan pesan |
| Data lama | Rentang tetap dipakai apa adanya. Kategori yang dulu dimatikan jadi kosong |
| Hitungan | Tidak berubah: titik tengah rentang, dengan batas bawah dari e-wallet |

Diuji di layar 375x812: data lama, mengetik dua angka (perkiraan terendah dan tertinggi ikut berubah), paling banyak kosong, angka terbalik, mode EN. Uji hitungan dan skor contoh tetap (25, 50, 93).

## K. Revisi 4 Nov: rincian skor di Tangga

| Bagian | Perubahan |
|---|---|
| Halaman Tangga | Kartu link "Rincian skor kesehatan" diganti rincian skor yang langsung tampil di bawah daftar langkah. Poin tiap pilar tidak lagi disembunyikan |
| Komponen yang belum penuh | Bisa diketuk. Tiap komponen menampilkan saran singkat dan tujuan perbaikannya: kartu Profil yang harus diisi (Keuangan bulanan, Tabungan, Daftar utang, Proteksi, Uang & rekening, Tujuan), atau Catat untuk Kebiasaan mencatat dan Dana darurat |
| Bagian Tabungan di Profil | Sekarang juga membuka kebiasaan menabung, setoran per bulan, dan tes guncangan, supaya komponen Tes guncangan dan Menabung rutin punya tempat untuk diubah |
| Halaman Rincian skor | Sama: selalu terbuka dan bisa diketuk. Langkah Hasil di onboarding tidak berubah |

Diuji di layar 375x812, ID dan EN, data contoh Andi: 12 komponen yang belum penuh punya tujuan yang benar, Dana darurat membuka dialog Setor dana darurat, Tabungan membuka tiga kartu yang benar. Uji hitungan dan skor contoh tetap (25, 50, 93).

## L. Revisi 5 Nov: dua jalur data, isi otomatis, penjaga coverage

| Bagian | Perubahan |
|---|---|
| Izin data | Jadi dua jalur yang saling meniadakan: Hubungkan e-wallet (disarankan) atau Isi manual. Tidak ada lagi kondisi memakai keduanya |
| Isi otomatis | Begitu sampai langkah Pendapatan, kolom diisi sekali dari transaksi terbukti: pendapatan per aplikasi, pemasukan lain, rata-rata harian, hari ramai, hari sepi, dan tiap kategori pengeluaran. Setelah itu angka milik pengguna dan bebas diedit. `autofillFromVerified()` di `core.js`, penanda `S.autofill` |
| Penjaga coverage | Kartu "Pendapatan yang terbukti" dan "Pengeluaran yang terbukti" di langkah Pendapatan dan Pengeluaran. Memakai `shareIn` dan `shareOut` yang sudah ada tapi belum pernah ditampilkan. Di atas 80% Cocok, 50 sampai 80% Sebagian, di bawah 50% Jauh di atas. Angkanya berubah seketika saat pengguna mengetik |
| Kamus EN | 24 entri baru. Dua kunci ganda lama dibersihkan |

Diuji di layar 375x812, ID dan EN: GoPay lewat simulator mengisi 1 aplikasi, 10 kategori, dan angka harian dari 92 transaksi. Isian dinaikkan 10 kali turun ke 11% berlabel Jauh di atas, dinaikkan sedikit 70% Sebagian, dikembalikan 100% Cocok. Tidak ada teks Indonesia tersisa di mode EN dan tidak ada error di konsol. Uji hitungan dan skor contoh tetap (25, 50, 93).

Belum dikerjakan: langkah Upload PDF untuk jalur manual.

## M. Revisi 5 Nov: langkah Dokumen untuk jalur manual

| Bagian | Perubahan |
|---|---|
| Langkah 4 | Ada di kedua jalur. Jalur e-wallet menampilkan "E-wallet", jalur manual menampilkan "Dokumen". Label pil ikut berganti lewat `stepLabel()` |
| Unggah e statement | Pilih PDF mutasi, atau "Pakai contoh" saat mode simulasi. Hasilnya tampil sebagai kartu: uang masuk, pengeluaran, jumlah transaksi, periode, saldo akhir. Bisa unggah bulan berikutnya (baris kembar tidak dihitung dua kali) dan bisa dihapus |
| Boleh dilewati | Tombol Lanjut tidak pernah tertahan di langkah Dokumen |
| Pembaca PDF | `openfinance/statement.py` diambil dari branch grace, hanya file itu. Server, tampilan, dan sisanya ditulis sendiri |
| Server | `POST /api/statements/upload`, `POST /api/statements/sample`, `DELETE /api/statements?name=`. E statement disajikan seperti dompet (`source: "statement"`) supaya hitungan di browser tidak perlu jalur khusus. Periode diambil dari isi dokumen, bukan tanggal hari ini |
| Bukti yang sah | `isEvidence()` di `core.js`: e-wallet terhubung hanya dihitung kalau jalur e-wallet yang dipilih, e statement selalu dihitung. Jadi pengisian otomatis dan coverage juga jalan di jalur manual |
| Tombol dibuang | "Lanjut tanpa e-wallet" di langkah E-wallet dihapus, karena jalur sudah dipilih di Izin data. Dialog "Mau hubungkan e-wallet?" ikut dihapus |
| Isi ulang | Tombol "Isi ulang dari transaksi" di kartu coverage, untuk dipakai setelah mengunggah dokumen bulan berikutnya |

Diuji di layar 375x812, ID dan EN: jalur manual dengan PDF contoh BCA terbaca 38 transaksi, periode dan saldo akhir benar, kolom Pendapatan dan Pengeluaran terisi sendiri. Isian dinaikkan 10 kali turun ke 9%. Jalur e-wallet tanpa dompet tertahan dengan pesan yang benar, dan dokumen saja tidak meloloskannya. Tidak ada teks Indonesia tersisa di mode EN dan tidak ada error di konsol. Uji hitungan dan skor contoh tetap (25, 50, 93).

Catatan untuk penggabungan: huruf bagian L dan M di sini bentrok dengan L, M, N di branch grace. Perlu dinomori ulang saat digabung.

## N. Revisi 5 Nov: mode contoh supaya tautan jalan tanpa server

Masalahnya: tautan GitHub Pages hanya menyajikan berkas, tidak bisa menjalankan Python, jadi setiap
`/api/...` gagal dan teman yang membuka tautan diminta menjalankan `python server.py`.

| Bagian | Perubahan |
|---|---|
| Data contoh | `tools/buat-data-contoh.py` membuat `public/demo-data.json` (44 KB): ringkasan 6 dompet plus satu e statement, dihitung oleh `MockProvider` dan `summarize` yang sama dengan mode server |
| Mesin mode contoh | `public/demo-mode.js` melayani config, daftar dompet, link, sync, putus, dan e statement contoh dari berkas itu plus localStorage |
| Jalur mundur di `api()` | Kalau jawaban bukan dari API Laju (mis. halaman 404 hosting statis), permintaan dialihkan ke mode contoh. Error API sungguhan tetap diteruskan apa adanya. Setelah sekali terbukti tanpa server, panggilan berikutnya langsung ke mode contoh |
| Halaman penyedia | `simulasi-penyedia.html?demo=1` kembali langsung ke onboarding tanpa singgah ke callback server. Pemeriksaan open redirect tetap berlaku di mode server |
| Tanda di layar | Spanduk "Mode contoh" di langkah E-wallet. Di langkah Dokumen, pemilih berkas disembunyikan dan diganti penjelasan plus tombol Pakai contoh |
| Perbaikan kecil | `e.submitter` di halaman penyedia bisa kosong saat form dikirim lewat skrip, sekarang dijaga |

Diuji dengan `python -m http.server` (hanya berkas, tanpa API, persis seperti GitHub Pages), layar 375x812:
GoPay terhubung lewat halaman penyedia sampai tuntas, 104 transaksi, kolom Pendapatan dan Pengeluaran
terisi sendiri, coverage 100%. Jalur dokumen: tombol Pakai contoh menghasilkan JOJO 39 transaksi.
Halaman aplikasi dan tombol Data contoh juga jalan. Indikator header tetap LIVE karena halamannya memang tersaji.
Uji hitungan dan skor contoh tetap (25, 50, 93).

## O. Revisi 5 Nov: PDF contoh dan perbandingan angka

| Bagian | Perubahan |
|---|---|
| PDF contoh | `tools/buat-data-contoh.py` juga membuat `public/contoh-estatement-jojo.pdf` (1 KB, 39 transaksi). Di langkah Dokumen ada tautan "Unduh PDF contoh", jadi alur unggah bisa dicoba sungguhan tanpa punya mutasi sendiri. Tautan ini disembunyikan di mode contoh karena di sana PDF asli memang belum bisa dibaca |
| Kartu perbandingan | Kartu "Pendapatan yang terbukti" dan "Pengeluaran yang terbukti" kini menampilkan tiga baris angka: tercatat di e-wallet atau dokumen, menurut isian pengguna, dan selisihnya. Label sumbernya mengikuti bukti yang ada (`evidenceLabel()`). Selisih yang belum terlihat di transaksi diberi warna |
| Kamus EN | 10 entri baru |

Diuji di layar 375x812, ID dan EN, dengan server berjalan: `contoh-estatement-jojo.pdf` diunduh lalu diunggah lewat endpoint yang sama dengan tombol pilih berkas, terbaca 39 transaksi. Kartu Pendapatan menampilkan Rp1.060.000 dari dokumen vs Rp1.065.000 isian, selisih Rp5.000, 100% terbukti. Isian dinaikkan jadi Rp7.794.000 membuat selisih Rp6.734.000 dan turun ke 14% berlabel Jauh di atas. Kartu Pengeluaran berperilaku sama. Tidak ada teks Indonesia tersisa di mode EN dan tidak ada error di konsol. Uji hitungan dan skor contoh tetap (25, 50, 93).

## P. Revisi 5 Nov: landasan milestone v1

Mengganti tangga 8 langkah dengan Step 0 sampai 5, sesuai spesifikasi tim. `openfinance/` dan `server.py` tidak disentuh.

| Bagian | Perubahan |
|---|---|
| Step | Enam step: Data rapi, Keluar dari minus, Bantalan Rp3 jt + lunasi utang bunga tinggi, Dana darurat + tujuan wajib, Investasi 10% tiga bulan, Tujuan tumbuh. Konstanta ambang ada di `MILESTONE` |
| Mesin status | Enam status: `terkunci`, `aktif`, `selesai`, `isi_ulang`, `dijeda`, `dibuka_lagi`. Masa bertahan 28 hari untuk Step 2 dan 3, jendela kemunduran 30 hari. Riwayat perubahan status disimpan di `S.milestones.stLog` |
| Utang bunga tinggi | Jadi syarat selesai Step 2, bukan jalur terpisah. `effectiveAPR()` menghitung bunga efektif dari pokok, cicilan, dan tenor lewat bisection. Pinjol, paylater, rentenir, kartu kredit otomatis tinggi. Keluarga dan teman tidak pernah tinggi tapi wajib punya jadwal bayar. Data kurang dianggap tinggi |
| Uang | `savings` jadi uang beku (bantalan + dana darurat, satu saldo). Tambahan `growth` untuk uang tumbuh dan `goalData` untuk tabungan tiap tujuan |
| Tujuan | Dua kelompok: wajib (mulai Step 3, porsi maksimal 30% sisa uang) dan tumbuh (mulai Step 5). "Lunasi utang" dan "Punya dana darurat" dilepas dari daftar karena kini jadi Step 2 dan Step 3 |
| Pembagian sisa uang | Mengikuti step yang sedang dikerjakan: 70/30 ke utang dan bantalan selama ada utang bunga tinggi, 50% ke uang beku saat isi ulang, 10% pendapatan ke uang tumbuh di Step 4 |
| BPJS | Dihapus dari onboarding, milestone, dan skor. 11 poinnya dibagi ke komponen lain di pilar yang sama: Asuransi 2 jadi 5, Rekening bank 4 jadi 7, Tujuan 4 jadi 7, Simpanan aman 4 jadi 6. Pilar tetap 25 poin |
| Catat | Pengambilan uang beku wajib memilih alasan dari tujuh pilihan. Tambahan setor dan ambil uang tumbuh, setor per tujuan, dan tombol Mode Sakit |
| Onboarding | Kartu BPJS dihapus, jumlah tanggungan wajib diisi, utang dapat kolom cicilan dan jadwal bayar, tujuan dapat nominal dan tenggat sendiri, peringatan kalau tenggat tujuan wajib jatuh sebelum perkiraan sampai Step 3 |
| Dokumen | `metodologi.md` bagian 3 dan 4 ditulis ulang, tabel skor disesuaikan. `ai-data-contract.md` memuat status enam step dan kelompok tujuan |
| Kamus EN | 80 entri dan 3 aturan baru |

Diuji: keempat profil di bagian 10 cocok persis lewat simulasi bulanan (Budi 12 dan 5 bulan, Andi 7 dan 7, Sari 3 dan 13, Sari dengan tujuan wajib 30% jadi 19). Lima uji perilaku juga lolos: bantalan dipakai untuk motor rusak tetap selesai dan ditandai isi ulang, pinjol baru membuat Step 2 dibuka lagi dengan Step 3 sampai 5 dijeda dan saldo utuh, Mode Sakit menahan kemunduran Step 1, setoran 8% di bulan kedua memutus hitungan beruntun, dan bunga contoh 1 juta dengan cicilan 600 ribu tenor 2 bulan terbaca 13% per bulan. Diuji juga di layar 375x812 dalam bahasa Indonesia dan Inggris, tanpa teks Indonesia tersisa di mode EN dan tanpa error di konsol.

Skor contoh berubah jadi 25 ke 22, 50 ke 52, dan 93 ke 90, karena 11 poin BPJS dibagi ulang.

Belum dikerjakan: pemindahan dana saat ganti tujuan (`GOAL_SWITCH_MIN_DAYS` sudah ada sebagai konstanta tapi belum dipakai), dan proyeksi tenggat tujuan tumbuh masih berupa peringatan sederhana, belum tawaran tiga pilihan.

## Q. Revisi 5 Nov: langkah E-wallet jadi ketat

| Bagian | Perubahan |
|---|---|
| Syarat lanjut | Semua e-wallet yang dipilih pengguna di Profil wajib terhubung, bukan lagi minimal satu. Tombol Lanjut tertahan selama masih ada yang belum, dan petunjuk di bawah menyebut namanya |
| Judul langkah | "Hubungkan semua e-wallet Anda". Penjelasannya menyebut mana yang belum terhubung, atau memastikan semuanya sudah |
| Tunai | Dihapus dari langkah ini. Tunai bukan e-wallet, jadi tidak lagi tampil di kartu "Tidak bisa dihubungkan". Dompet buatan sendiri seperti JOJO tetap ada di sana karena memang jalur uang yang tidak bisa dihubungkan |
| Teks | Pesan "Bisa lanjut, N e-wallet belum terhubung" dihapus karena sekarang tidak boleh lanjut |

Diuji di layar 375x812, ID dan EN, dengan pilihan GoPay, OVO, tunai, dan JOJO di Profil: tanpa dompet terhubung Lanjut tertahan dan menyebut GoPay dan OVO, setelah GoPay saja tetap tertahan dan menyebut OVO, setelah keduanya terhubung baru bisa lanjut. Tunai tidak muncul di langkah ini, JOJO tetap muncul. Uji hitungan dan uji penerimaan milestone tetap lolos.

## R. Revisi 5 Nov: rekening bank lewat bukti, bukan centang

| Bagian | Perubahan |
|---|---|
| Profil | Saklar "Punya rekening bank aktif" dihapus. Pilihan "Tunai" dan "Rekening bank" dihapus dari daftar jalur uang. Tersisa lima e-wallet yang bisa dihubungkan plus dompet buatan sendiri |
| Skor | Komponen "Rekening bank" (7 poin) tidak lagi dari centang sendiri, melainkan dari bukti: rekening bank terhubung atau e statement sudah diunggah (`hasBankEvidence()`). Nilainya jadi "Terbukti" atau "Belum ada bukti" |
| Langkah E-wallet | Tiap dompet yang tidak terintegrasi (mis. JOJO, SeaBank) kini punya kartunya sendiri dengan unggah e statement PDF, Pakai contoh saat simulasi, Unggah bulan berikutnya, dan hapus. Kartu yang sudah terbaca menampilkan pencairan, pengeluaran, saldo akhir, dan garis riwayat x dari 6 bulan |
| Kotak statistik | Dokumen tidak lagi dihitung sebagai e-wallet terhubung. Sekarang tertulis "0 / 1 terhubung · + 2 e statement" |
| Migrasi | "tunai" dan "bank" dibuang dari `profile.channels`, `hasBank` dihapus. Label lama tetap terbaca lewat `LEGACY_CHANNEL` |

Dari branch grace hanya diambil pembaca PDF `openfinance/statement.py` (sudah diambil sebelumnya). Tampilan kartu dan pengirimannya ditulis sendiri memakai endpoint yang sudah ada.

Diuji di layar 375x812, ID dan EN: Profil tidak lagi punya saklar rekening bank maupun pilihan Tunai dan Rekening bank. JOJO lewat Pakai contoh terbaca 36 transaksi, SeaBank lewat unggah PDF sungguhan terbaca 39 transaksi, dan setelahnya komponen skor Rekening bank berubah jadi Terbukti. Uji invarian dan kesepuluh uji penerimaan milestone tetap lolos.

## S. Revisi 5 Nov (Grace, branch dickson): pilihan tujuan dan peringatan dompet pencairan

| Bagian | Perubahan |
|---|---|
| Pilihan tujuan (`GOALS` di `core.js`) | "Modal menikah, tanggal sudah ditentukan", "Modal menikah, tanggal belum ada", dan "Kendaraan untuk kerja" dihapus. Sisa: biaya pendidikan awal, kendaraan pribadi, modal usaha sampingan, beli rumah. Data lama yang memilih tujuan itu dibersihkan oleh `migrate` (tujuan yang tidak ada di `GOALS` dibuang) |
| Label Wajib dan Tumbuh | Tidak lagi tampil di pilihan tujuan dan di isian nominal per tujuan (langkah Ketahanan). Kelompoknya tetap dipakai di hitungan Step 3 dan Step 5 |
| Saran dompet di Profil | Teks "Saran dari aplikasi Anda: GoPay, OVO" yang langsung muncul dihapus. Gantinya, saat menekan Lanjut di Profil, kalau ada aplikasi yang biasanya cair ke dompet yang tidak dipilih (Gojek ke GoPay, ShopeeFood dan SPX ke ShopeePay, Grab ke OVO, Maxim ke DANA), muncul peringatan dengan dua pilihan: "Tambahkan …" atau "Lanjut saja". Tidak wajib. Kalau ditutup tanpa memilih, tetap di Profil. Setelah "Lanjut saja", peringatan tidak muncul lagi untuk pilihan yang sama (`payoutWalletCheck` di `onboarding.js`) |
| Dialog konfirmasi | Menutup dialog (Esc atau klik di luar) sekarang berarti "bukan pilihan", bukan "batal". Dialog lain tetap memperlakukannya sebagai batal |

Diuji di layar 390x900, ID dan EN: Gojek + Grab dengan ShopeePay saja memunculkan peringatan GoPay dan OVO; Esc tetap di Profil; Tambahkan menambah GoPay dan OVO lalu Lanjut tanpa peringatan; Lanjut saja pindah ke Izin data tanpa mengubah dompet. Pilihan tujuan tinggal empat, tanpa label. Unggah e statement di langkah Dokumen (server berjalan): PDF contoh JOJO terbaca 39 transaksi.

**Tambahan S: kotak "Sebagian, sisa lewat mana?" dihapus.** Di langkah Pendapatan dan Pengeluaran, kotak verifikasi dengan status Sebagian dan Tidak di e-wallet (isian lebih besar dari e-wallet, dengan pilihan Tunai, Rekening bank, E-wallet lain, Perkiraan kebesaran) tidak ditampilkan lagi (`vfShown` di `onboarding.js`). Kotak untuk isian yang lebih kecil dari e-wallet atau belum diisi tetap tampil, karena itu yang mengubah angka. Pengecekan "N selisih belum dijelaskan" ikut dihapus karena tidak ada lagi tempat menjawabnya.

## T. Revisi 5 Nov (Grace, branch dickson): pindahan antar akun sendiri harus ada pasangannya

Sebelumnya, transaksi seperti "Tarik saldo ke rekening BRI" atau "Top up dari OVO" langsung dianggap pindahan antar akun sendiri hanya dari teksnya, jadi tidak dihitung sebagai pengeluaran atau pemasukan. Masalahnya, teks hanya bilang uangnya lewat OVO, bukan OVO milik siapa. Bisa saja itu bayar utang ke orang lain atau kiriman dari teman.

| Bagian | Perubahan |
|---|---|
| Aturan pindahan (`pair_transfers` di `openfinance/categorize.py`) | Transaksi baru dianggap pindahan antar akun sendiri kalau akun satunya sudah terdaftar di Laju **dan** pasangannya ketemu di akun itu: arah berlawanan, selisih jumlah 0 sampai Rp10.000 (selisihnya dianggap biaya admin), salah satu keterangan menyebut akun satunya, dan uang masuk tercatat 0 sampai 1 hari kemudian antar e-wallet, atau 0 sampai 3 hari kemudian kalau melibatkan rekening bank atau e statement |
| Yang tidak ada pasangannya | Uang keluar dihitung sebagai pengeluaran kategori "Ke rekening atau dompet lain". Uang masuk dihitung sebagai uang masuk lain, bukan pendapatan aplikasi |
| Biaya admin | Selisih jumlah pada pasangan dicatat sebagai pengeluaran "Biaya admin & transfer" |
| Server (`recompute` di `server.py`) | Setiap sinkron e-wallet, unggah atau hapus e statement, dan hapus e-wallet, semua akun pengguna dihitung ulang bersama. Respons membawa ringkasan akun lain yang ikut berubah, dan halaman onboarding memperbaruinya |
| Simulasi (`openfinance/mock.py`) | Tarik saldo dan top up dompet kini punya jadwal tetap per dompet, dan rekening bank simulasi membuat pasangannya ("Transfer masuk dari GoPay", "Top up OVO 08xx") untuk dompet yang terhubung. Saat dompet baru dihubungkan, rekening bank simulasi dibuat ulang supaya pasangannya ikut ada |
| Data contoh (`public/demo-data.json`) | Dibuat ulang dengan aturan baru. Mode demo statis (tanpa server) tidak bisa memasangkan, jadi tarik saldo di sana tercatat sebagai pengeluaran |

Kenapa ada batas hari: antar e-wallet biasanya masuk di hari yang sama, paling lambat besoknya kalau lewat tengah malam. Transfer ke atau dari bank bisa baru tercatat hari kerja berikutnya, misalnya lewat akhir pekan, jadi diberi 3 hari. Tanpa batas, dua transaksi yang kebetulan sama jumlahnya tapi berjarak berminggu minggu bisa salah dipasangkan.

Diuji lewat server: GoPay saja, tarik saldo Rp906 rb tercatat sebagai pengeluaran "Ke rekening atau dompet lain". Setelah rekening bank terhubung, semuanya berpasangan (GoPay keluar Rp906 rb, bank masuk Rp901 rb, admin Rp5 rb), dan ringkasan GoPay di onboarding ikut turun tanpa sinkron ulang. Setelah OVO ditambah, pasangan OVO ikut muncul di rekening bank. Hapus rekening bank mengembalikan tarik saldo GoPay dan OVO jadi pengeluaran. Tidak ada galat di konsol.

## U. Revisi 5 Nov (Grace, branch dickson): nomor HP tiap e-wallet

| Bagian | Perubahan |
|---|---|
| Izin data | Setelah memilih "Hubungkan e-wallet", muncul kartu "Nomor HP tiap e-wallet" untuk setiap e-wallet yang dipilih di Profil. Isinya diambil dari nomor akun Laju dan bisa diganti. Wajib minimal 9 digit untuk lanjut (`walletPhoneCard`, `S.consent.walletPhones`) |
| Menghubungkan | Nomor dikirim ke halaman penyedia, jadi pengguna langsung masuk ke langkah OTP. Masih bisa "Ganti nomor" di sana |
| Pengecekan nomor | Nomor akun yang benar benar terhubung (dikembalikan penyedia) harus sama dengan isian Izin data. Kalau beda, penghubungan dibatalkan dan muncul pesan "Nomor OVO yang dihubungkan (akhiran 8888) beda dengan nomor yang Anda isi di Izin data". Kalau penyedia tidak mengembalikan nomor, pengecekan dilewati |
| Pindahan antar akun (`pair_transfers`) | Nomor terverifikasi dipakai lebih dulu. Keterangan yang menyebut nomor lengkap milik akun terdaftar, termasuk di dalam nomor virtual account top up (kode bank + nomor HP), langsung dianggap pindahan sendiri. Keterangan yang menyebut nomor lengkap milik orang lain tidak pernah dianggap pindahan, walaupun jumlah dan tanggalnya kebetulan cocok. Nomor yang disamarkan (0812****7890) hanya boleh dipasangkan kalau tidak bertentangan dengan nomor akun. Tanpa nomor, aturan pasangan di bagian T tetap berlaku |
| Simulasi | Top up dari rekening ke e-wallet kini tertulis dengan nomor VA lengkap, nomor disamarkan, atau tanpa nomor. Ada juga top up sesekali ke OVO orang lain. Contoh e statement (Pakai contoh) kini memuat sisi rekening dari tarik saldo dan top up di e-wallet yang terhubung, supaya pencocokan bisa didemokan lewat layar |
| Mode contoh tanpa server | Nomor ikut terisi di halaman penyedia dan nomor yang beda juga ditolak |

Diuji lewat server dan browser, ID dan EN: nomor GoPay dan OVO terisi dari nomor akun; halaman penyedia langsung ke OTP; OVO dihubungkan dengan nomor lain ditolak dengan pesan di atas. Uji pasangan: top up ke OVO bernomor orang lain dengan jumlah dan tanggal sama persis dengan top up masuk di OVO pengguna tetap dihitung pengeluaran; top up ke nomor OVO pengguna tanpa pasangan tetap dianggap pindahan; nomor samar yang tidak cocok tidak dipasangkan. Contoh e statement SeaBank setelah GoPay dan OVO terhubung: transfer masuk dan top up berpasangan, top up ke OVO orang lain tetap tercatat "Ke rekening atau dompet lain".

## V. Perbaikan 5 Nov (Grace, branch dickson): e statement lama muncul lagi setelah reset

Gejala: setelah mencoba e statement Jago lalu reset total, kartu Jago muncul lagi di langkah E-wallet walaupun Jago tidak dipilih di Profil, dan angkanya ikut terhitung.

| Penyebab | Perbaikan |
|---|---|
| Reset menghapus data di server lewat `/api/wallets/<id>`. Untuk e statement (id `c:Jago`) alamat itu tidak dikenal server, jadi e statement tetap tersimpan dan terbaca lagi setelah reset | Server punya `DELETE /api/wallets` yang menghapus semua e-wallet dan e statement pengguna sekaligus, dan tombol reset memakainya (`muat-ulang.js`) |
| "Isi contoh" memasukkan semua akun yang ada, termasuk e statement sisa, ke pilihan dompet di Profil tanpa terlihat sebagai pilihan | Hanya e-wallet bawaan yang ikut dipilih. Data lama dibersihkan saat dibuka: dompet buatan sendiri hanya terpilih kalau namanya ada di daftar opsi |
| E statement di server yang tidak dikenal perangkat ini tetap dipakai | Dianggap sisa data lama, lalu dihapus dari server dan tidak dihitung (`mergeServerWallets`) |
| Menghapus dompet buatan sendiri (×) atau membatalkan pilihannya tidak menghapus e statement-nya di server, dan "Isi manual" ikut memanggil alamat yang salah | Semua penghapusan memakai `dropRemote`, yang memilih alamat yang benar untuk e-wallet dan e statement. Memilih "Isi manual" hanya memutus e-wallet, e statement tetap dipakai di langkah Dokumen |

Diuji di browser: e statement Jago dibuat, reset, server kosong. E statement yang tertinggal di server tanpa ada di perangkat dihapus saat onboarding dibuka. Pilihan `c:Jago` tanpa opsi Jago dibuang. Hapus opsi Jago (×) menghapus e statement-nya di perangkat dan di server. Tidak ada galat di konsol.
