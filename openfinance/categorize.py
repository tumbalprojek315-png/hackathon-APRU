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
    "admin": "Biaya admin & transfer",
    "keluar_lain": "Ke rekening atau dompet lain",
    "lainnya": "Belum dikenali",
}

PLATFORM_LABELS = {"gojek": "Gojek", "grab": "Grab", "maxim": "Maxim", "indrive": "inDrive", "shopeefood": "ShopeeFood",
                   "spx": "SPX Express (Shopee)", "lalamove": "Lalamove", "lainnya": "Aplikasi lain"}


def _rx(*words: str) -> re.Pattern:
    return re.compile("|".join(words), re.IGNORECASE)


# --- uang masuk ---
REFUND = _rx(r"refund", r"pengembalian dana", r"cashback")
# Uang masuk yang tampak seperti pindahan dari akun lain. Baru dianggap pindahan antar akun sendiri kalau
# pasangannya ketemu di akun lain yang terdaftar di Laju (lihat `pair_transfers`). Kalau tidak, dihitung
# uang masuk lain (bisa saja kiriman orang).
XFER_IN = _rx(r"top ?up", r"isi saldo", r"tarik dari bank",
              r"(transfer|kiriman|dana) (masuk )?dari (go-?pay|ovo|dana|shopee ?pay|link ?aja|rekening|bank|bri|bca|mandiri|bni|seabank|jago)")
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
    # pindahan ke akun lain atau tarik tunai: dihitung uang keluar, kecuali pasangannya ketemu di akun terdaftar
    ("expense", "keluar_lain", _rx(r"top ?up (ke )?(go-?pay|ovo|dana|shopee ?pay|link ?aja)", r"tarik (saldo|tunai)",
                                   r"transfer ke rekening", r"transfer ke (go-?pay|ovo|dana|shopee ?pay|link ?aja|bri|bca|mandiri|bni|seabank|jago)")),
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


def categorize(tx: RawTransaction, override: dict | None = None) -> dict:
    """Beri label `kind`, `category`, dan `platform` pada satu transaksi.
    `override` dari `pair_transfers`: pindahan antar akun sendiri yang pasangannya sudah ketemu."""
    text = f"{tx.description} {tx.counterparty}"
    out = {**tx.to_dict(), "kind": "", "category": "", "platform": ""}
    if override:
        out.update(override)
        return out

    if tx.direction == "in":
        if REFUND.search(text):
            out["kind"] = "refund"
        elif XFER_IN.search(text):
            out["kind"] = "transfer_in"
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


def history(raw: list[RawTransaction], today: date | None = None, months: int = 6, overrides: dict | None = None) -> dict:
    """Riwayat per 30 hari (indeks 0 = 30 hari terakhir) untuk angka bank dan tier kepercayaan.

    Hanya pencairan aplikasi yang dihitung sebagai pendapatan bank. Bonus dipisah. Persentase yang
    dikenali dihitung dari jumlah uang, bukan jumlah transaksi. Transfer antar akun sendiri tidak ikut.
    """
    today = today or date.today()
    plat, bonus = [0] * months, [0] * months
    first = None
    total = unknown = 0
    ov = overrides or {}
    for t in (categorize(x, ov.get(x.id)) for x in raw):
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


