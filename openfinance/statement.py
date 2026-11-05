"""E statement (mutasi) dari dompet yang belum bisa dihubungkan, mis. JOJO.

Pengguna mengunggah PDF mutasi, Laju membaca baris transaksinya, lalu memperlakukannya seperti dompet
terhubung, dengan satu beda: ini bukti dokumen, bukan data langsung dari penyedia, jadi bobotnya di bawah
API (lihat dataTrust di public/core.js).

Pembaca PDF di sini sengaja tanpa pustaka tambahan: cukup untuk PDF berbasis teks (bukan hasil scan).
Kalau pypdf terpasang, pypdf dipakai lebih dulu.

Format baris yang dikenali (satu transaksi per baris):
    03/11/2026  Transfer masuk dari GoPay           +150.000
    2026-11-03  Pembayaran QRIS Warung Bu Sri      -25.000
    03/11/2026  Pencairan pendapatan mitra  CR  150.000      (CR = masuk, DB = keluar)
Saldo akhir dibaca dari baris "Saldo akhir: Rp1.250.000".

Format blok (riwayat transaksi GoPay, satu transaksi beberapa baris):
    30/10/2026
    04:21
    Spotify A320261029212101UZ8I
    QpBAgSID
    GoPay Saldo -Rp119.900
Jumlah tanpa tanda minus = uang masuk. Metode pembayaran selain saldo dompet (mis. "BCA VA") ikut ke
keterangan, supaya top up dari rekening bisa dipasangkan. Nomor HP pemilik di kepala dokumen ikut dibaca.
"""
from __future__ import annotations

import base64
import random
import re
import zlib
from datetime import date, datetime, timedelta

from .base import RawTransaction

ROW = re.compile(
    r"^(?P<d>\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2})\s+(?P<desc>.+?)\s+"
    r"(?P<sign>[+\-−]|CR|DB|Masuk|Keluar)?\s*(?:Rp\.?\s?)?(?P<amt>\d{1,3}(?:[.,]\d{3})+|\d+)(?:,\d{2})?\s*(?P<sign2>CR|DB)?$",
    re.IGNORECASE)
DATE_ONLY = re.compile(r"^(\d{2}/\d{2}/\d{4})$")
TIME_ONLY = re.compile(r"^(\d{2}):(\d{2})$")
BLOCK_AMT = re.compile(r"^(?P<method>.*?)\s*(?P<sign>[-−])?\s*Rp\.?\s?(?P<amt>\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?$")
TX_ID = re.compile(r"\s+[A-Za-z0-9]{12,}$")       # ID transaksi panjang di ujung keterangan
OWNER_PHONE = re.compile(r"^\+?(?:62|0)8\d{7,12}$")
SELF_METHOD = re.compile(r"^(gopay saldo|saldo|ovo cash|dana saldo|shopeepay saldo)?$", re.IGNORECASE)
BALANCE = re.compile(r"saldo akhir\s*:?\s*Rp\.?\s?(\d{1,3}(?:[.,]\d{3})+|\d+)", re.IGNORECASE)


class StatementError(Exception):
    pass


# ---------------------------------------------------------------- baca PDF
def _pdf_strings(chunk: bytes) -> str:
    """Ambil teks dari operator Tj/TJ di satu content stream. Pindah baris (Td, TD, T*, ', ET) jadi baris baru."""
    out, i, n = [], 0, len(chunk)
    while i < n:
        c = chunk[i:i + 1]
        if c == b"(":
            depth, j, buf = 1, i + 1, bytearray()
            while j < n and depth:
                ch = chunk[j]
                if ch == 0x5C and j + 1 < n:   # backslash escape
                    nxt = chunk[j + 1:j + 2]
                    buf += {b"n": b"\n", b"r": b"", b"t": b" "}.get(nxt, nxt)
                    j += 2
                    continue
                if ch == 0x28:
                    depth += 1
                elif ch == 0x29:
                    depth -= 1
                    if not depth:
                        break
                buf.append(ch)
                j += 1
            out.append(buf.decode("latin-1"))
            i = j + 1
            continue
        m = re.match(rb"\s(Td|TD|T\*|ET|')(?=\s|$)", chunk[i:i + 4])
        if m:
            out.append("\n")
        i += 1
    return re.sub(r"[ \t]+\n", "\n", "".join(out))


