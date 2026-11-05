/* Laju: ganti bahasa ID / EN.
   Teks sumber ditulis dalam bahasa Indonesia. Saat bahasa EN dipilih, setiap teks yang tampil
   (termasuk yang muncul belakangan: toast, dialog, render ulang) dicari di kamus LAJU_EN.
   Angka, uang, dan tanggal diganti penanda {0}, {1}, ... dulu, jadi satu entri kamus
   berlaku untuk semua nilai. Teks yang tidak ada di kamus dibiarkan apa adanya. */
(() => {
  "use strict";
  const KEY = "laju-lang";
  const lang = (() => { try { return localStorage.getItem(KEY) === "en" ? "en" : "id"; } catch (e) { return "id"; } })();
  document.documentElement.lang = lang;

  const MON_S = "Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des";
  const MON_L = "Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember";
  const DAYS = "Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu";
  const TOKEN = new RegExp([
    `(?:(?:${DAYS}), )?\\d{1,2} (?:${MON_L}|${MON_S})\\.? \\d{4}`,   // tanggal lengkap
    `\\b(?:${MON_L}|${MON_S})\\.? \\d{4}`,                          // bulan + tahun
    "[−-]?±?Rp ?\\d+(?:\\.\\d{3})*(?:,\\d+)?(?: ?(?:jt|rb)\\b)?",   // uang (titik akhir kalimat tidak ikut)
    "(?:(?<![A-Za-z])[±+−-])?\\d+(?:\\.\\d{3})*(?:,\\d+)?%?",        // angka ("ke-2": tanda hubung tidak ikut)
  ].join("|"), "g");
  const MAP = {
    Januari: "January", Februari: "February", Maret: "March", April: "April", Juni: "June", Juli: "July", Agustus: "August",
    September: "September", Oktober: "October", November: "November", Desember: "December",
    Mei: "May", Agu: "Aug", Agt: "Aug", Okt: "Oct", Des: "Dec",
    Minggu: "Sunday", Senin: "Monday", Selasa: "Tuesday", Rabu: "Wednesday", Kamis: "Thursday", Jumat: "Friday", Sabtu: "Saturday",
  };

  const norm = (s) => { const toks = []; const t = s.replace(TOKEN, (m) => { toks.push(m); return `{${toks.length - 1}}`; }); return { t, toks }; };
  // Format token untuk pembaca EN: nama bulan/hari, "6,7 jt" → "6.7M", "950 rb" → "950K", "0,5" → "0.5".
  function enTok(m) {
    m = m.replace(new RegExp(`\\b(${DAYS}|${MON_L}|Mei|Agu|Agt|Okt|Des)\\b`, "g"), (w) => MAP[w] || w);
    const unit = m.match(/^(.*?Rp ?)(\d[\d.]*(?:,\d+)?) ?(jt|rb)$/);
    if (unit) return `${unit[1]}${unit[2].replace(",", ".")}${unit[3] === "jt" ? "M" : "K"}`;
    return m.replace(/(^|[^\d.])(\d+),(\d+)(?![\d.])/g, "$1$2.$3");
  }

  const DICT = window.LAJU_EN || {};
  const RULES = (window.LAJU_EN_RULES || []).map(([re, to]) => [new RegExp(re), to]);
  const has = (k) => Object.prototype.hasOwnProperty.call(DICT, k);
  const onlyNums = (s) => !/[A-Za-z]{2}/.test(s.replace(TOKEN, ""));
  // Aturan: "$1" = bagian apa adanya, "$t1" = bagian itu ikut diterjemahkan (gagal kalau tidak ada di kamus).
  function trOne(raw) {
    const { t, toks } = norm(raw);
    const fill = (s) => s.replace(/\{(\d+)\}/g, (_, i) => enTok(toks[i] ?? ""));
    const unfill = (s) => s.replace(/\{(\d+)\}/g, (_, i) => toks[i] ?? "");
    if (has(t)) return fill(DICT[t]);
    if (/[.:]$/.test(t) && has(t.slice(0, -1))) return fill(DICT[t.slice(0, -1)]) + t.slice(-1);
    for (const [re, to] of RULES) {
      const m = t.match(re); if (!m) continue;
      let ok = true;
      const out = fill(to).replace(/\$(t?)(\d)/g, (_, tt, i) => {
        const g = unfill(m[i] ?? "");
        if (!tt) return g.replace(TOKEN, enTok);
        const r = trOne(g) ?? trList(g);
        if (r == null) ok = false;
        return r ?? g;
      });
      if (ok) return out;
    }
    return null;
  }
  // Daftar "A, B, C" atau "A / B": terjemahkan yang ada di kamus, sisanya (nama merek) apa adanya.
  function trList(s) {
    if (!/, | \/ /.test(s)) return null;
    const item = (b) => trOne(b) ?? (b.includes(" / ") ? b.split(" / ").map(x => trOne(x) ?? x).join(" / ") : b);
    const bits = s.split(", "), done = bits.map(item);
    return done.some((d, i) => d !== bits[i]) ? done.join(", ") : null;
  }
  // Teks utuh dulu, lalu per bagian " · ", lalu per kalimat.
  function tr(text) {
    const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0], core = text.trim();
    if (!core) return text;
    let out = trOne(core);
    if (out == null && core.includes(" · ")) {
      const parts = core.split(" · "), done = parts.map(p => trOne(p) ?? trSentences(p) ?? trList(p) ?? (onlyNums(p) ? p.replace(TOKEN, enTok) : null));
      if (done.some((d, i) => d != null && d !== parts[i])) out = done.map((d, i) => d ?? parts[i]).join(" · ");
    }
    if (out == null) out = trSentences(core);
    if (out == null) out = trList(core);
    // Nilai yang diawali pemisah, mis. "· Belum ada": titiknya dilepas dulu lalu dipasang lagi.
    if (out == null && /^·\s+\S/.test(core)) {
      const sisa = core.replace(/^·\s+/, ""), r = trOne(sisa) ?? trList(sisa);
      if (r != null) out = `· ${r}`;
    }
    if (out == null && onlyNums(core)) out = core.replace(TOKEN, enTok);   // hanya angka/uang/tanggal
    return out == null ? text : lead + out + tail;
  }
  function trSentences(s) {
    if (!/[.?!] \S/.test(s)) return null;
    const parts = s.split(/(?<=[.?!]) (?=\S)/), done = parts.map(p => trOne(p));
    return done.some(d => d != null) ? done.map((d, i) => d ?? parts[i]).join(" ") : null;
  }

  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "PRE", "CODE", "INPUT"]);
  const ATTRS = ["placeholder", "aria-label", "title", "data-tip"];
  const seen = new WeakMap();   // node/elemen → hasil terjemahan terakhir, supaya tidak diterjemahkan dua kali
  function trText(node) {
    const v = node.nodeValue;
    if (!v || !v.trim() || seen.get(node) === v) return;
    const p = node.parentElement;
    if (!p || SKIP.has(p.tagName) || p.closest("[data-noi18n]")) return;
    const out = tr(v);
    seen.set(node, out);
    if (out !== v) node.nodeValue = out;
  }
  function trAttrs(el) {
    const memo = seen.get(el) || {};
    for (const a of ATTRS) {
      const v = el.getAttribute?.(a);
      if (!v || memo[a] === v) continue;
      const out = tr(v); memo[a] = out;
      if (out !== v) el.setAttribute(a, out);
    }
    seen.set(el, memo);
  }
  function walk(root) {
    if (root.nodeType === 3) return trText(root);
    if (root.nodeType !== 1 || SKIP.has(root.tagName)) return;
    trAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? trText(n) : trAttrs(n);
  }
  function trTitle() { const t = document.title, o = tr(t); if (o !== t) document.title = o; }

  if (lang === "en") {
    const start = () => {
      walk(document.body); trTitle();
      new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === "characterData") trText(m.target);
          else if (m.type === "attributes") trAttrs(m.target);
          else m.addedNodes.forEach(walk);
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      const title = document.querySelector("title");
      if (title) new MutationObserver(trTitle).observe(title, { childList: true, characterData: true, subtree: true });
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
  }

  // Tombol ID | EN di header
  const markLang = () => document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", markLang) : markLang();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    const to = b.dataset.lang; if (to === lang) return;
    try { localStorage.setItem(KEY, to); } catch (err) { /* abaikan */ }
    location.reload();
  });
  window.LajuI18n = { lang, norm, tr };
})();
