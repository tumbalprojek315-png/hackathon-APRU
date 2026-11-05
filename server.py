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
from datetime import date, datetime, timedelta, timezone
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

from openfinance import CATEGORY_LABELS, PLATFORM_LABELS, ProviderError, get_provider, history, pair_transfers, phone_core, summarize
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
_sessions: dict[str, tuple[str, str]] = {}     # session_id -> (uid, nomor HP yang diisi di Izin data)


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


def recalc_statement(rec: dict, overrides: dict | None = None) -> None:
    """Hitung ulang ringkasan dari transaksi yang tersimpan. Periode diambil dari isi dokumen,
    bukan dari tanggal hari ini, supaya mutasi bulan lalu tetap terbaca utuh."""
    raw = rec["transactions"]
    days = sorted(t.date[:10] for t in raw)
    last = date.fromisoformat(days[-1])
    # Sama seperti e-wallet: angka utama = 30 hari terakhir di dokumen, tidak dirata ratakan dengan bulan lain.
    # Bulan sebelumnya hanya masuk riwayat per bulan, yang dihitung mundur dari hari ini supaya sejajar dengan e-wallet.
    summary, items = summarize(raw, PERIOD_DAYS, today=last, overrides=overrides)
    summary["history"] = history(raw, overrides=overrides)
    rec.update(summary=summary, recent=items[:RECENT_LIMIT], **{"from": days[0], "to": days[-1]})


def recompute(user: dict) -> None:
    """Semua akun terdaftar satu pengguna dihitung bersama: pindahan antar akun sendiri yang pasangannya ketemu
    tidak dihitung dua kali (lihat openfinance.categorize.pair_transfers). Dipanggil setiap ada akun yang
    disinkron, diunggah, atau dihapus, karena pasangan di akun lain bisa ikut berubah."""
    wallets = {wid: r for wid, r in user.get("wallets", {}).items() if r.get("raw") is not None}
    stmts = user.get("statements", {})
    accounts = {wid: r["raw"] for wid, r in wallets.items()}
    accounts.update({"c:" + n: r["transactions"] for n, r in stmts.items() if r.get("transactions")})
    numbers = {wid: r.get("phone", "") for wid, r in wallets.items()}   # nomor terverifikasi saat penghubungan
    numbers.update({"c:" + n: r.get("phone", "") for n, r in stmts.items() if r.get("phone")})   # nomor di kepala e statement
    ov = pair_transfers(accounts, numbers)
    for r in wallets.values():
        summary, items = summarize(r["raw"], PERIOD_DAYS, overrides=ov)
        summary["history"] = history(r["raw"], overrides=ov)
        r.update(summary=summary, recent=items[:RECENT_LIMIT])
    for r in stmts.values():
        if r.get("transactions"):
            recalc_statement(r, ov)


def sample_mirror(user: dict) -> list[tuple[str, str, int]]:
    """Contoh e statement (simulasi) ikut memuat sisi rekening dari tarik saldo dan top up di e-wallet terhubung,
    supaya pencocokan pindahan antar akun bisa didemokan. Hasil: [(tanggal ISO, keterangan, jumlah +masuk/-keluar)]."""
    from openfinance.mock import OTHER_PHONE, PEER_LABELS, VA_PREFIX, topup_desc
    rows = []
    for wid, r in user.get("wallets", {}).items():
        for t in r.get("raw") or []:
            d, low = date.fromisoformat(t.date[:10]), t.description.lower()
            h = sum(map(ord, t.id))
            if t.direction == "out" and low.startswith("tarik saldo"):
                rows.append((min(d + timedelta(days=h % 2), date.today()).isoformat(), f"Transfer masuk dari {PEER_LABELS.get(wid, wid)}", t.amount - (2_500 if h % 3 == 0 else 0)))
            elif t.direction == "in" and low.startswith("top up saldo dari"):
                rows.append((d.isoformat(), topup_desc(wid, r.get("phone", ""), d), -(t.amount + (1_000 if h % 2 else 0))))
    if rows:   # top up ke e-wallet orang lain: nomornya bukan milik pengguna, jadi tetap pengeluaran
        last = max(x[0] for x in rows)
        rows.append((last, f"Top up OVO {VA_PREFIX['ovo']}{OTHER_PHONE}", -75_000))
    return rows


