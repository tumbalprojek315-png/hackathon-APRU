# Panduan menanam Claude di Laju

Tujuan: tombol di kartu **Data untuk analisis AI** (halaman Rapor) mengirim konteks yang sudah ada
ke Claude, lalu menampilkan hasil analisanya di tempat yang sama.

Urutannya dibuat begini: Langkah 1 sampai 3 dan Langkah 6 bisa dikerjakan sekarang tanpa punya
credit sama sekali, dan tombolnya sudah jalan untuk demo. Langkah 4 ke atas baru butuh kunci API.

---

## Langkah 0. Soal credit

Yang perlu diketahui dulu supaya tidak salah harap.

1. **Langganan Claude (Pro atau Max) tidak memberi credit API.** Dua hal berbeda, tagihannya
   terpisah. API dibayar di muka lewat Console.
2. Cara dapat kunci: buka `console.anthropic.com`, bikin organisasi, masuk **Billing** lalu isi
   saldo, baru **API Keys** untuk membuat kunci. Kalau akun Anda dapat credit promo, jumlahnya
   kelihatan di halaman Billing itu. Jangan diasumsikan ada, cek sendiri.
3. **Biaya per klik tombol ini kecil.** Konteks Anda sekarang 14,4 KB, kira kira 5.000 token,
   ditambah aturan sistem sekitar 1.500 token, jadi masukan sekitar 7.000 token. Keluarannya
   sekitar 1.200 token.

   | Model | Harga per 1 juta token (masuk / keluar) | Perkiraan per klik | Klik per 1 dolar |
   |---|---|---|---|
   | `claude-opus-5-5` | 4,00 / 20,00 | sekitar 0,052 dolar | sekitar 19 |
   | `claude-sonnet-5-5` | 2,00 / 10,00 | sekitar 0,026 dolar | sekitar 38 |
   | `claude-haiku-5-5` | 0,10 / 0,50 | sekitar 0,0013 dolar | sekitar 770 |

   Jadi isi saldo paling kecil pun cukup untuk ratusan sampai ribuan kali demo kalau pakai Haiku.
   Angka di atas perkiraan, bukan janji. Ukur sendiri dengan `count_tokens` di Langkah 7.
4. **Kalau belum mau isi saldo sekarang**, pilihan yang nyata:
   - Pakai credit cloud yang mungkin sudah Anda punya. Claude juga dijual lewat Amazon Bedrock,
     Google Vertex, dan Microsoft Foundry. Kalau Anda punya credit AWS, GCP, atau Azure dari paket
     pelajar atau dari sponsor hackathon, credit itu bisa dipakai. Kodenya sama, cuma ganti kelas
     kliennya (`AnthropicBedrockMantle`, `AnthropicVertex`, `AnthropicFoundry`).
   - Tanya penyelenggara hackathon. Sponsor sering menyediakan kunci API bersama.
   - **Yang paling saya sarankan sekarang**: pasang Langkah 1 sampai 3 dan Langkah 6, yaitu
     endpoint server, tombolnya, plus jawaban contoh di mode contoh. Demo jalan penuh tanpa credit.
     Begitu ada kunci, satu variabel lingkungan diisi dan tombol yang sama langsung memanggil
     Claude asli. Tidak ada kode yang perlu diubah lagi.

   Satu syarat untuk yang terakhir: jawaban contoh **wajib** diberi label "contoh, bukan dari
   Claude" di tampilannya. Kalau tidak, demo Anda menipu penonton.

---

## Langkah 1. Kunci API tidak boleh ada di `public/`

Semua isi `public/` dikirim apa adanya ke browser siapa pun yang membuka link. Kunci yang ditaruh
di sana sama dengan kunci yang diumumkan. Jadi aturannya cuma satu: **browser memanggil server
Laju, server Laju yang memanggil Claude.**

```
browser  ->  POST /api/analisis (server.py)  ->  Claude API
                  kunci ada di sini saja
```

