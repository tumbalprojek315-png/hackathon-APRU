"""Membuat public/demo-data.json: data e-wallet contoh untuk dipakai saat tanpa server.

Dipakai oleh mode contoh di browser (public/demo-mode.js), supaya aplikasi yang diterbitkan
ke GitHub Pages tetap bisa mendemokan penghubungan e-wallet. Isinya sama persis dengan yang
dihasilkan MockProvider saat server berjalan, hanya saja dihitung sekali lalu disimpan.

Jalankan dari folder laju:  python tools/buat-data-contoh.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from openfinance import statement as stmt                      # noqa: E402
from openfinance import CATEGORY_LABELS, PLATFORM_LABELS      # noqa: E402
from openfinance.categorize import history, summarize          # noqa: E402
from openfinance.mock import MockProvider                      # noqa: E402
from openfinance.base import LinkedAccount                     # noqa: E402

PERIOD_DAYS, HISTORY_DAYS, RECENT = 30, 180, 20
SEED = "contoh-github-pages"


def wallet_record(provider: MockProvider, wallet_id: str) -> dict:
    acct = LinkedAccount(wallet_id=wallet_id, access_token="demo", account_name="Akun contoh",
                         account_ref="08** **** 7890", extra={"seed": f"{SEED}:{wallet_id}:7890"})
    raw = provider.fetch_transactions(acct, HISTORY_DAYS)
    summary, items = summarize(raw, PERIOD_DAYS)
    summary["history"] = history(raw)
    return {
        "walletId": wallet_id,
        "accountName": acct.account_name,
        "accountRef": acct.account_ref,
        "summary": summary,
        "recent": [t.to_dict() if hasattr(t, "to_dict") else t for t in items[:RECENT]],
    }


def statement_record(name: str) -> dict:
    lines = stmt.sample_lines(name, seed=SEED + name, mirror=[], platform_label="Gojek")
    info = stmt.parse(stmt.pdf_text(stmt.build_pdf(name, lines)), name)
    raw = info["transactions"]
    days = sorted(t.date[:10] for t in raw)
    from datetime import date
    first, last = date.fromisoformat(days[0]), date.fromisoformat(days[-1])
    summary, items = summarize(raw, max(1, (last - first).days + 1), today=last)
    summary["history"] = history(raw, today=last)
    return {
        "walletId": "c:" + name, "source": "statement", "accountName": name,
        "accountRef": f"E statement · contoh-{name.lower()}.pdf",
        "summary": summary, "recent": [t.to_dict() if hasattr(t, "to_dict") else t for t in items[:RECENT]],
        "period": {"from": days[0], "to": days[-1]}, "balance": info.get("balance"),
    }


def write_sample_pdf(name: str) -> Path:
    """PDF mutasi contoh yang bisa benar-benar diunggah pengguna, untuk mencoba pembaca PDF."""
    lines = stmt.sample_lines(name, seed=SEED + name, mirror=[], platform_label="Gojek")
    out = ROOT / "public" / f"contoh-estatement-{name.lower()}.pdf"
    out.write_bytes(stmt.build_pdf(name, lines))
    return out


def main() -> None:
    provider = MockProvider()
    data = {
        "note": "Dibuat oleh tools/buat-data-contoh.py. Jangan diubah tangan.",
        "periodDays": PERIOD_DAYS,
        "categoryLabels": CATEGORY_LABELS,
        "platformLabels": PLATFORM_LABELS,
        "wallets": {w: wallet_record(provider, w) for w in provider.supported_wallets},
        "statement": statement_record("JOJO"),
    }
    out = ROOT / "public" / "demo-data.json"
    out.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    kb = out.stat().st_size / 1024
    print(f"{out.relative_to(ROOT)} dibuat: {len(data['wallets'])} dompet, {kb:.0f} KB")
    pdf = write_sample_pdf("JOJO")
    print(f"{pdf.relative_to(ROOT)} dibuat: {pdf.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
