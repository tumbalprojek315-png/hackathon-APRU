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
# `history` = berapa hari riwayat yang bisa ditarik penyedia untuk dompet itu. Sengaja berbeda per dompet,
# supaya kasus riwayat pendek (Tier 2 atau 3) bisa didemokan.
WALLET_PROFILES = {
    "gopay": {"payout": ("gojek", "Pencairan saldo GoPay Driver", (90_000, 210_000)), "spend": 1.0, "history": 180, "unknown": 0.1},
    "ovo": {"payout": ("grab", "Grab Driver - Penarikan penghasilan", (60_000, 170_000)), "spend": 0.6, "history": 180, "unknown": 0.2},
    "dana": {"payout": ("maxim", "Maxim - Transfer pendapatan mitra", (40_000, 120_000)), "spend": 0.5, "history": 75, "unknown": 0.25},
    "shopeepay": {"payout": ("lainnya", "ShopeeFood Driver - Pencairan komisi", (30_000, 90_000)), "spend": 0.5, "history": 120, "unknown": 0.15},
    "linkaja": {"payout": None, "spend": 0.3, "history": 45, "unknown": 0.9},
    "bank": {"payout": ("grab", "Grab Driver - Penarikan penghasilan ke rekening", (60_000, 160_000)), "spend": 0.4, "history": 180, "unknown": 0.15},
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


PEER_LABELS = {"gopay": "GoPay", "ovo": "OVO", "dana": "DANA", "shopeepay": "ShopeePay", "linkaja": "LinkAja"}
# Kode awalan virtual account top up (contoh untuk simulasi). Nomor VA = kode + nomor HP akun e-wallet tujuan.
VA_PREFIX = {"gopay": "70001", "ovo": "39358", "dana": "3901", "shopeepay": "122", "linkaja": "09110"}
OTHER_PHONE = "081398765432"   # nomor e-wallet milik orang lain, untuk contoh top up ke dompet orang


def mask(phone: str) -> str:
    d = "".join(ch for ch in phone if ch.isdigit())
    return f"{d[:4]}****{d[-4:]}" if len(d) >= 8 else "08**********"


def topup_desc(wallet_id: str, phone: str, day: date) -> str:
    """Keterangan top up dari rekening ke e-wallet. Tetap per (dompet, hari): kadang nomor VA lengkap, kadang nomor
    disamarkan, kadang tanpa nomor, seperti mutasi bank sungguhan yang formatnya berbeda beda."""
    label = PEER_LABELS.get(wallet_id, wallet_id)
    r = random.Random(f"desc:{wallet_id}:{day.toordinal()}").random()
    if phone and r < 0.5:
        return f"Top up {label} {VA_PREFIX.get(wallet_id, '')}{phone}"
    if phone and r < 0.8:
        return f"Top up {label} {mask(phone)}"
    return f"Top up {label}"


def _transfers(wallet_id: str, day: date) -> list[tuple[str, int, int, int, str]]:
    """Pindahan dompet <-> rekening BRI pada satu hari, tetap untuk dompet itu (tidak tergantung pengguna).
    Hasil: (jenis, jumlah di dompet, biaya admin, jeda hari di rekening, keterangan). "tarik" = dompet ke rekening,
    "topup" = rekening ke dompet. Kira-kira seminggu sekali tarik saldo dan sebulan dua kali top up."""
    prof = WALLET_PROFILES.get(wallet_id)
    if not prof or wallet_id == "bank":
        return []
    r = random.Random(f"transfer:{wallet_id}:{day.toordinal()}")
    out = []
    if prof["payout"] and r.random() < 0.14:
        out.append(("tarik", int(round(r.uniform(200_000, 500_000), -3)), r.choice([0, 0, 2_500]), r.choice([0, 0, 1]), ""))
    if r.random() < 0.05 * prof["spend"] + 0.02:
        out.append(("topup", int(round(r.uniform(50_000, 200_000), -3)), r.choice([0, 1_000]), 0, ""))
    return out


class MockProvider(Provider):
    name = "Simulasi Laju"
    live = False
    supported_wallets = tuple(WALLET_PROFILES)

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create_link_session(self, user_id: str, wallet_id: str, callback_url: str, phone: str = "") -> LinkSession:
        if wallet_id not in WALLET_PROFILES:
            raise ProviderError("E-wallet ini belum didukung.", "unsupported_wallet", 400)
        sid = secrets.token_urlsafe(12)
        with self._lock:
            self._sessions[sid] = {"user_id": user_id, "wallet_id": wallet_id, "code": "sim-" + secrets.token_urlsafe(8)}
        q = {"session": sid, "wallet": wallet_id, "code": self._sessions[sid]["code"], "callback": callback_url}
        if phone:
            q["phone"] = phone   # nomor dari Izin data: halaman penyedia tinggal minta OTP
        query = urlencode(q)
        return LinkSession(sid, wallet_id, f"/simulasi-penyedia.html?{query}")

    def exchange(self, session_id: str, params: dict) -> LinkedAccount:
        with self._lock:
            sess = self._sessions.pop(session_id, None)
        if not sess:
            raise ProviderError("Sesi penghubungan sudah kedaluwarsa. Coba hubungkan lagi.", "session_expired", 400)
        if params.get("error") == "otp_failed":
            raise ProviderError("Kode OTP salah 3 kali di halaman penyedia.", "otp_failed", 400)
        if params.get("error"):
            raise ProviderError("Izin dibatalkan di halaman penyedia.", "access_denied", 400)
        if params.get("code") != sess["code"]:
            raise ProviderError("Kode verifikasi dari penyedia tidak cocok.", "bad_code", 400)
        phone = "".join(ch for ch in params.get("ref", "") if ch.isdigit())
        last4 = phone[-4:] or "0000"
        return LinkedAccount(
            wallet_id=sess["wallet_id"],
            access_token="sim_" + secrets.token_urlsafe(16),
            account_name="Akun simulasi",
            account_ref=mask(phone),
            # penyedia sungguhan mengembalikan nomor akun yang terhubung; Laju mencocokkannya dengan isian Izin data
            extra={"seed": f"{sess['user_id']}:{sess['wallet_id']}:{last4}", "phone": phone},
        )

    def fetch_transactions(self, account: LinkedAccount, days: int, peers: dict | list | tuple = (),
                           today: date | None = None) -> list[RawTransaction]:
        """`peers`: dompet lain milik pengguna yang sama yang sudah terhubung ({id: nomor HP} atau daftar id). Dipakai
        supaya pindahan antar akun (tarik saldo ke rekening, top up dari rekening) punya pasangan di rekening bank.

        `today`: tanggal "hari ini" menurut jam simulasi (tombol Majukan 30 hari). Setiap hari dibuat dari benihnya
        sendiri, jadi transaksi hari yang sama selalu sama walaupun jam dimajukan: bulan lalu tidak ikut berubah.
        Hari setelah tanggal asli hari ini adalah "masa depan" simulasi: driver dianggap mengikuti rencana Laju, jadi
        belanja turun sekitar 8% per bulan (paling banyak 40%). Ini asumsi demo, bukan data."""
        peers = peers if isinstance(peers, dict) else {p: "" for p in peers}
        prof = WALLET_PROFILES[account.wallet_id]
        seed = account.extra.get("seed", account.access_token)
        base = random.Random(seed)
        real_today = date.today()
        today = today or real_today
        off_weekday = base.randrange(7)              # satu hari libur tetap per minggu
        intensity = base.uniform(0.8, 1.2)           # driver rajin vs santai
        bills = [b for b in MONTHLY_BILLS if base.random() < prof["spend"]]   # tagihan bulanan dompet ini tetap tiap bulan
        opened = real_today - timedelta(days=prof["history"] - 1)   # riwayat yang bisa ditarik dihitung dari tanggal asli
        txs: list[RawTransaction] = []

        for i in range(days):
            day = today - timedelta(days=i)
            if day < opened:
                break
            rnd = random.Random(f"{seed}:{day.toordinal()}")
            ahead = max(0, (day - real_today).days) / 30
            spend_f = max(0.6, 1 - 0.08 * ahead)
            k = 0

            def add(amount: float, direction: str, desc: str) -> None:
                nonlocal k
                stamp = datetime.combine(day, time(rnd.randrange(6, 23), rnd.randrange(60)))
                txs.append(RawTransaction(
                    id=f"{account.wallet_id}-{day:%Y%m%d}-{k:02d}",
                    date=stamp.isoformat() + "+07:00",
                    amount=int(round(amount, -2)),
                    direction=direction,  # type: ignore[arg-type]
                    description=desc,
                ))
                k += 1

            working = day.weekday() != off_weekday and rnd.random() > 0.06   # sesekali sakit / libur
            if prof["payout"] and working:
                _, desc, (lo, hi) = prof["payout"]
                add(rnd.uniform(lo, hi) * intensity, "in", desc)
                if rnd.random() < 0.15:
                    add(rnd.uniform(10_000, 40_000), "in", desc.split(" - ")[0] + " - Bonus insentif harian")

            if rnd.random() < 0.03:
                add(rnd.uniform(50_000, 300_000), "in", "Transfer dari RAHMAT HIDAYAT")
            for desc, (lo, hi), p in SPEND_TEMPLATES:
                if rnd.random() < p * prof["spend"] * (1 if working else 0.5):
                    add(rnd.uniform(lo, hi) * spend_f, "out", desc)
            for desc, (lo, hi), dom in bills:
                if day.day == dom:
                    add(rnd.uniform(lo, hi), "out", desc)
            # transaksi yang tidak dikenali (QRIS tanpa nama jelas, dana masuk tanpa keterangan)
            if rnd.random() < prof["unknown"] * spend_f:
                add(rnd.uniform(20_000, 150_000), "out", f"Pembayaran QRIS NMID ID{rnd.randrange(10**9, 10**10)}")
            if rnd.random() < 0.01:
                add(rnd.uniform(100_000, 500_000), "in", f"Dana masuk REF{rnd.randrange(10**6, 10**7)}")
            # pindahan dengan rekening bank: jadwalnya tetap per dompet, jadi rekening bank bisa membuat pasangannya
            if account.wallet_id != "bank":
                for kind, amt, _, _, _ in _transfers(account.wallet_id, day):
                    if kind == "tarik":
                        add(amt, "out", "Tarik saldo ke rekening BRI")
                    else:
                        add(amt, "in", "Top up saldo dari BRI")
            else:
                for peer in peers:
                    if peer == "bank" or peer not in WALLET_PROFILES:
                        continue
                    label = PEER_LABELS.get(peer, peer)
                    # pasangan untuk transaksi dompet di hari ini (masuk hari yang sama atau besoknya)
                    for src_day in (day, day - timedelta(days=1)):
                        for kind, amt, fee, lag, _ in _transfers(peer, src_day):
                            if (day - src_day).days != lag:
                                continue
                            if kind == "tarik":
                                add(amt - fee, "in", f"Transfer masuk dari {label}")
                            else:
                                add(amt + fee, "out", topup_desc(peer, peers[peer], src_day))
                # sesekali top up ke e-wallet orang lain (nomornya bukan milik pengguna): tetap pengeluaran
                if peers and random.Random(f"other:{day.toordinal()}").random() < 0.06:
                    add(rnd.uniform(50_000, 150_000), "out", f"Top up OVO {VA_PREFIX['ovo']}{OTHER_PHONE}")

        return txs

    def revoke(self, account: LinkedAccount) -> None:
        return None