Simpan kuncinya sebagai variabel lingkungan di komputer yang menjalankan `server.py`.

```powershell
setx ANTHROPIC_API_KEY "sk-ant-..."
```

Tutup lalu buka lagi PowerShell supaya terbaca. Untuk satu sesi saja, tanpa disimpan:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Kalau nanti Anda bikin file `.env`, tambahkan ke `.gitignore`:

```
.env
```

---

## Langkah 2. Pasang SDK resmi

```bash
pip install anthropic
```

Proyek ini sekarang cuma pakai pustaka bawaan Python, supaya teman Anda bisa menjalankan
`python server.py` tanpa memasang apa pun. Itu tetap dijaga: di Langkah 3 impornya dibungkus `try`
sehingga kalau `anthropic` belum terpasang, server tetap hidup dan fitur AI saja yang mati.

---

## Langkah 3. Modul baru `ai_analisis.py`

Buat file `ai_analisis.py` di sebelah `server.py`.

```python
"""Analisis keuangan dengan Claude. Kunci API hanya ada di server, tidak pernah di browser."""
from __future__ import annotations

import json
import os
import threading
import time

MODEL = os.environ.get("LAJU_AI_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("LAJU_AI_EFFORT", "medium")   # low | medium | high | xhigh | max
JEDA_DETIK = 20                                       # jarak minimal antar permintaan per pengguna
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
            "additionalProperties": False,
        }},
        "prioritas30Hari": {"type": "array", "items": {"type": "string"}},
        "peringatan": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["kesimpulan", "kekuatan", "perbaikan", "prioritas30Hari", "peringatan"],
    "additionalProperties": False,
}

# Bagian ini tidak boleh berubah antar permintaan supaya bisa masuk cache prompt.
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
    if not os.environ.get("ANTHROPIC_API_KEY"):
        _alasan_mati = "Kunci ANTHROPIC_API_KEY belum diisi di server."
        return False
    try:
        import anthropic
    except ImportError:
        _alasan_mati = "Pustaka anthropic belum terpasang. Jalankan: pip install anthropic"
        return False
    _klien = anthropic.Anthropic()
    return True


def alasan() -> str:
    return _alasan_mati or "Analisis AI belum tersedia."


def boleh(uid: str) -> tuple[bool, str]:
    """Batas pemakaian sederhana supaya satu halaman tidak menghabiskan saldo."""
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
    import anthropic

    minta = "Jawab dalam bahasa Inggris." if bahasa == "en" else "Jawab dalam bahasa Indonesia."
    isi = f"{minta}\n\nData keuangan pengguna:\n\n{json.dumps(konteks, ensure_ascii=False, sort_keys=True)}"
    try:
        jawab = _klien.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=[{"type": "text", "text": SISTEM, "cache_control": {"type": "ephemeral"}}],
            output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": SKEMA}},
            messages=[{"role": "user", "content": isi}],
        )
    except anthropic.AuthenticationError:
        raise AIError("ai_key", "Kunci API ditolak. Periksa ANTHROPIC_API_KEY.", 502)
    except anthropic.RateLimitError:
        raise AIError("ai_busy", "Claude sedang penuh. Coba lagi sebentar.", 429)
    except anthropic.BadRequestError as e:
        raise AIError("ai_bad", f"Permintaan ditolak Claude: {e.message}", 502)
    except anthropic.APIStatusError as e:
        raise AIError("ai_down", f"Claude membalas galat {e.status_code}.", 502)
    except anthropic.APIConnectionError:
        raise AIError("ai_net", "Server tidak bisa menghubungi Claude.", 502)

    if jawab.stop_reason == "refusal":
        raise AIError("ai_tolak", "Claude menolak menganalisa data ini.", 502)

    teks = next((b.text for b in jawab.content if b.type == "text"), "")
    try:
        hasil = json.loads(teks)
    except json.JSONDecodeError:
        raise AIError("ai_bentuk", "Jawaban Claude tidak bisa dibaca.", 502)

    hasil["_model"] = jawab.model
    hasil["_token"] = {"masuk": jawab.usage.input_tokens, "keluar": jawab.usage.output_tokens,
                       "dariCache": jawab.usage.cache_read_input_tokens}
    return hasil
```