def pdf_text(data: bytes) -> str:
    if not data.startswith(b"%PDF"):
        raise StatementError("File ini bukan PDF.")
    try:
        import io
        from pypdf import PdfReader  # type: ignore
        text = "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(data)).pages)
        if text.strip():
            return text
    except Exception:  # pypdf tidak terpasang atau gagal: pakai pembaca sederhana
        pass
    parts = []
    for m in re.finditer(rb"\bobj\s*<<((?:(?!\bobj\b).)*?)>>\s*stream\r?\n", data, re.S):
        head, start = m.group(1), m.end()
        end = data.find(b"endstream", start)
        if end < 0:
            continue
        body = data[start:end]
        if b"ASCII85Decode" in head:
            try:
                raw85 = body.strip()
                raw85 = raw85[2:] if raw85.startswith(b"<~") else raw85
                body = base64.a85decode(raw85.split(b"~>")[0])
            except ValueError:
                continue
        if b"FlateDecode" in head:
            try:
                body = zlib.decompressobj().decompress(body)   # sisa baris baru di akhir stream diabaikan
            except zlib.error:
                continue
        elif b"/Filter" in head and b"ASCII85Decode" not in head:
            continue   # filter lain (gambar, dll.) dilewati
        parts.append(_pdf_strings(body))
    return "\n".join(parts)


def _amount(s: str) -> int:
    return int(re.sub(r"[.,]", "", s))


def _date(s: str) -> date:
    if "-" in s and len(s.split("-")[0]) == 4:
        return date.fromisoformat(s)
    d, m, y = re.split(r"[/-]", s)
    return date(int(y), int(m), int(d))


def _parse_blocks(lines: list[str], name: str) -> list[RawTransaction]:
    """Format blok: baris tanggal sendiri, baris jam, keterangan (+ ID transaksi), lalu baris metode + jumlah."""
    txs: list[RawTransaction] = []
    starts = [i for i, l in enumerate(lines) if DATE_ONLY.match(l)]
    for n, i in enumerate(starts):
        block = lines[i + 1:(starts[n + 1] if n + 1 < len(starts) else len(lines))]
        amt_i = next((k for k, l in enumerate(block) if BLOCK_AMT.match(l)), None)
        if amt_i is None:
            continue
        try:
            d = _date(DATE_ONLY.match(lines[i]).group(1))
        except ValueError:
            continue
        hh, mm = "12", "00"
        rest = block[:amt_i]
        if rest and TIME_ONLY.match(rest[0]):
            hh, mm = TIME_ONLY.match(rest[0]).groups()
            rest = rest[1:]
        desc = TX_ID.sub("", rest[0]).strip() if rest else ""
        m = BLOCK_AMT.match(block[amt_i])
        method = m.group("method").strip()
        if method and not SELF_METHOD.match(method):
            desc = f"{desc} lewat {method}".strip()
        if not desc:
            continue
        txs.append(RawTransaction(id=f"st-{name}-{d.isoformat()}-b{i:04d}", date=f"{d.isoformat()}T{hh}:{mm}:00+07:00",
                                  amount=_amount(m.group("amt")), direction="out" if m.group("sign") else "in", description=desc))
    return txs


def parse(text: str, name: str) -> dict:
    """Baris teks mutasi -> transaksi Laju. Error kalau tidak ada satu baris pun yang terbaca."""
    txs: list[RawTransaction] = []
    lines = [l.strip() for l in text.splitlines()]
    for k, line in enumerate(lines):
        m = ROW.match(line)
        if not m:
            continue
        sign = (m.group("sign") or m.group("sign2") or "").lower()
        if sign in ("+", "cr", "masuk"):
            direction = "in"
        elif sign in ("-", "−", "db", "keluar"):
            direction = "out"
        else:
            continue   # arah tidak jelas: lebih baik dilewati daripada salah hitung
        try:
            d = _date(m.group("d"))
        except ValueError:
            continue
        txs.append(RawTransaction(id=f"st-{name}-{d.isoformat()}-{k:04d}", date=f"{d.isoformat()}T12:00:00+07:00",
                                  amount=_amount(m.group("amt")), direction=direction, description=m.group("desc").strip()))
    if not txs:
        txs = _parse_blocks(lines, name)
    if not txs:
        raise StatementError("Tidak ada transaksi yang terbaca. Pastikan PDF berasal dari aplikasinya langsung (bukan foto atau scan), atau isi rekap bulanan.")
    b = BALANCE.search(text)
    days = sorted(t.date[:10] for t in txs)
    owner = next((l for l in lines[:15] if OWNER_PHONE.match(l.replace(" ", ""))), None)
    return {"transactions": txs, "balance": _amount(b.group(1)) if b else None, "from": days[0], "to": days[-1],
            "phone": re.sub(r"\D", "", owner) if owner else None}


