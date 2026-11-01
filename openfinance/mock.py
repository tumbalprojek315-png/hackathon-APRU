"""Penyedia simulasi: alur dan format data meniru penyedia open finance sungguhan.

Pengguna tetap diarahkan ke "halaman penyedia" (public/simulasi-penyedia.html),
mengisi nomor HP + OTP di sana, lalu kembali ke Laju lewat callback, persis
seperti alur aslinya. Bedanya, transaksi dibuat oleh generator di bawah.
"""
from __future__ import annotations

import random
import secrets
import threading
from datetime import date, datetime, time, timedelta
from urllib.parse import urlencode

from .base import LinkedAccount, LinkSession, Provider, ProviderError, RawTransaction

# Pola khas tiap e-wallet bagi driver: dari mana uang masuk, ke mana keluar.
WALLET_PROFILES = {
    "gopay": {"payout": ("gojek", "Pencairan saldo GoPay Driver", (90_000, 210_000)), "spend": 1.0},
    "ovo": {"payout": ("grab", "Grab Driver - Penarikan penghasilan", (60_000, 170_000)), "spend": 0.6},
    "dana": {"payout": ("maxim", "Maxim - Transfer pendapatan mitra", (40_000, 120_000)), "spend": 0.5},
    "shopeepay": {"payout": ("lainnya", "ShopeeFood Driver - Pencairan komisi", (30_000, 90_000)), "spend": 0.5},
    "linkaja": {"payout": None, "spend": 0.3},
}

SPEND_TEMPLATES = [
    # (deskripsi, rentang rupiah, peluang per hari)
    ("Pembayaran SPBU Pertamina - Pertalite", (20_000, 45_000), 0.80),
    ("GoFood - Warung Nasi Padang Sederhana", (18_000, 35_000), 0.35),
    ("Bayar QRIS - Kedai Kopi Bang Ucok", (8_000, 18_000), 0.40),
    ("Indomaret - Belanja kebutuhan", (35_000, 120_000), 0.20),
    ("Beli pulsa Telkomsel", (25_000, 50_000), 0.07),
    ("Paket data Telkomsel 15GB", (60_000, 85_000), 0.03),
    ("Bayar QRIS - Warung Rokok Pak Amin", (25_000, 40_000), 0.30),
    ("Parkir Mal SKA", (3_000, 5_000), 0.25),
    ("Bengkel AHASS - Ganti oli", (55_000, 95_000), 0.03),
    ("Transfer ke SITI AMINAH", (100_000, 400_000), 0.06),
    ("Arisan RT 05", (50_000, 100_000), 0.03),
    ("Top up game Mobile Legends", (15_000, 50_000), 0.04),
    ("Bayar QRIS - Angkringan Mas Joko", (10_000, 25_000), 0.20),
]
MONTHLY_BILLS = [
    ("Token listrik PLN", (100_000, 200_000), 3),
    ("Pembayaran cicilan Adira Finance", (650_000, 850_000), 5),
    ("Kredivo - Pembayaran tagihan", (300_000, 450_000), 15),
    ("Bayar SPP sekolah", (75_000, 150_000), 10),
]


class MockProvider(Provider):
    name = "Simulasi Laju"
    live = False
    supported_wallets = tuple(WALLET_PROFILES)

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create_link_session(self, user_id: str, wallet_id: str, callback_url: str) -> LinkSession:
        if wallet_id not in WALLET_PROFILES:
            raise ProviderError("E-wallet ini belum didukung.", "unsupported_wallet", 400)
        sid = secrets.token_urlsafe(12)
        with self._lock:
            self._sessions[sid] = {"user_id": user_id, "wallet_id": wallet_id, "code": "sim-" + secrets.token_urlsafe(8)}
        query = urlencode({"session": sid, "wallet": wallet_id, "code": self._sessions[sid]["code"], "callback": callback_url})
        return LinkSession(sid, wallet_id, f"/simulasi-penyedia.html?{query}")

    def exchange(self, session_id: str, params: dict) -> LinkedAccount:
        with self._lock:
            sess = self._sessions.pop(session_id, None)
        if not sess:
            raise ProviderError("Sesi penghubungan sudah kedaluwarsa. Coba hubungkan lagi.", "session_expired", 400)
        if params.get("error"):
            raise ProviderError("Izin dibatalkan di halaman penyedia.", "access_denied", 400)
        if params.get("code") != sess["code"]:
            raise ProviderError("Kode verifikasi dari penyedia tidak cocok.", "bad_code", 400)
        last4 = "".join(ch for ch in params.get("ref", "") if ch.isdigit())[-4:] or "0000"
        return LinkedAccount(
            wallet_id=sess["wallet_id"],
            access_token="sim_" + secrets.token_urlsafe(16),
            account_name="Akun simulasi",
            account_ref=f"08** **** {last4}",
            extra={"seed": f"{sess['user_id']}:{sess['wallet_id']}:{last4}"},
        )

    def fetch_transactions(self, account: LinkedAccount, days: int) -> list[RawTransaction]:
        prof = WALLET_PROFILES[account.wallet_id]
        rnd = random.Random(account.extra.get("seed", account.access_token))
        today = date.today()
        off_weekday = rnd.randrange(7)              # satu hari libur tetap per minggu
        intensity = rnd.uniform(0.8, 1.2)           # driver rajin vs santai
        txs: list[RawTransaction] = []

        def add(day: date, amount: int, direction: str, desc: str) -> None:
            stamp = datetime.combine(day, time(rnd.randrange(6, 23), rnd.randrange(60)))
            txs.append(RawTransaction(
                id=f"{account.wallet_id}-{len(txs):04d}",
                date=stamp.isoformat() + "+07:00",
                amount=int(round(amount, -2)),
                direction=direction,  # type: ignore[arg-type]
                description=desc,
            ))

        for i in range(days):
            day = today - timedelta(days=i)
            working = day.weekday() != off_weekday and rnd.random() > 0.06   # sesekali sakit / libur
            if prof["payout"] and working:
                _, desc, (lo, hi) = prof["payout"]
                add(day, rnd.uniform(lo, hi) * intensity, "in", desc)
                if rnd.random() < 0.15:
                    add(day, rnd.uniform(10_000, 40_000), "in", desc.split(" - ")[0] + " - Bonus insentif harian")
            if rnd.random() < 0.05 * prof["spend"]:
                add(day, rnd.uniform(50_000, 200_000), "in", "Top up saldo dari BRI")
            if rnd.random() < 0.03:
                add(day, rnd.uniform(50_000, 300_000), "in", "Transfer dari RAHMAT HIDAYAT")
            for desc, (lo, hi), p in SPEND_TEMPLATES:
                if rnd.random() < p * prof["spend"] * (1 if working else 0.5):
                    add(day, rnd.uniform(lo, hi), "out", desc)
            for desc, (lo, hi), dom in MONTHLY_BILLS:
                if day.day == dom and rnd.random() < prof["spend"]:
                    add(day, rnd.uniform(lo, hi), "out", desc)
            if prof["payout"] and i % 7 == 3 and rnd.random() < 0.5:
                add(day, rnd.uniform(200_000, 500_000), "out", "Tarik saldo ke rekening BRI")

        return txs

    def revoke(self, account: LinkedAccount) -> None:
        return None
