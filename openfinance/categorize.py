"""Mengubah transaksi mentah e-wallet menjadi angka yang dipakai Laju.

Modul ini berjalan sama persis untuk data simulasi maupun data sungguhan,
jadi aturan di sini yang menentukan seberapa akurat skor nantinya.
Id kategori pengeluaran harus sama dengan EXPENSE_CATEGORIES di public/app.js.
"""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, datetime, timedelta

from .base import RawTransaction

CATEGORY_LABELS = {
    "makan": "Makan & minum",
    "kontrakan": "Sewa / kontrakan",
    "listrik": "Listrik, air, gas",
    "sekolah": "Sekolah & kebutuhan anak",
    "kirim": "Kirim ke keluarga / orang lain",
    "bbm": "Bensin",
    "servis": "Servis, oli, ban",
    "pulsa": "Paket data & pulsa",
    "parkir": "Parkir & cuci kendaraan",
    "rokok": "Rokok & kopi",
    "sosial": "Arisan, sumbangan, hajatan",
    "hiburan": "Hiburan & langganan",
    "lainnya": "Belum dikenali",
}

PLATFORM_LABELS = {"gojek": "Gojek", "grab": "Grab", "maxim": "Maxim", "indrive": "inDrive", "shopeefood": "ShopeeFood",
                   "spx": "SPX Express (Shopee)", "lalamove": "Lalamove", "lainnya": "Aplikasi lain"}


def _rx(*words: str) -> re.Pattern:
    return re.compile("|".join(words), re.IGNORECASE)


# --- uang masuk ---
REFUND = _rx(r"refund", r"pengembalian dana", r"cashback")
INTERNAL_IN = _rx(r"top ?up", r"isi saldo", r"tarik dari bank")
PERSON_IN = _rx(r"transfer dari [a-z]", r"kiriman dari")   # transfer dari orang: dikenali, tapi bukan pendapatan
BONUS = _rx(r"bonus", r"insentif")
PLATFORM_RULES = [
    ("gojek", _rx(r"gojek", r"go-?jek", r"godriver", r"gopay driver", r"mitra gojek")),
    ("grab", _rx(r"grab")),
    ("maxim", _rx(r"maxim")),
    ("indrive", _rx(r"indrive")),
    ("shopeefood", _rx(r"shopeefood driver", r"shopee ?food driver")),
    ("spx", _rx(r"shopee ?express", r"\bspx\b")),
    ("lalamove", _rx(r"lalamove")),
    ("lainnya", _rx(r"deliveree", r"borzo", r"paxel")),
]
PAYOUT_SIGNAL = _rx(r"pencairan", r"penghasilan", r"pendapatan", r"insentif", r"bonus", r"tip", r"mitra", r"driver", r"komisi")

# --- uang keluar; urutan penting: aturan pertama yang cocok dipakai ---
OUT_RULES: list[tuple[str, str, re.Pattern]] = [
    ("expense", "hiburan", _rx(r"top ?up game", r"mobile legends", r"free fire", r"netflix", r"spotify", r"vidio", r"youtube premium")),
    ("debt", "", _rx(r"kredivo", r"akulaku", r"paylater", r"pay later", r"adakami", r"kredit pintar", r"easycash", r"julo", r"indodana",
                     r"cicilan", r"angsuran", r"\bfif\b", r"adira", r"\bbaf\b", r"wom finance", r"mega finance", r"pinjaman")),
    ("internal", "", _rx(r"top ?up (ke )?(gopay|ovo|dana|shopeepay|linkaja)", r"tarik (saldo|tunai)", r"transfer ke rekening (bank )?sendiri")),
    ("expense", "bbm", _rx(r"spbu", r"pertamina", r"pertalite", r"pertamax", r"\bshell\b", r"bp akr", r"bensin")),
    ("expense", "pulsa", _rx(r"pulsa", r"paket data", r"telkomsel", r"indosat", r"\bxl\b", r"smartfren", r"by\.u", r"\baxis\b", r"\btri\b")),
    ("expense", "listrik", _rx(r"\bpln\b", r"token listrik", r"pdam", r"elpiji", r"\blpg\b", r"gas 3 ?kg")),
    ("expense", "servis", _rx(r"bengkel", r"servis", r"service motor", r"\boli\b", r"ahass", r"sparepart", r"ban dalam", r"ban luar")),
    ("expense", "parkir", _rx(r"parkir", r"cuci motor", r"cuci mobil", r"steam")),
    ("expense", "sekolah", _rx(r"sekolah", r"\bspp\b", r"seragam", r"buku tulis", r"les ")),
    ("expense", "sosial", _rx(r"arisan", r"sumbangan", r"infaq", r"infak", r"sedekah", r"zakat", r"kitabisa", r"kondangan")),
    ("expense", "kontrakan", _rx(r"kontrakan", r"\bkos\b", r"sewa rumah", r"sewa kamar")),
    ("expense", "rokok", _rx(r"rokok", r"sampoerna", r"gudang garam", r"djarum", r"kopi")),
    ("expense", "makan", _rx(r"gofood", r"grabfood", r"shopeefood", r"warung", r"rumah makan", r"\brm\b", r"padang", r"bakso",
                             r"kedai", r"angkringan", r"martabak", r"\bkfc\b", r"mcd", r"mie ayam")),
    ("expense", "makan", _rx(r"indomaret", r"alfamart", r"alfamidi", r"pasar", r"sembako", r"superindo", r"hypermart", r"beras", r"minyak goreng")),
    ("expense", "kirim", _rx(r"transfer ke", r"kirim uang", r"kirim ke")),
]


