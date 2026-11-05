"""Kontrak antara server Laju dan penyedia open finance.

Server Laju hanya bicara lewat kelas `Provider` di bawah. Mengganti data
simulasi dengan data e-wallet sungguhan = menulis satu kelas turunan
(`openfinance/live.py`) yang memanggil API penyedia. Frontend tidak berubah.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Literal

Direction = Literal["in", "out"]


@dataclass
class RawTransaction:
    """Satu transaksi seperti yang dikirim penyedia, sudah diseragamkan formatnya.

    Penyedia berbeda memakai nama field berbeda; `live.py` wajib memetakan
    respons penyedia ke bentuk ini sebelum dikembalikan.
    """
    id: str
    date: str               # ISO 8601, zona waktu Asia/Jakarta
    amount: int             # rupiah, selalu positif
    direction: Direction    # "in" = uang masuk, "out" = uang keluar
    description: str        # teks mentah dari e-wallet
    counterparty: str = ""  # nama merchant / pengirim / penerima bila tersedia

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class LinkSession:
    """Sesi penghubungan: ke mana pengguna diarahkan untuk login di penyedia."""
    session_id: str
    wallet_id: str
    redirect_url: str


@dataclass
class LinkedAccount:
    """Hasil penghubungan yang berhasil. `access_token` tidak pernah dikirim ke browser."""
    wallet_id: str
    access_token: str
    account_name: str = ""
    account_ref: str = ""   # mis. nomor HP yang disamarkan: 0812****7890
    extra: dict = field(default_factory=dict)


class ProviderError(Exception):
    """Galat dari penyedia yang aman ditampilkan ke pengguna."""

    def __init__(self, message: str, code: str = "provider_error", status: int = 502):
        super().__init__(message)
        self.code = code
        self.status = status


class Provider(ABC):
    #: ditampilkan di UI, mis. "Simulasi" atau nama penyedia
    name: str = ""
    #: True bila data berasal dari e-wallet sungguhan
    live: bool = False
    #: e-wallet yang didukung penyedia ini (id sama dengan frontend)
    supported_wallets: tuple[str, ...] = ()

    @abstractmethod
    def create_link_session(self, user_id: str, wallet_id: str, callback_url: str, phone: str = "") -> LinkSession:
        """Minta penyedia membuat sesi login, kembalikan URL tujuan pengguna. `phone`: nomor HP yang diisi pengguna
        di Laju, dikirim supaya halaman penyedia sudah terisi (kalau penyedia mendukung)."""

    @abstractmethod
    def exchange(self, session_id: str, params: dict) -> LinkedAccount:
        """Tukar parameter callback dari penyedia menjadi token akses akun."""

    @abstractmethod
    def fetch_transactions(self, account: LinkedAccount, days: int) -> list[RawTransaction]:
        """Ambil riwayat transaksi `days` hari terakhir (hanya baca)."""

    @abstractmethod
    def revoke(self, account: LinkedAccount) -> None:
        """Cabut izin akses di sisi penyedia."""
