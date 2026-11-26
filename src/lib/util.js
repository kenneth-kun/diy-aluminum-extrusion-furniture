/* 通用小工具：复制、下载、比价链接（1688 用 GBK 编码）、数值格式 */

export function money(n) {
  return "¥" + Math.round(n);
}

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- 复制 ---------------- */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* 落到兜底 */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

export function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------- 比价链接 ---------------- */
export const SITES = [
  { key: "ali", label: "1688" },
  { key: "tb", label: "淘宝" },
  { key: "jd", label: "京东" }
];

let gbkMap = null;

/* 1688 的关键词参数必须按 GBK 编码，UTF-8 会变乱码。
   用 TextDecoder('gbk') 反向建一张 汉字 → 双字节十六进制 的表，只建一次。 */
function buildGbk() {
  let dec;
  try { dec = new TextDecoder("gbk"); } catch (e) { return null; }
  const m = {};
  for (let hi = 0x81; hi <= 0xfe; hi++) {
    for (let lo = 0x40; lo <= 0xfe; lo++) {
      if (lo === 0x7f) continue;
      let ch;
      try { ch = dec.decode(new Uint8Array([hi, lo])); } catch (e) { continue; }
      if (ch && ch.length === 1 && ch !== "\uFFFD" && !m[ch]) {
        m[ch] = hi.toString(16).toUpperCase() + lo.toString(16).toUpperCase();
      }
    }
  }
  return m;
}

export function gbkPct(str) {
  if (!gbkMap) gbkMap = buildGbk();
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === " ") { out += "%20"; continue; }
    const h = gbkMap && gbkMap[ch];
    if (h) out += "%" + h.slice(0, 2) + "%" + h.slice(2);
    else out += encodeURIComponent(ch);
  }
  return out;
}

export function buyUrl(kw, site) {
  if (!kw) return "#";
  if (site === "ali") return "https://s.1688.com/selloffer/offer_search.htm?keywords=" + gbkPct(kw);
  if (site === "tb") return "https://s.taobao.com/search?q=" + encodeURIComponent(kw);
  return "https://search.jd.com/Search?keyword=" + encodeURIComponent(kw) + "&enc=utf-8";
}

/* ---------------- 文档链接 ---------------- */
/* 构建后 docs/ 里有一份拷贝；dev 时由 vite 中间件从仓库根目录读 */
export function docHref(file) {
  return "./docs/" + file;
}

/* ---------------- URL 参数 ---------------- */
export function readQuery() {
  const out = {};
  const q = (location.hash.split("?")[1] || location.search.replace(/^\?/, "") || "");
  q.split("&").forEach((kv) => {
    if (!kv) return;
    const [k, v] = kv.split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(v == null ? "" : v);
  });
  return out;
}

export function num(v, fallback) {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}