Catatan atas pilihan di kode itu:

- `output_config.format` dengan `json_schema` membuat jawaban Claude dijamin JSON yang cocok
  skema. Jadi tidak perlu menambal teks bebas.
- `claude-opus-5-5` memikir terus, jadi parameter `thinking` tidak dikirim sama sekali.
  Kedalamannya diatur lewat `effort`, dan bawaan model ini `medium`, maka ditulis eksplisit.
  Untuk demo murah, set `LAJU_AI_EFFORT=low`.
- `cache_control` di `system` membuat 1.500 token aturan itu dibaca dari cache pada permintaan
  kedua dan seterusnya. Bagian data pengguna berubah terus jadi tidak bisa di-cache, hematnya
  memang kecil, tapi tidak ada ruginya.
- `sort_keys=True` saat membuat JSON, supaya prefiks permintaan stabil.

---

## Langkah 4. Pasang endpoint di `server.py`

Empat sisipan kecil.

**a. Impor di bagian atas.**

```python
import ai_analisis as ai
```

**b. Di `do_POST`, batas ukuran badan permintaan.** Konteks AI lebih besar dari 10 KB, jadi ganti
baris batasnya:

```python
batas = (6_000_000 if url.path.startswith("/api/statements/")
         else 300_000 if url.path == "/api/analisis" else 10_000)
body = self._json_body(batas)
```

**c. Rute baru, taruh setelah cabang `/api/statements/`.**

```python
if url.path == "/api/analisis":
    konteks = body.get("konteks")
    if not isinstance(konteks, dict):
        return self._error(400, "bad_request", "Konteks analisis tidak valid.", uid)
    if not ai.siap():
        return self._error(503, "ai_off", ai.alasan(), uid)
    ok, pesan = ai.boleh(uid[0])
    if not ok:
        return self._error(429, "too_many", pesan, uid)
    try:
        return self._send(200, {"analisis": ai.analisa(konteks, str(body.get("bahasa") or "id"))}, uid=uid)
    except ai.AIError as e:
        return self._error(e.status, e.code, str(e), uid)
```

Pelindung CSRF yang sudah ada (`_guard`, header `X-Requested-With: laju`) otomatis berlaku untuk
rute ini, karena berada di `do_POST`.

**d. Beri tahu browser apakah fitur ini hidup.** Di `/api/config` tambahkan satu baris:

```python
"aiSiap": ai.siap(),
```

Dengan itu tombolnya bisa disembunyikan kalau server memang tidak punya kunci.

---

## Langkah 5. Tombol di kartu Data untuk analisis AI

Di `public/app-page.js`, kartu itu ada di fungsi Rapor sebagai satu
`<details class="card more ai-card">`. Ganti isinya jadi:

```js
<details class="card more ai-card">
  <summary>Data untuk analisis AI <small>(${(aiJson.length / 1024).toFixed(1).replace(".", ",")} KB, tanpa nama, HP, password)</small></summary>
  <div class="ai-run">
    <button type="button" class="btn primary" id="aiGo">Minta analisis Claude</button>
    <p class="hint">Yang dikirim hanya angka di bawah ini. Nama, nomor HP, dan password tidak ikut.</p>
  </div>
  <div class="ai-out" id="aiOut" aria-live="polite"></div>
  <pre class="ai-json">${esc(aiJson)}</pre>
</details>
```

Lalu satu penangan klik. Halaman ini sering digambar ulang, jadi pakai delegasi di `document` dan
taruh di bagian bawah `app-page.js`:

