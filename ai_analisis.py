"""Analisis keuangan dengan Gemini. Kunci API hanya ada di server, tidak pernah di browser."""
from __future__ import annotations

import json
import os
import threading
import time

MODEL = os.environ.get("LAJU_AI_MODEL", "gemini-2.5-flash")  # cek nama model terbaru di AI Studio
THINKING_BUDGET = int(os.environ.get("LAJU_AI_THINKING", "1024"))  # 0 mematikan token berpikir
JEDA_DETIK = 20      # jarak minimal antar permintaan per pengguna
BATAS_HARIAN = 20

LANGKAH = ["data", "minus", "bantalan", "darurat", "investasi", "tumbuh"]

SKEMA = {
    "type": "object",
    "properties": {
        "kesimpulan": {"type": "string"},
        "kekuatan": {"type": "array", "items": {"type": "string"}},
        "perbaikan": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "judul": {"type": "string"},
                "alasan": {"type": "string"},
                "langkahId": {"type": "string", "enum": LANGKAH},
            },
            "required": ["judul", "alasan", "langkahId"],
        }},
        "prioritas30Hari": {"type": "array", "items": {"type": "string"}},
        "peringatan": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["kesimpulan", "kekuatan", "perbaikan", "prioritas30Hari", "peringatan"],
}

SISTEM = """Anda penasihat keuangan untuk pengemudi ojek online di Indonesia.

Cara menjawab:
- Bahasa Indonesia sehari hari. Kalimat pendek. Hindari istilah asing dan singkatan keuangan.
- Angka selalu rupiah penuh, tanpa pembulatan yang menyesatkan.
- Satu poin maksimal dua kalimat.

Tangga yang dipakai aplikasi, dan jangan diubah urutannya:
0 data, pengguna melengkapi pemasukan dan pengeluaran
1 minus, pengeluaran harus di bawah pemasukan
2 bantalan, kumpulkan dana penyangga sambil melunasi utang berbunga tinggi
3 darurat, dana darurat tiga sampai enam bulan pengeluaran
4 investasi, sisihkan rutin setelah darurat terisi
5 tumbuh, tujuan jangka panjang

Aturan keras:
- Jangan pernah menyarankan pinjaman online, paylater, atau utang baru berbunga tinggi.
- Jangan menyebut nama produk investasi, saham, kripto, atau lembaga keuangan tertentu.
- Jangan menyuruh melompati langkah. Kalau Langkah 1 belum selesai, jangan bicara investasi.
- Baris bertanda "isian sendiri" belum terverifikasi. Sebut sebagai perkiraan pengguna, bukan
  fakta. Kalau selisihnya besar dengan data e-wallet, itu yang pertama diangkat.
- Kalau sebuah data tidak ada, katakan tidak ada. Jangan menebak angka.
- Anda bukan penasihat berlisensi. Jangan memberi saran investasi spesifik.

Setiap poin pada "perbaikan" harus menyebut langkahId tempat masalah itu diperbaiki."""

_lock = threading.Lock()
_pakai: dict[str, list[float]] = {}
_klien = None
_alasan_mati = ""


class AIError(Exception):
    def __init__(self, code: str, pesan: str, status: int = 502):
        super().__init__(pesan)
        self.code, self.status = code, status


def siap() -> bool:
    """True kalau SDK terpasang dan kunci API ada."""
    global _klien, _alasan_mati
    if _klien is not None:
        return True
    if not os.environ.get("GEMINI_API_KEY"):
        _alasan_mati = "Kunci GEMINI_API_KEY belum diisi di server."
        return False
    try:
        from google import genai
    except ImportError:
        _alasan_mati = "Pustaka google-genai belum terpasang. Jalankan: pip install google-genai"
        return False
    _klien = genai.Client()  # membaca GEMINI_API_KEY dari lingkungan
    return True


def alasan() -> str:
    return _alasan_mati or "Analisis AI belum tersedia."


def boleh(uid: str) -> tuple[bool, str]:
    """Batas pemakaian sederhana supaya satu halaman tidak menghabiskan kuota."""
    sekarang = time.time()
    with _lock:
        riwayat = [t for t in _pakai.get(uid, []) if sekarang - t < 86400]
        if riwayat and sekarang - riwayat[-1] < JEDA_DETIK:
            return False, f"Tunggu {int(JEDA_DETIK - (sekarang - riwayat[-1])) + 1} detik lagi."
        if len(riwayat) >= BATAS_HARIAN:
            return False, f"Batas {BATAS_HARIAN} analisis per hari sudah tercapai."
        riwayat.append(sekarang)
        _pakai[uid] = riwayat
    return True, ""


def analisa(konteks: dict, bahasa: str = "id") -> dict:
    if not siap():
        raise AIError("ai_off", alasan(), 503)
    from google.genai import errors, types

    minta = "Jawab dalam bahasa Inggris." if bahasa == "en" else "Jawab dalam bahasa Indonesia."
    isi = f"{minta}\n\nData keuangan pengguna:\n\n{json.dumps(konteks, ensure_ascii=False, sort_keys=True)}"
    try:
        jawab = _klien.models.generate_content(
            model=MODEL,
            contents=isi,
            config=types.GenerateContentConfig(
                system_instruction=SISTEM,
                response_mime_type="application/json",
                response_json_schema=SKEMA,
                temperature=0.3,
                # Token berpikir ikut terhitung di batas keluaran. Batas kecil membuat JSON terpotong.
                max_output_tokens=8192,
                thinking_config=types.ThinkingConfig(thinking_budget=THINKING_BUDGET),
            ),
        )
    except errors.APIError as e:
        if e.code in (401, 403):
            raise AIError("ai_key", "Kunci API ditolak. Periksa GEMINI_API_KEY.", 502)
        if e.code == 429:
            raise AIError("ai_busy", "Gemini sedang penuh. Coba lagi sebentar.", 429)
        if e.code == 400:
            raise AIError("ai_bad", f"Permintaan ditolak Gemini: {e.message}", 502)
        raise AIError("ai_down", f"Gemini membalas galat {e.code}.", 502)
    except Exception:  # koneksi putus, DNS gagal, dan sejenisnya
        raise AIError("ai_net", "Server tidak bisa menghubungi Gemini.", 502)

    kandidat = (jawab.candidates or [None])[0]
    alasan_henti = str(getattr(kandidat, "finish_reason", "") or "")
    teks = (jawab.text or "").strip()  # kosong kalau Gemini memblokir jawaban
    print(f"[ai] henti={alasan_henti or '-'} panjang={len(teks)}")  # hanya metadata, tanpa isi jawaban
    if "MAX_TOKENS" in alasan_henti:
        raise AIError("ai_bentuk", "Jawaban Gemini terpotong. Coba lagi.", 502)
    if teks.startswith("```"):  # jaga-jaga kalau model membungkus JSON dengan pagar kode
        teks = teks.strip("`").removeprefix("json").strip()
    try:
        hasil = json.loads(teks)
    except json.JSONDecodeError:
        raise AIError("ai_bentuk", "Jawaban Gemini tidak bisa dibaca.", 502)
    if not isinstance(hasil, dict):
        raise AIError("ai_bentuk", "Jawaban Gemini tidak sesuai bentuk.", 502)

    um = jawab.usage_metadata
    hasil["_model"] = MODEL
    hasil["_token"] = {
        "masuk": getattr(um, "prompt_token_count", 0) or 0,
        "keluar": getattr(um, "candidates_token_count", 0) or 0,
        "dariCache": getattr(um, "cached_content_token_count", 0) or 0,
    }
    return hasil