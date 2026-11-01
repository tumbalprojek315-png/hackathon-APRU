# Log perbaikan & pengujian — 29 & 31 Okt 2026

> **Catatan 31 Okt:** model "e-wallet + tunai" di bagian A diganti dengan model **isian manual + verifikasi e-wallet** (lihat bagian D). Perbaikan lain di bagian A–C tetap berlaku.

Cadangan sebelum perubahan: `laju-before-sources.tgz` (scratchpad sesi).
Pengujian dijalankan di server uji port 5175 (port 5174 dipakai server milik pengguna).

## A. Perbaikan dari daftar bug

| # | Masalah | Perbaikan |
|---|---|---|
| 1 | E-wallet dan isian manual saling bersaing (pilih salah satu, batas 15%) | Model baru **e-wallet + tunai**. Isian manual wajib. Dengan e-wallet, pengguna hanya mengisi bagian yang tidak lewat e-wallet. Pilihan "pakai angka transaksi / angka saya" dihapus. |
| 2 | Centang "Isi manual" tidak berpengaruh | Pilihan dihapus. Kartu "Isian manual — selalu dipakai" + "Tambahkan e-wallet (opsional)". |
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
| 2 | Budi kembali lewat Ubah data, aktifkan e-wallet, hubungkan GoPay (halaman penyedia simulasi, OTP), isi tunai | **Gap #2:** peringatan cicilan hanya muncul bila daftar utang kosong; Budi mencatat Pinjol Rp250rb/bln padahal e-wallet bayar Rp1,1 jt/bln. **Bug #3:** "Isi dari transaksi" melupakan Maxim (tidak cair ke GoPay). **Bug #4 (hitungan):** cicilan yang dibayar lewat e-wallet tidak masuk arus kas sama sekali, sehingga sisa terlihat ±Rp850rb lebih baik dan porsi cicilan 4% (seharusnya 18%). | Diperbaiki: cicilan = max(daftar, e-wallet), peringatan selisih, Maxim ikut dihitung |
| 3 | Selesai → semua halaman app dalam mode e-wallet, data AI | Semua 10 halaman tampil, "pengeluaran terbesar" memakai e-wallet + tunai, konteks AI memuat sumber & pengecekan. | Lulus |
| 4 | Tandai uang masuk lain, jawab "Tidak ada" untuk pengeluaran tunai lalu "Ya" lagi, putuskan e-wallet dari Izin | Angka berubah tepat sesuai yang ditandai. Nilai tunai tersimpan. Setelah diputus, kembali ke mode manual dengan isian lama. | Lulus |
| 5 | Kota di dekat bar Lanjut (laporan tab lain) | **Bug #6:** daftar kota terbuka ke bawah melewati tepi layar / tertutup bar Lanjut saat halaman sudah mentok bawah. | Diperbaiki: halaman bergeser secukupnya, bila mentok daftar dibuka ke atas |
| 6 | "Isi contoh" ×3 lalu jalan dari Akun sampai app | Tidak tertahan di langkah E-wallet. Snackbar tidak menghalangi. | Lulus |
| 7 | Uji otomatis 13 kelompok invarian (Node) | Tidak ada hitungan dobel di kombinasi mana pun. Override tidak diklaim terverifikasi. Tidak ada NaN dari isian aneh. Tidak ada PII di konteks AI. | Lulus |
| 8 | Alur yang bisa membuat pengguna tersangkut / data hilang | **Gap #7:** pengguna yang mengaktifkan e-wallet tapi tidak jadi menghubungkan tertahan di langkah E-wallet. **Bug #8:** setelah server dimulai ulang, ringkasan e-wallet dihapus diam-diam dan dashboard berpindah ke mode manual. | Diperbaiki: tombol "Lanjut tanpa e-wallet"; data terakhir tetap dipakai (label "Data terakhir" + tombol "Hubungkan lagi" + pemberitahuan) |
| 9 | Header 360/375/414px dengan font asli dan font cadangan | Satu baris di semua kombinasi, tab memudar di tepi. | Lulus |
| 10 | Regresi: invarian + skor contoh + 12 halaman app dengan data e-wallet basi | Tidak ada temuan baru. | **Berhenti** |

## C. Catatan