def merge(old: list[RawTransaction], new: list[RawTransaction]) -> list[RawTransaction]:
    """Unggahan bulan berikutnya menambah riwayat. Baris yang sama (tanggal, arah, jumlah, keterangan) tidak dihitung dua kali."""
    key = lambda t: (t.date[:10], t.direction, t.amount, t.description.lower())  # noqa: E731
    seen = {key(t) for t in old}
    return old + [t for t in new if key(t) not in seen]


# ---------------------------------------------------------------- tulis PDF (contoh / simulasi)
def build_pdf(name: str, lines: list[str]) -> bytes:
    """PDF satu halaman per 45 baris, teks biasa (Helvetica). Dipakai untuk contoh e statement di mode simulasi."""
    pages = [lines[i:i + 45] for i in range(0, len(lines), 45)] or [[]]
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", None, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    kids = []
    for pl in pages:
        esc = lambda s: s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")  # noqa: E731
        body = "BT /F1 9 Tf 40 800 Td 12 TL\n" + "".join(f"({esc(l)}) Tj T*\n" for l in pl) + "ET"
        stream = zlib.compress(body.encode("latin-1", "replace"))
        objs.append(b"<< /Length %d /Filter /FlateDecode >>\nstream\n" % len(stream) + stream + b"\nendstream")
        objs.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>" % len(objs))
        kids.append(len(objs))
    objs[1] = b"<< /Type /Pages /Kids [" + b" ".join(b"%d 0 R" % k for k in kids) + b"] /Count %d >>" % len(kids)
    out, offs = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return bytes(out)


def rp(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def sample_lines(name: str, seed: str, mirror: list[tuple[str, str, int]], platform_label: str, days: int = 30,
                 today: date | None = None) -> list[str]:
    """Isi e statement contoh 30 hari: pencairan narik, belanja, dan sisi rekening dari pindahan dengan dompet
    terhubung (`mirror` = [(tanggal ISO, keterangan, jumlah +masuk/-keluar)]) supaya pencocokan antar akun bisa didemokan."""
    today = today or date.today()
    rnd = random.Random(seed)
    rows: list[tuple[str, str, int]] = []
    for i in range(days):
        d = today - timedelta(days=i)
        if rnd.random() < 0.55:
            rows.append((d.isoformat(), f"Pencairan pendapatan mitra {platform_label}", int(round(rnd.uniform(40_000, 110_000), -3))))
        if rnd.random() < 0.5:
            rows.append((d.isoformat(), "Pembayaran QRIS Warung Makan Sederhana", -int(round(rnd.uniform(15_000, 35_000), -2))))
        if rnd.random() < 0.3:
            rows.append((d.isoformat(), "Pembayaran SPBU Pertamina", -int(round(rnd.uniform(20_000, 40_000), -2))))
    start = (today - timedelta(days=days - 1)).isoformat()
    for day, desc, amt in mirror:
        if start <= day <= today.isoformat():
            rows.append((day, desc, amt))
    rows.sort()
    bal = 150_000 + sum(a for _, _, a in rows)
    out = [f"{name.upper()}  E STATEMENT / MUTASI REKENING", f"Periode: {start} s/d {today.isoformat()}",
           "Dokumen contoh untuk simulasi Laju", "", "Tanggal     Keterangan                               Jumlah"]
    for day, desc, a in rows:
        dd = datetime.fromisoformat(day).strftime("%d/%m/%Y")
        out.append(f"{dd}  {desc}  {'+' if a > 0 else '-'}{rp(abs(a))}")
    out += ["", f"Saldo akhir: Rp{rp(max(bal, 0))}"]
    return out
