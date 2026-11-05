"""Server Laju: menyajikan halaman di public/ dan API penghubungan e-wallet.

Jalankan:  python server.py          (mode simulasi, http://127.0.0.1:5174)
Mode asli: set LAJU_PROVIDER=live + kunci API, lihat openfinance/live.py.

Kunci API penyedia dan token akses akun hanya ada di server ini; browser
hanya menerima ringkasan dan daftar transaksi yang sudah diolah.
Penyimpanan masih di memori (hilang saat server dimatikan) — cukup untuk
demo; versi produksi butuh database dengan token terenkripsi.
"""
from __future__ import annotations

import base64
import json
import os
import re
import secrets
import threading
from datetime import date, datetime, timezone
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

from openfinance import CATEGORY_LABELS, PLATFORM_LABELS, ProviderError, get_provider, history, summarize
from openfinance import statement as stmt

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
HOST = os.environ.get("LAJU_HOST", "127.0.0.1")
PORT = int(os.environ.get("LAJU_PORT", "5174"))
BASE_URL = os.environ.get("LAJU_BASE_URL", "")  # isi saat deploy, mis. https://laju.example.id
PERIOD_DAYS = 30
HISTORY_DAYS = 180   # riwayat yang ditarik untuk tier kepercayaan (6 bulan)
RECENT_LIMIT = 40

provider = get_provider()
_lock = threading.Lock()
_users: dict[str, dict] = {}      # uid -> {"wallets": {wallet_id: record}}
_sessions: dict[str, str] = {}     # session_id -> uid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def public_view(rec: dict) -> dict:
    acct = rec["account"]
    return {
        "walletId": acct.wallet_id,
        "accountName": acct.account_name,
        "accountRef": acct.account_ref,
        "linkedAt": rec["linked_at"],
        "syncedAt": rec.get("synced_at"),
        "summary": rec.get("summary"),
        "recent": rec.get("recent", []),
    }


def statement_view(name: str, rec: dict) -> dict:
    """E statement ditampilkan seperti dompet, supaya hitungan di browser tidak perlu jalur khusus.
    Bedanya `source`: ini bukti dokumen, bukan data langsung dari penyedia."""
    return {
        "walletId": "c:" + name,
        "source": "statement",
        "accountName": name,
        "accountRef": f"E statement · {rec.get('filename', 'PDF')}",
        "linkedAt": rec["uploaded_at"],
        "syncedAt": rec["uploaded_at"],
        "summary": rec.get("summary"),
        "recent": rec.get("recent", []),
        "period": {"from": rec.get("from"), "to": rec.get("to")},
        "balance": rec.get("balance"),
    }


def recalc_statement(rec: dict) -> None:
    """Hitung ulang ringkasan dari transaksi yang tersimpan. Periode diambil dari isi dokumen,
    bukan dari tanggal hari ini, supaya mutasi bulan lalu tetap terbaca utuh."""
    raw = rec["transactions"]
    days = sorted(t.date[:10] for t in raw)
    first, last = date.fromisoformat(days[0]), date.fromisoformat(days[-1])
    span = max(1, (last - first).days + 1)
    summary, items = summarize(raw, span, today=last)
    summary["history"] = history(raw, today=last)
    rec.update(summary=summary, recent=items[:RECENT_LIMIT], **{"from": days[0], "to": days[-1]})