- Langkah maju lewat tab memang dikunci (harus lewat Lanjut) sesuai permintaan sebelumnya; tombol "Perbaiki di langkah …" membawa pengguna mundur.
- Skor contoh sedikit berubah karena cicilan tanpa lama bulan kini dihitung: Andi 27 → 25; Sudirman 50; Wayan 93.
- Pengguna lama yang sebelumnya sudah menghubungkan e-wallet akan diminta menjawab pertanyaan tunai saat membuka Ubah data.
- Server lama di port 5174 masih menjalankan kode sebelumnya; mulai ulang supaya perubahan ini terlihat.


## D. Revisi 31 Okt — isian manual sebagai dasar, e-wallet sebagai verifikasi

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
| 1 | Rina (Surabaya, Gojek + ShopeeFood): pilih jalur uang lewat saran + Tunai + "SeaBank", aktifkan e-wallet, hubungkan GoPay lewat halaman penyedia (OTP), isi pendapatan | Jalur wajib, saran tepat, langkah E-wallet mengurutkan GoPay/ShopeePay. **#1:** kotak verifikasi pendapatan langsung merah "Belum diisi" sebelum pengguna mengetik. **#2:** setelah memilih "bukan pendapatan saya", kotak tetap merah "Belum diisi". | Diperbaiki: pesan netral saat belum diisi; status "Dikecualikan" |
| 1 (lanj.) | Pengeluaran: status per kategori, pilih alasan, Sesuaikan, tambah utang | **#3:** teks "dibayar / diterima" untuk pengeluaran. **#4:** pilihan "bukan milik saya (titipan)" muncul di cicilan. **#5 (hitungan):** "Sesuaikan" pada Pulsa malah **menurunkan** total pengeluaran, karena titik tengah rentang baru (200rb) di bawah angka e-wallet (284rb). | Diperbaiki: angka e-wallet jadi batas bawah rentang di semua status; Sesuaikan menaikkan batas bawah; teks per jenis item |
| 2 | Selesai → 12 halaman app, data AI | **#6:** daftar "pengeluaran terbesar" menampilkan angka janggal (Rp1.338.637) karena dihitung dengan aturan lama lalu diskalakan. | Diperbaiki: satu fungsi nilai per kategori; jumlah per kategori = total persis |
| 3 | Putus e-wallet, data contoh ×3, jalan sampai Hasil hanya lewat Lanjut | Total tidak berubah saat e-wallet diputus (isian = dasar). Tidak ada kotak verifikasi di mode manual. | Lulus |
| 4 | Pengguna lama (format `cash`, tanpa jalur uang) + data e-wallet basi | Migrasi bersih; data terakhir tetap dipakai; Ubah data meminta jalur uang dengan saran. | Lulus |
| 5 | Pendapatan kosong dengan bonus terisi; teks langkah E-wallet | Status "isian terlalu kecil" benar (bonus + tip > 0). Judul langkah E-wallet masih bahasa model lama. | Teks diperbarui |
| 6 | Tampilan Pengeluaran di lebar HP | **#7:** label "Tercatat di e-wallet" menempel pada nama kategori. | Diperbaiki (baris sendiri) |
| 7 | Regresi: 13 kelompok invarian (termasuk "Sesuaikan tidak pernah menurunkan total"), skor contoh, 12 halaman app, konsol | Tidak ada temuan baru. | **Berhenti** |

### Revisi lanjutan 31 Okt — Izin data
Halaman Izin data dikembalikan ke format awal atas permintaan pengguna: dua kartu yang bisa dipilih ("Hubungkan e-wallet saya" dan "Saya isi sendiri"), minimal satu wajib dipilih, dan langkah E-wallet hanya muncul bila kartu e-wallet dipilih. Diuji: keduanya / e-wallet saja / manual saja / tidak memilih (Lanjut terkunci); memutus e-wallet yang sudah terhubung tetap minta konfirmasi. Model verifikasi (isian manual = dasar hitungan) tidak berubah.
Langkah E-wallet sekarang hanya menampilkan e-wallet yang dicentang di Profil (bagian "E-wallet lain" dihapus). Bila tidak ada yang dicentang, muncul tombol "Pilih e-wallet di Profil". Menghapus centang e-wallet yang sudah terhubung meminta konfirmasi lalu memutusnya, supaya tidak ada e-wallet tersembunyi yang tetap ikut dihitung. Diuji: hanya GoPay/ShopeePay tampil; tanpa e-wallet dicentang; hapus centang OVO yang terhubung (Batal → tetap, Ya → diputus); e-wallet yang belum terhubung bisa dicentang/lepas tanpa dialog.