```js
function gambarAnalisis(a) {
  const li = (xs) => xs.map(x => `<li>${esc(x)}</li>`).join("");
  const contoh = a._contoh
    ? `<p class="warn">Ini jawaban contoh, bukan dari Claude. Server belum punya kunci API.</p>` : "";
  return `${contoh}
    <p class="ai-sum">${esc(a.kesimpulan)}</p>
    ${a.peringatan?.length ? `<ul class="ai-warn">${li(a.peringatan)}</ul>` : ""}
    <h3>Yang sudah bagus</h3><ul>${li(a.kekuatan || [])}</ul>
    <h3>Yang perlu diperbaiki</h3>
    <ul class="ai-fix">${(a.perbaikan || []).map(p => `<li><a href="#/langkah/${esc(p.langkahId)}"><b>${esc(p.judul)}</b></a><span>${esc(p.alasan)}</span></li>`).join("")}</ul>
    <h3>30 hari ke depan</h3><ol>${li(a.prioritas30Hari || [])}</ol>`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("#aiGo");
  if (!b) return;
  const out = document.getElementById("aiOut");
  const semula = b.textContent;
  b.disabled = true; b.textContent = "Menganalisa…";
  out.innerHTML = "";
  try {
    const r = await api("/api/analisis", {
      method: "POST",
      body: { konteks: buildAIContext(), bahasa: window.LajuI18n?.lang || "id" },
    });
    out.innerHTML = gambarAnalisis(r.analisis);
  } catch (err) {
    out.innerHTML = `<p class="warn">${esc(err.message)}</p>`;
  } finally {
    b.disabled = false; b.textContent = semula;
  }
});
```

Tautan `#/langkah/<id>` memakai pola rute yang sudah ada, jadi poin perbaikan bisa diklik langsung
ke langkah yang bersangkutan, sama seperti rincian skor di tab Tangga.

Soal terjemahan ke Inggris: teks dari Claude tidak ada di kamus `i18n-en.js`, jadi tidak bisa
diterjemahkan oleh `MutationObserver` di `i18n.js`. Itu sebabnya bahasa aktif dikirim ke server dan
Claude yang menjawab dalam bahasa itu.

---

## Langkah 6. Jawaban contoh supaya demo jalan tanpa credit

Di `public/demo-mode.js`, di dalam `handle`, tambahkan:

```js
if (method === "POST" && p === "/api/analisis") {
  await wait(900);
  const k = body?.konteks || {};
  const h = k.health || {}, pl = k.plan || {};
  const belum = (pl.milestones || []).find(m => m.status !== "selesai");
  return { analisis: {
    _contoh: true,
    kesimpulan: `Skor kesehatan Anda ${h.score ?? "-"} dari 100 (${h.category || "-"}). ` +
      (belum ? `Yang sedang dikerjakan: ${belum.title}.` : "Semua langkah sudah selesai."),
    kekuatan: (h.pillars || []).filter(x => x.points >= x.max * 0.8).map(x => `${x.label} sudah hampir penuh.`),
    peringatan: k.dataChecks || [],
    perbaikan: (h.pillars || []).filter(x => x.points < x.max).slice(0, 3)
      .map(x => ({ judul: x.label, alasan: `Baru ${x.points} dari ${x.max} poin.`, langkahId: belum?.id || "data" })),
    prioritas30Hari: ["Catat setiap setoran dan pembayaran utang.",
                      "Lengkapi data yang masih bertanda isian sendiri."],
  } };
}
```

Isinya dihitung dari konteks yang sama, jadi berubah mengikuti data pengguna dan tidak terlihat
kaku. Label "bukan dari Claude" muncul otomatis karena `_contoh: true`.

---

## Langkah 7. Kendali biaya

1. **Ukur dulu sebelum membayar.** Sebelum mengirim permintaan sungguhan, hitung tokennya:

   ```python
   n = _klien.messages.count_tokens(model=MODEL, system=SISTEM,
                                    messages=[{"role": "user", "content": isi}])
   print(n.input_tokens)
   ```

