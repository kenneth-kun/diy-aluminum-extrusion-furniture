/* 四个内核的返回结构略有差异（历史原因），这里统一成界面用的形状：
   - BOM：{ name, spec, qty, amount, lo, hi, kw }
   - 步骤：{ n, title, desc, check }
   - 工具：{ name, note }；坑：{ title, text }                          */

export function bomRows(p) {
  const lines = (p && p.lines) || [];
  return lines.map((l) => {
    const amount = l.subtotal != null ? l.subtotal : l.price;
    let qty = "";
    if (l.qty != null) {
      const raw = String(l.qty);
      const u = l.u || "";
      /* 有的内核在 qty 里已经写了单位（"1 批"），别再拼一次 */
      qty = u && !raw.endsWith(u) ? raw + " " + u : raw;
    }
    return {
      name: l.name,
      spec: l.spec || "",
      qty,
      amount: Number(amount) || 0,
      lo: l.lo || 0,
      hi: l.hi || 0,
      note: l.note || "",
      kw: l.kw || l.name
    };
  });
}

export function bomTotals(p) {
  const total = Math.round(p.total);
  const lo = p.totalMin != null ? p.totalMin : Math.round(total * 0.8);
  const hi = p.totalMax != null ? p.totalMax : Math.round(total * 1.25);
  return { total, lo, hi };
}

function splitNote(s) {
  /* "内六角扳手（4/5 号）" → { name, note } ；"M4 丝锥 + 铰手（卖家不代攻丝时）" 同理 */
  const m = /^(.*?)（(.+)）$/.exec(s || "");
  if (m) return { name: m[1].trim(), note: m[2].trim() };
  return { name: s, note: "" };
}

function splitPitfall(s) {
  /* "别用普通螺丝直接拧进型材：必须 T 螺母 + 内六角……" → 标题 + 正文 */
  const i = (s || "").indexOf("：");
  if (i > 3 && i < 28) return { title: s.slice(0, i), text: s.slice(i + 1) };
  return { title: "", text: s };
}

export function normSteps(b) {
  if (!b) return { intro: "", steps: [], tools: [], pitfalls: [], keyNumbers: [] };
  const steps = (b.steps || []).map((s, i) => ({
    n: s.n != null ? s.n : i + 1,
    title: s.title || s.t || "",
    desc: s.desc || s.d || "",
    check: s.check || s.k || ""
  }));
  const tools = (b.tools || []).map((t) => (typeof t === "string" ? splitNote(t) : t));
  const pitfalls = (b.pitfalls || []).map((t) => (typeof t === "string" ? splitPitfall(t) : t));
  return { intro: b.intro || "", steps, tools, pitfalls, keyNumbers: b.keyNumbers || [] };
}