def summarize(raw: list[RawTransaction], days: int, today: date | None = None, overrides: dict | None = None) -> dict:
    """Ringkasan per e-wallet. Semua total sudah dinormalisasi ke 30 hari."""
    today = today or date.today()
    start = today - timedelta(days=days - 1)
    ov = overrides or {}
    items = [categorize(t, ov.get(t.id)) for t in raw]
    items = [t for t in items if start <= _parse_day(t["date"]) <= today]
    items.sort(key=lambda t: t["date"], reverse=True)

    scale = 30 / days
    by_platform: dict[str, int] = defaultdict(int)
    by_category: dict[str, int] = defaultdict(int)
    daily = [0] * days
    daily_in: list[dict[str, int]] = [{} for _ in range(days)]    # uang masuk per hari per aplikasi, uang masuk lain = "lain"
    daily_out: list[dict[str, int]] = [{} for _ in range(days)]   # pengeluaran per hari per kategori, cicilan = "utang"
    totals = defaultdict(int)

    for t in items:
        amt = t["amount"]
        totals[t["kind"]] += amt
        i = (_parse_day(t["date"]) - start).days
        if t["kind"] == "income_platform":
            by_platform[t["platform"]] += amt
            daily[i] += amt
            daily_in[i][t["platform"]] = daily_in[i].get(t["platform"], 0) + amt
        elif t["kind"] in ("income_other", "transfer_in"):
            daily_in[i]["lain"] = daily_in[i].get("lain", 0) + amt
        elif t["kind"] == "expense":
            by_category[t["category"]] += amt
            daily_out[i][t["category"]] = daily_out[i].get(t["category"], 0) + amt
        elif t["kind"] == "debt":
            daily_out[i]["utang"] = daily_out[i].get("utang", 0) + amt
        elif t["kind"] == "internal" and t.get("fee"):
            # pindahan antar akun sendiri: hanya selisihnya (biaya admin) yang jadi pengeluaran
            totals["expense"] += t["fee"]
            by_category["admin"] += t["fee"]
            daily_out[i]["admin"] = daily_out[i].get("admin", 0) + t["fee"]

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
        "dailyIn": daily_in,
        "dailyOut": daily_out,
        "categorizedRatio": round(recognised / expense_total, 3) if expense_total else 1.0,
    }, items


# --- pindahan antar akun sendiri ----------------------------------------------------------------
# Dua syarat, keduanya wajib:
#   1. akun asal dan tujuan sama-sama terdaftar di Laju (e-wallet terhubung atau e statement yang diunggah), dan
#   2. pasangannya benar-benar ketemu: keluar di akun A, masuk di akun B, salah satu keterangannya menyebut akun
#      lainnya, jumlah masuk = jumlah keluar dikurangi biaya admin (Rp0 sampai Rp10.000), tanggal berdekatan.
# Kalau pasangan tidak ketemu, transaksi dihitung biasa: keluar = pengeluaran, masuk = uang masuk lain.
# Jadi menyebut "OVO" di keterangan saja tidak cukup, karena bisa saja kiriman dari OVO milik orang lain.
ACCOUNT_NAMES = {"gopay": r"go-?pay", "ovo": r"\bovo\b", "dana": r"\bdana\b(?! masuk| cair)", "shopeepay": r"shopee ?pay",
                 "linkaja": r"link ?aja", "bank": r"rekening|\bbank\b|\bbri\b|\bbca\b|mandiri|\bbni\b"}
FEE_MAX = 10_000
DAYS_WALLET = 1   # e-wallet ke e-wallet: hari yang sama, atau besoknya kalau lewat tengah malam
DAYS_BANK = 3     # melibatkan rekening bank atau e statement: transfer bank bisa masuk hari kerja berikutnya (akhir pekan)


# Nomor HP di keterangan. Nomor virtual account top up e-wallet = kode bank + nomor HP akun tujuannya
# (mis. 70001 + 0812...), jadi nomor HP-nya bisa dibaca dari situ. Nomor yang disamarkan (0812****7890) hanya
# dipakai sebagai petunjuk, bukan bukti.
RUN = re.compile(r"\d{10,20}")
MASKED = re.compile(r"(\d{3,5})[*xX•]{2,}(\d{3,4})")


def phone_core(s: str) -> str:
    """Nomor HP tanpa awalan 0 / 62: 081234567890 -> 81234567890."""
    d = re.sub(r"\D", "", s or "")
    return d[2:] if d.startswith("62") else d[1:] if d.startswith("0") else d


def _phones_in(text: str) -> tuple[list[str], list[tuple[str, str]]]:
    """(nomor lengkap, nomor samar) yang tampak seperti nomor HP. Nomor lengkap dalam bentuk inti (tanpa 0 / 62)."""
    full = []
    for run in RUN.findall(text):
        for k in range(0, min(7, len(run) - 9)):   # boleh diawali kode bank virtual account (sampai 6 digit)
            if run[k:k + 2] == "08":
                full.append(run[k + 1:]); break
            if run[k:k + 3] == "628":
                full.append(run[k + 2:]); break
    masked = [(phone_core(a), b) for a, b in MASKED.findall(text)]
    return [f for f in full if 9 <= len(f) <= 12], masked