def all_views(user: dict) -> list[dict]:
    return ([public_view(r) for r in user.get("wallets", {}).values()]
            + [statement_view(n, r) for n, r in user.get("statements", {}).items() if r.get("summary")])


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
                views = all_views(_users.get(uid[0], {}))
            return self._send(200, {"wallets": views}, uid=uid)
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
            phone = re.sub(r"\D", "", str(body.get("phone", "")))[:15]
            if phone and len(phone) < 9:
                return self._error(400, "bad_phone", "Nomor HP minimal 9 digit.", uid)
            if wallet_id not in provider.supported_wallets:
                return self._error(400, "unsupported_wallet", "E-wallet ini belum didukung penyedia.", uid)
            try:
                sess = provider.create_link_session(uid[0], wallet_id, self._base_url() + "/api/wallets/callback", phone=phone)
            except ProviderError as e:
                return self._error(e.status, e.code, str(e), uid)
            except NotImplementedError:
                return self._error(501, "not_implemented", "Integrasi penyedia asli belum diisi (openfinance/live.py).", uid)
            with _lock:
                _sessions[sess.session_id] = (uid[0], phone)
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
                user = _users.get(uid[0], {})
                user.get("statements", {}).pop(name, None)
                recompute(user)
                views = all_views(user)
            return self._send(200, {"ok": True, "wallets": views}, uid=uid)
        if url.path == "/api/wallets":   # reset: semua e-wallet dan e statement pengguna ini dihapus
            with _lock:
                user = _users.pop(uid[0], {})
            for rec in user.get("wallets", {}).values():
                try:
                    provider.revoke(rec["account"])
                except (ProviderError, NotImplementedError) as e:
                    print("revoke gagal:", e)
            return self._send(200, {"ok": True, "wallets": []}, uid=uid)
        m = re.fullmatch(r"/api/wallets/([a-z]+)", url.path)
        if not m:
            return self._error(404, "not_found", "Alamat API tidak dikenal.", uid)
        with _lock:
            user = _users.get(uid[0], {})
            rec = user.get("wallets", {}).pop(m.group(1), None)
            recompute(user)
            views = all_views(user)
        if rec:
            try:
                provider.revoke(rec["account"])
            except (ProviderError, NotImplementedError) as e:
                print("revoke gagal:", e)
        return self._send(200, {"ok": True, "wallets": views}, uid=uid)

    # ---------------------------------------------------------------- actions
    def _callback(self, q: dict, uid):
        params = {k: v[0] for k, v in q.items()}
        sid = params.get("session", "")
        with _lock:
            owner, expected = _sessions.pop(sid, (None, ""))

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
        # Nomor akun yang benar benar terhubung harus sama dengan nomor yang diisi di Izin data. Kalau penyedia
        # tidak mengembalikan nomor, pengecekan ini dilewati dan nomornya tidak dipakai untuk mencocokkan pindahan.
        got = account.extra.get("phone", "")
        if expected and got and phone_core(got) != phone_core(expected):
            try:
                provider.revoke(account)
            except (ProviderError, NotImplementedError):
                pass
            return back(link="error", reason="phone_mismatch", wallet=account.wallet_id, got=got[-4:])
        with _lock:
            _users.setdefault(owner, {"wallets": {}})["wallets"][account.wallet_id] = {
                "account": account, "linked_at": now_iso(), "phone": got,
            }
        return back(link="ok", wallet=account.wallet_id)

    def _sync(self, wallet_id: str, uid):
        with _lock:
            rec = _users.get(uid[0], {}).get("wallets", {}).get(wallet_id)
        if not rec:
            return self._error(404, "not_linked", "E-wallet ini belum terhubung atau izinnya sudah berakhir. Hubungkan lagi.", uid)
        with _lock:
            peers = {w: r.get("phone", "") for w, r in _users.get(uid[0], {}).get("wallets", {}).items() if w != wallet_id}
        try:
            # mode simulasi: penyedia tahu dompet lain yang terhubung, supaya pindahan antar akun punya pasangan
            raw = (provider.fetch_transactions(rec["account"], HISTORY_DAYS, peers=peers) if not provider.live
                   else provider.fetch_transactions(rec["account"], HISTORY_DAYS))
        except ProviderError as e:
            return self._error(e.status, e.code, str(e), uid)
        except NotImplementedError:
            return self._error(501, "not_implemented", "Integrasi penyedia asli belum diisi (openfinance/live.py).", uid)
        with _lock:
            user = _users[uid[0]]
            rec.update(raw=raw, synced_at=now_iso())
            bank = user["wallets"].get("bank")
        # mode simulasi: rekening bank dibuat ulang supaya pasangan pindahan dari dompet yang baru terhubung ikut ada
        if not provider.live and wallet_id != "bank" and bank and bank.get("raw") is not None:
            try:
                braw = provider.fetch_transactions(bank["account"], HISTORY_DAYS,
                                                   peers={w: r.get("phone", "") for w, r in user["wallets"].items() if w != "bank"})
                with _lock:
                    bank["raw"] = braw
            except ProviderError:
                pass
        with _lock:
            recompute(user)
            others = [v for v in all_views(user) if v["walletId"] != wallet_id]
        # `others`: ringkasan akun lain ikut berubah kalau ada pindahan antar akun sendiri
        return self._send(200, {**public_view(rec), "others": others}, uid=uid)

    def _statement(self, sample: bool, body: dict, uid):
        """Unggah PDF mutasi (atau buat contoh saat simulasi). Unggahan berikutnya menambah riwayat."""
        name = re.sub(r"[^\w .-]", "", str(body.get("name", ""))).strip()[:40] or "Rekening"
        if sample:
            with _lock:
                user = _users.get(uid[0], {})
                mirror = sample_mirror(user) if not user.get("statements") else []
            lines = stmt.sample_lines(name, seed=uid[0] + name, mirror=mirror, platform_label="Gojek")
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
            if info.get("phone"):
                rec["phone"] = info["phone"]   # nomor HP pemilik di kepala dokumen (mis. riwayat GoPay)
            user = _users[uid[0]]
            recompute(user)
            others = [v for v in all_views(user) if v["walletId"] != "c:" + name]
        return self._send(200, {**statement_view(name, rec), "others": others}, uid=uid)


if __name__ == "__main__":
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    mode = "ASLI" if provider.live else "SIMULASI"
    print(f"Laju berjalan di {BASE_URL or f'http://{HOST}:{PORT}'}  (penyedia: {provider.name}, mode {mode})")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