def categorize(tx: RawTransaction) -> dict:
    """Beri label `kind`, `category`, dan `platform` pada satu transaksi."""
    text = f"{tx.description} {tx.counterparty}"
    out = {**tx.to_dict(), "kind": "", "category": "", "platform": ""}

    if tx.direction == "in":
        if REFUND.search(text):
            out["kind"] = "refund"
        elif INTERNAL_IN.search(text):
            out["kind"] = "internal"
        else:
            for pid, rx in PLATFORM_RULES:
                if rx.search(text) and PAYOUT_SIGNAL.search(text):
                    out.update(kind="income_platform", platform=pid, bonus=bool(BONUS.search(text)))
                    break
            else:
                out["kind"] = "transfer_in" if PERSON_IN.search(text) else "income_other"
        return out

    for kind, cat, rx in OUT_RULES:
        if rx.search(text):
            out.update(kind=kind, category=cat)
            return out
    out.update(kind="expense", category="lainnya")
    return out


def history(raw: list[RawTransaction], today: date | None = None, months: int = 6) -> dict:
    """Riwayat per 30 hari (indeks 0 = 30 hari terakhir) untuk angka bank dan tier kepercayaan.

    Hanya pencairan aplikasi yang dihitung sebagai pendapatan bank. Bonus dipisah. Persentase yang
    dikenali dihitung dari jumlah uang, bukan jumlah transaksi. Transfer antar akun sendiri tidak ikut.
    """
    today = today or date.today()
    plat, bonus = [0] * months, [0] * months
    first = None
    total = unknown = 0
    for t in (categorize(x) for x in raw):
        d = _parse_day(t["date"])
        i = (today - d).days // 30
        if i < 0 or i >= months:
            continue
        first = d if first is None or d < first else first
        amt = t["amount"]
        if t["kind"] == "income_platform":
            (bonus if t.get("bonus") else plat)[i] += amt
        if t["kind"] != "internal":
            total += amt
            if t["kind"] == "income_other" or (t["kind"] == "expense" and t["category"] == "lainnya"):
                unknown += amt
    covered = 0 if first is None else min(months, (today - first).days // 30 + 1)
    return {
        "months": covered,
        "firstDate": first.isoformat() if first else None,
        "monthlyPlatform": plat[:covered],
        "monthlyBonus": bonus[:covered],
        "classifiedShare": round(1 - unknown / total, 3) if total else 1.0,
    }


def _parse_day(iso: str) -> date:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).date()


def summarize(raw: list[RawTransaction], days: int, today: date | None = None) -> dict:
    """Ringkasan per e-wallet. Semua total sudah dinormalisasi ke 30 hari."""
    today = today or date.today()
    start = today - timedelta(days=days - 1)
    items = [categorize(t) for t in raw]
    items = [t for t in items if start <= _parse_day(t["date"]) <= today]
    items.sort(key=lambda t: t["date"], reverse=True)

    scale = 30 / days
    by_platform: dict[str, int] = defaultdict(int)
    by_category: dict[str, int] = defaultdict(int)
    daily = [0] * days
    totals = defaultdict(int)

    for t in items:
        amt = t["amount"]
        totals[t["kind"]] += amt
        if t["kind"] == "income_platform":
            by_platform[t["platform"]] += amt
            daily[(_parse_day(t["date"]) - start).days] += amt
        elif t["kind"] == "expense":
            by_category[t["category"]] += amt

    expense_total = totals["expense"]
    recognised = expense_total - by_category.get("lainnya", 0)
    n = lambda v: round(v * scale)  # noqa: E731

    return {
        "periodDays": days,
        "periodStart": start.isoformat(),
        "periodEnd": today.isoformat(),
        "txCount": len(items),
        "incomePlatform": n(totals["income_platform"]),
        "incomeByPlatform": {k: n(v) for k, v in sorted(by_platform.items(), key=lambda kv: -kv[1])},
        "incomeOther": n(totals["income_other"] + totals["transfer_in"]),   # untuk mencocokkan isian "pemasukan lain"
        "transferIn": n(totals["transfer_in"]),
        "internalIn": n(sum(t["amount"] for t in items if t["kind"] == "internal" and t["direction"] == "in")),
        "internalOut": n(sum(t["amount"] for t in items if t["kind"] == "internal" and t["direction"] == "out")),
        "expenseTotal": n(expense_total),
        "expenseByCategory": {k: n(v) for k, v in sorted(by_category.items(), key=lambda kv: -kv[1])},
        "debtPayments": n(totals["debt"]),
        "activeDays": sum(1 for v in daily if v > 0),
        "dailyIncome": daily,
        "categorizedRatio": round(recognised / expense_total, 3) if expense_total else 1.0,
    }, items