def _phone_hint(text: str, numbers: dict[str, str]) -> tuple[str | None, bool]:
    """(akun yang nomornya disebut lengkap, ada nomor lengkap yang bukan milik akun terdaftar mana pun)."""
    full, _ = _phones_in(text)
    for f in full:
        for acc, num in numbers.items():
            if num and f == num:
                return acc, False
    return None, bool(full)


def _masked_ok(text: str, num: str | None) -> bool:
    """Nomor samar di keterangan tidak bertentangan dengan nomor akun (atau memang tidak ada nomor samar)."""
    _, masked = _phones_in(text)
    if not masked or not num:
        return True
    return any(num.startswith(a) and num.endswith(b) for a, b in masked)


def _names(account_id: str) -> re.Pattern:
    if account_id.startswith("c:"):
        return re.compile(r"\b" + re.escape(account_id[2:]) + r"\b", re.IGNORECASE)
    return re.compile(ACCOUNT_NAMES.get(account_id, re.escape(account_id)), re.IGNORECASE)


def pair_transfers(accounts: dict[str, list[RawTransaction]], numbers: dict[str, str] | None = None) -> dict[str, dict]:
    """accounts: {id akun: transaksi mentahnya}. numbers: {id akun: nomor HP terverifikasi}. Hasil: {id transaksi: override}.

    Urutan bukti:
      1. Keterangan menyebut nomor lengkap milik akun terdaftar (termasuk di dalam nomor virtual account): pindahan
         antar akun sendiri. Pasangannya dicari di akun itu untuk biaya admin; kalau tidak ketemu tetap pindahan.
      2. Keterangan menyebut nomor lengkap yang bukan milik akun terdaftar mana pun: pasti bukan pindahan sendiri,
         walaupun jumlah dan tanggalnya kebetulan cocok.
      3. Tidak ada nomor lengkap: harus ada pasangannya (lihat aturan di atas). Nomor samar boleh, asal tidak
         bertentangan dengan nomor akun pasangannya."""
    numbers = {a: phone_core(n) for a, n in (numbers or {}).items() if n and a in accounts}
    names = {a: _names(a) for a in accounts}
    outs, ins = [], []
    for a, raw in accounts.items():
        for t in raw:
            lab = categorize(t)
            text = f"{t.description} {t.counterparty}"
            peer, foreign = _phone_hint(text, {k: v for k, v in numbers.items() if k != a})
            if peer is None and foreign:
                continue   # nomor orang lain: tidak pernah jadi pindahan sendiri
            item = (a, t, text, peer)
            if t.direction == "out" and lab["kind"] == "expense" and lab["category"] in ("keluar_lain", "kirim"):
                outs.append(item)
            elif t.direction == "in" and lab["kind"] in ("transfer_in", "income_other"):
                ins.append(item)
    used: set[str] = set()
    result: dict[str, dict] = {}
    for a, t, text, peer in sorted(outs, key=lambda x: x[1].date):
        day = _parse_day(t.date)
        best = None
        for b, u, utext, upeer in ins:
            if b == a or u.id in used:
                continue
            if peer and b != peer or upeer and upeer != a:
                continue   # nomor di keterangan menunjuk akun lain
            fee = t.amount - u.amount
            if not (0 <= fee <= FEE_MAX):
                continue
            named = peer == b or upeer == a or names[b].search(text) or names[a].search(utext)
            if not named or not _masked_ok(text, numbers.get(b)) or not _masked_ok(utext, numbers.get(a)):
                continue
            window = DAYS_BANK if "bank" in (a, b) or a.startswith("c:") or b.startswith("c:") else DAYS_WALLET
            gap = (_parse_day(u.date) - day).days
            if not (0 <= gap <= window):
                continue
            score = (gap, fee)
            if best is None or score < best[0]:
                best = (score, b, u, fee)
        if best:
            _, b, u, fee = best
            used.add(u.id)
            result[t.id] = {"kind": "internal", "category": "", "fee": fee, "peer": b}
            result[u.id] = {"kind": "internal", "category": "", "peer": a}
        elif peer:
            result[t.id] = {"kind": "internal", "category": "", "peer": peer}
    for b, u, _, upeer in ins:
        if upeer and u.id not in result:
            result[u.id] = {"kind": "internal", "category": "", "peer": upeer}
    return result