2. **Pilih model lewat variabel lingkungan**, jangan di kode. Untuk demo:

   ```powershell
   setx LAJU_AI_MODEL "claude-haiku-5-5"
   ```

   ```powershell
   setx LAJU_AI_EFFORT "low"
   ```

3. **Jangan panggil ulang untuk data yang sama.** Simpan hasil di `localStorage` dengan kunci dari
   sidik ringkas konteksnya, lalu pakai ulang kalau konteksnya belum berubah:

   ```js
   const sidik = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
   ```

   Buang simpanan itu setiap kali ada catatan baru di `S.ledger`.

4. **Batas per pengguna sudah ada** di `boleh()`: jeda 20 detik dan 20 analisis per hari. Naik
   turunkan sesuai saldo.

5. **Pantau pemakaian** di Console, halaman Usage. Angka `_token` yang dikembalikan endpoint juga
   bisa Anda tampilkan sementara saat menguji.

---

## Langkah 8. Yang tidak bisa dilakukan lewat link GitHub Pages

Ini batas nyata dan tidak ada akalnya.

GitHub Pages hanya menyajikan file. Tidak ada Python di sana, jadi `POST /api/analisis` tidak ada,
dan tombolnya akan jatuh ke mode contoh. Itu sebabnya Langkah 6 penting: lewat link GitHub,
tombolnya tetap menghasilkan sesuatu dan jujur mengatakan itu contoh.

Kalau nanti Anda mau Claude asli jalan dari link itu, `server.py` harus ditaruh di tempat yang bisa
menjalankan Python, misalnya Render, Railway, atau Fly, lalu:

1. Isi `ANTHROPIC_API_KEY` sebagai variabel lingkungan di panel penyedia itu, bukan di repo.
2. Tambahkan header CORS di `_send` untuk origin `https://tumbalprojek315-png.github.io`.
3. Di `core.js`, arahkan `api()` ke URL absolut server itu saat halaman dibuka dari GitHub Pages.

Catat satu hal: begitu server itu publik, siapa pun yang tahu alamatnya bisa memanggil
`/api/analisis` dan menghabiskan saldo Anda. Batas di `boleh()` jadi wajib, dan sebaiknya ditambah
batas global per hari untuk seluruh server.

---

## Langkah 9. Izin pengguna

Data keuangan tetap data pribadi walau tanpa nama. Sebelum fitur ini dipakai sungguhan:

1. Tambahkan satu centang di langkah **Izin data**: "Izinkan analisis AI". Tanpa centang itu,
   tombolnya tidak muncul dan tidak ada data yang keluar dari perangkat.
2. Teks di bawah tombol harus menyebut ke mana data pergi, bukan cuma apa yang dikirim.
3. `buildAIContext()` sudah membuang nama, nomor HP, password, area narik, dan token e-wallet.
   Daftar itu ada di `excludedForPrivacy`. Setiap kali Anda menambah ladang baru ke konteks,
   periksa daftar itu lagi.
4. Jangan simpan konteks atau jawabannya di log server.

---

## Ringkasan berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `ai_analisis.py` | baru, satu satunya tempat kunci API dipakai |
| `server.py` | impor, batas badan permintaan, rute `POST /api/analisis`, `aiSiap` di `/api/config` |
| `public/app-page.js` | tombol di kartu `ai-card`, penangan klik, `gambarAnalisis()` |
| `public/demo-mode.js` | jawaban contoh untuk `/api/analisis` |
| `public/app.css` | gaya `.ai-run`, `.ai-out`, `.ai-sum`, `.ai-fix`, `.ai-warn` |
| `docs/ai-data-contract.md` | tandai bagian 4 sudah terlaksana |

`public/` tidak pernah menyimpan kunci. Itu syarat yang tidak bisa ditawar.
