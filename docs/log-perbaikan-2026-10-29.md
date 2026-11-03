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
