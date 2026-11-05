"""Penyedia open finance SUNGGUHAN. Satu-satunya bagian yang belum bisa diisi.

Semua lapisan lain (alur izin, callback, sinkronisasi, kategorisasi, skor,
tampilan) sudah berjalan dan diuji dengan `MockProvider`. Yang tersisa adalah
mengisi empat metode di bawah dengan panggilan ke API penyedia yang dipilih.

Kenapa belum bisa diisi sekarang:
  1. Butuh akun developer + kunci API (client id/secret) dari penyedia
     berlisensi, mis. Brick (onebrick.io) atau Ayoconnect. Biasanya diawali
     akses sandbox, lalu proses KYB/kerja sama sebelum akses produksi.
  2. Nama endpoint, format token, dan field transaksi berbeda di tiap
     penyedia. Harus mengikuti dokumentasi resmi mereka, tidak boleh ditebak.
  3. Dukungan per e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja) harus
     dikonfirmasi ke penyedia; isi `supported_wallets` sesuai jawaban mereka.

Cara mengaktifkan setelah kunci didapat:
  set LAJU_PROVIDER=live
  set OPEN_FINANCE_BASE_URL=<url sandbox penyedia>
  set OPEN_FINANCE_CLIENT_ID=<client id>
  set OPEN_FINANCE_CLIENT_SECRET=<client secret>
  python server.py
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from .base import LinkedAccount, LinkSession, Provider, ProviderError, RawTransaction


class LiveProvider(Provider):
    name = os.environ.get("OPEN_FINANCE_PROVIDER_NAME", "Penyedia open finance")
    live = True
    # TODO(penyedia): sesuaikan dengan e-wallet yang benar-benar didukung.
    supported_wallets = ("gopay", "ovo", "dana", "shopeepay", "linkaja")

    def __init__(self) -> None:
        self.base_url = os.environ.get("OPEN_FINANCE_BASE_URL", "").rstrip("/")
        self.client_id = os.environ.get("OPEN_FINANCE_CLIENT_ID", "")
        self.client_secret = os.environ.get("OPEN_FINANCE_CLIENT_SECRET", "")
        missing = [k for k, v in {"OPEN_FINANCE_BASE_URL": self.base_url, "OPEN_FINANCE_CLIENT_ID": self.client_id,
                                  "OPEN_FINANCE_CLIENT_SECRET": self.client_secret}.items() if not v]
        if missing:
            raise RuntimeError("LAJU_PROVIDER=live butuh variabel lingkungan: " + ", ".join(missing))

    # ------------------------------------------------------------------ HTTP
    def _request(self, method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
        """Pemanggil JSON generik. Header autentikasi mengikuti dokumentasi penyedia."""
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base_url + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                return json.loads(res.read() or b"{}")
        except urllib.error.HTTPError as e:
            # Jangan teruskan isi galat penyedia apa adanya ke pengguna.
            raise ProviderError("Penyedia open finance menolak permintaan. Coba lagi nanti.", f"http_{e.code}") from e
        except urllib.error.URLError as e:
            raise ProviderError("Tidak bisa menghubungi penyedia open finance.", "unreachable") from e

    # ------------------------------------------------------- 4 metode wajib
    def create_link_session(self, user_id: str, wallet_id: str, callback_url: str, phone: str = "") -> LinkSession:
        # TODO(penyedia): 1) minta token aplikasi dengan client id/secret,
        # 2) buat sesi/widget penghubungan untuk `wallet_id`, daftarkan
        #    `callback_url` sebagai redirect URI,
        # 3) kembalikan LinkSession(session_id, wallet_id, <url widget penyedia>).
        #    Kirim `phone` sebagai isian awal nomor HP kalau penyedia mendukung.
        # exchange(): taruh nomor HP akun yang terhubung di LinkedAccount.extra["phone"] supaya Laju bisa
        #    mencocokkannya dengan nomor yang diisi pengguna.
        raise NotImplementedError("Isi dengan endpoint pembuatan sesi dari dokumentasi penyedia.")

    def exchange(self, session_id: str, params: dict) -> LinkedAccount:
        # TODO(penyedia): `params` = query string yang dikirim penyedia ke
        # /api/wallets/callback. Tukar kode/token sementara di dalamnya
        # menjadi token akses akun pengguna. Jika params berisi tanda batal,
        # raise ProviderError(..., "access_denied", 400).
        raise NotImplementedError("Isi dengan endpoint penukaran token dari dokumentasi penyedia.")

    def fetch_transactions(self, account: LinkedAccount, days: int) -> list[RawTransaction]:
        # TODO(penyedia): ambil transaksi `days` hari terakhir memakai
        # account.access_token, tangani paginasi, lalu petakan setiap item ke
        # RawTransaction(id, date ISO, amount positif, direction "in"/"out",
        # description, counterparty). Pengolahan selanjutnya otomatis.
        raise NotImplementedError("Isi dengan endpoint riwayat transaksi dari dokumentasi penyedia.")

    def revoke(self, account: LinkedAccount) -> None:
        # TODO(penyedia): cabut izin/akses token di sisi penyedia.
        raise NotImplementedError("Isi dengan endpoint pencabutan izin dari dokumentasi penyedia.")