class Handler(SimpleHTTPRequestHandler):
    server_version = "Laju/0.2"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(PUBLIC), **kw)

    # ---------------------------------------------------------------- helpers
    def log_message(self, fmt, *args):  # lebih ringkas di terminal
        if self._is_health():  # cek LIVE tiap 2 detik tidak perlu memenuhi terminal
            return
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def _is_health(self) -> bool:
        return urlparse(getattr(self, "path", "") or "").path.endswith("/__health")

    def _health(self, head: bool = False):
        """Indikator LIVE/OFFLINE: jawaban apa pun = server hidup. Tidak boleh di-cache."""
        body = json.dumps({"ok": True, "t": int(datetime.now(timezone.utc).timestamp() * 1000)}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def _uid(self) -> tuple[str, bool]:
        jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        uid = jar["laju_uid"].value if "laju_uid" in jar else ""
        if re.fullmatch(r"[A-Za-z0-9_-]{16,64}", uid or ""):
            return uid, False
        return secrets.token_urlsafe(18), True

    def _send(self, status: int, payload: dict | None = None, *, uid: tuple[str, bool] | None = None, location: str | None = None):
        body = json.dumps(payload or {}, ensure_ascii=False).encode()
        self.send_response(status)
        if location:
            self.send_header("Location", location)
            self.send_header("Content-Length", "0")
        else:
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if uid and uid[1]:
            self.send_header("Set-Cookie", f"laju_uid={uid[0]}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000")
        self.end_headers()
        if not location:
            self.wfile.write(body)

    def _error(self, status: int, code: str, message: str, uid=None):
        self._send(status, {"error": {"code": code, "message": message}}, uid=uid)

    def _json_body(self, limit: int = 10_000) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > limit:
            raise ValueError("body too large")
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def _base_url(self) -> str:
        if BASE_URL:
            return BASE_URL.rstrip("/")
        host = self.headers.get("Host", f"{HOST}:{PORT}")
        if not re.fullmatch(r"(localhost|127\.0\.0\.1|\[::1\]):\d+", host):
            host = f"{HOST}:{PORT}"
        return f"http://{host}"

    def _guard(self) -> bool:
        """Perlindungan CSRF sederhana untuk permintaan yang mengubah data."""
        return self.headers.get("X-Requested-With") == "laju"

    def end_headers(self):
        if not self.path.startswith("/api/") and not self._is_health():
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    # ----------------------------------------------------------------- routes
    def do_HEAD(self):
        if self._is_health():
            return self._health(head=True)
        return super().do_HEAD()

    def do_GET(self):
        url = urlparse(self.path)
        if self._is_health():
            return self._health()
        if not url.path.startswith("/api/"):
            return super().do_GET()
        uid = self._uid()
        if url.path == "/api/config":
            return self._send(200, {
                "mode": "live" if provider.live else "simulasi",
                "provider": provider.name,
                "periodDays": PERIOD_DAYS,
                "supportedWallets": list(provider.supported_wallets),
                "categoryLabels": CATEGORY_LABELS,
                "platformLabels": PLATFORM_LABELS,
            }, uid=uid)
        if url.path == "/api/wallets":
            with _lock:
                u = _users.get(uid[0], {})
                recs = list(u.get("wallets", {}).values())
                stmts = [(n, r) for n, r in u.get("statements", {}).items() if r.get("summary")]
            return self._send(200, {"wallets": [public_view(r) for r in recs]
                                    + [statement_view(n, r) for n, r in stmts]}, uid=uid)
        if url.path == "/api/wallets/callback":
            return self._callback(parse_qs(url.query), uid)
        return self._error(404, "not_found", "Alamat API tidak dikenal.", uid)

    def do_POST(self):
        url = urlparse(self.path)
        uid = self._uid()
        if not self._guard():
            return self._error(403, "forbidden", "Permintaan ditolak.", uid)
        try:
            body = self._json_body(6_000_000 if url.path.startswith("/api/statements/") else 10_000)
        except (ValueError, json.JSONDecodeError):
            return self._error(400, "bad_request", "Format permintaan tidak valid.", uid)

        if url.path in ("/api/statements/upload", "/api/statements/sample"):
            return self._statement(url.path.endswith("/sample"), body, uid)

        if url.path == "/api/wallets/link":
            wallet_id = str(body.get("walletId", ""))
            if wallet_id not in provider.supported_wallets:
                return self._error(400, "unsupported_wallet", "E-wallet ini belum didukung penyedia.", uid)
            try:
                sess = provider.create_link_session(uid[0], wallet_id, self._base_url() + "/api/wallets/callback")
            except ProviderError as e:
                return self._error(e.status, e.code, str(e), uid)
            except NotImplementedError:
                return self._error(501, "not_implemented", "Integrasi penyedia asli belum diisi (openfinance/live.py).", uid)
            with _lock:
                _sessions[sess.session_id] = uid[0]
            return self._send(200, {"redirectUrl": sess.redirect_url}, uid=uid)

        m = re.fullmatch(r"/api/wallets/([a-z]+)/sync", url.path)
        if m:
            return self._sync(m.group(1), uid)
        return self._error(404, "not_found", "Alamat API tidak dikenal.", uid)

    def do_DELETE(self):
        url = urlparse(self.path)
        uid = self._uid()
        if not self._guard():
            return self._error(403, "forbidden", "Permintaan ditolak.", uid)
        if url.path == "/api/statements":
            name = (parse_qs(url.query).get("name") or [""])[0]
            with _lock:
                _users.get(uid[0], {}).get("statements", {}).pop(name, None)
            return self._send(200, {"ok": True}, uid=uid)
        m = re.fullmatch(r"/api/wallets/([a-z]+)", url.path)
        if not m:
            return self._error(404, "not_found", "Alamat API tidak dikenal.", uid)
        with _lock:
            rec = _users.get(uid[0], {}).get("wallets", {}).pop(m.group(1), None)
        if rec:
            try:
                provider.revoke(rec["account"])
            except (ProviderError, NotImplementedError) as e:
                print("revoke gagal:", e)
        return self._send(200, {"ok": True}, uid=uid)

    # ---------------------------------------------------------------- actions
    def _callback(self, q: dict, uid):
        params = {k: v[0] for k, v in q.items()}
        sid = params.get("session", "")
        with _lock:
            owner = _sessions.pop(sid, None)

        def back(**kw):
            return self._send(302, location="/onboarding.html?" + urlencode(kw), uid=uid)

        if not owner or owner != uid[0]:
            return back(link="error", reason="session_expired")
        try:
            account = provider.exchange(sid, params)
        except ProviderError as e:
            return back(link="error", reason=e.code, wallet=params.get("wallet", ""))
        except NotImplementedError:
            return back(link="error", reason="not_implemented")
        with _lock:
            _users.setdefault(owner, {"wallets": {}})["wallets"][account.wallet_id] = {
                "account": account, "linked_at": now_iso(),
            }
        return back(link="ok", wallet=account.wallet_id)

    def _sync(self, wallet_id: str, uid):
        with _lock:
            rec = _users.get(uid[0], {}).get("wallets", {}).get(wallet_id)
        if not rec:
            return self._error(404, "not_linked", "E-wallet ini belum terhubung atau izinnya sudah berakhir. Hubungkan lagi.", uid)
        try:
            raw = provider.fetch_transactions(rec["account"], HISTORY_DAYS)
        except ProviderError as e:
            return self._error(e.status, e.code, str(e), uid)
        except NotImplementedError:
            return self._error(501, "not_implemented", "Integrasi penyedia asli belum diisi (openfinance/live.py).", uid)
        summary, items = summarize(raw, PERIOD_DAYS)
        summary["history"] = history(raw)
        with _lock:
            rec.update(summary=summary, recent=items[:RECENT_LIMIT], synced_at=now_iso())
        return self._send(200, public_view(rec), uid=uid)

    def _statement(self, sample: bool, body: dict, uid):
        """Unggah PDF mutasi (atau buat contoh saat simulasi). Unggahan berikutnya menambah riwayat."""
        name = re.sub(r"[^\w .-]", "", str(body.get("name", ""))).strip()[:40] or "Rekening"
        if sample:
            lines = stmt.sample_lines(name, seed=uid[0] + name, mirror=[], platform_label="Gojek")
            data, filename = stmt.build_pdf(name, lines), f"contoh-{name.lower()}.pdf"
        else:
            try:
                data = base64.b64decode(str(body.get("data", "")), validate=True)
            except (ValueError, TypeError):
                return self._error(400, "bad_file", "Berkas tidak terbaca. Coba unggah ulang PDF-nya.", uid)
            filename = re.sub(r"[^\w. -]", "", str(body.get("filename", "")))[:60] or "estatement.pdf"
        try:
            info = stmt.parse(stmt.pdf_text(data), name)
        except stmt.StatementError as e:
            return self._error(400, "unreadable", str(e), uid)
        with _lock:
            store = _users.setdefault(uid[0], {"wallets": {}}).setdefault("statements", {})
            rec = store.get(name)
            if rec:
                rec["transactions"] = stmt.merge(rec["transactions"], info["transactions"])
                rec["filename"] = filename
            else:
                rec = store[name] = {"transactions": info["transactions"], "filename": filename, "uploaded_at": now_iso()}
            if info.get("balance") is not None:
                rec["balance"] = info["balance"]
            recalc_statement(rec)
        return self._send(200, statement_view(name, rec), uid=uid)


if __name__ == "__main__":
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    mode = "ASLI" if provider.live else "SIMULASI"
    print(f"Laju berjalan di {BASE_URL or f'http://{HOST}:{PORT}'}  (penyedia: {provider.name}, mode {mode})")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
