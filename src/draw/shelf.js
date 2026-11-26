// 光轴展示架：正视图。沿用模型坐标（y 向上），靠外层 transform 翻转，避免逐点计算。
export function drawShelf(plan, s) {
  s = s || {};
  const f = plan.frame;
  const L = plan.layers;
  const pitch = plan.pitch;
  const base = 40;
  const totalH = f.H;
  const W = f.W;
  const pad = 14;
  const k = Math.min((400 - 2 * pad) / W, (300 - 2 * pad) / totalH);
  const ox = (400 - W * k) / 2;
  const oy = (300 - totalH * k) / 2;

  const ink = "#3d454b";
  const alu = "#efebe2";
  const frame = "#e6e0d2";
  const plate = "#e2edf0";
  const plateEdge = "#6d97a8";
  const clamp = "#c06a3d";
  const car = "#7d8b98";

  const g = [];
  g.push(`<g transform="translate(${ox.toFixed(1)},${(oy + totalH * k).toFixed(1)}) scale(${k.toFixed(4)},${(-k).toFixed(4)})">`);

  // 立柱
  g.push(`<rect x="-5" y="0" width="10" height="${f.uprightLen}" fill="${alu}" stroke="${ink}" stroke-width="1.2"/>`);
  g.push(`<rect x="${W - 5}" y="0" width="10" height="${f.uprightLen}" fill="${alu}" stroke="${ink}" stroke-width="1.2"/>`);
  // 脚垫
  g.push(`<rect x="-9" y="0" width="18" height="12" fill="#b8b3a8" stroke="${ink}" stroke-width="1"/>`);
  g.push(`<rect x="${W - 9}" y="0" width="18" height="12" fill="#b8b3a8" stroke="${ink}" stroke-width="1"/>`);

  // 层
  for (let i = 0; i < L; i++) {
    const y = base + i * pitch;
    g.push(`<rect x="-10" y="${y - 5}" width="${W + 20}" height="10" fill="${frame}" stroke="${ink}" stroke-width="1"/>`);
    g.push(`<rect x="0" y="${y + 5}" width="${W}" height="5" fill="${plate}" stroke="${plateEdge}" stroke-width="0.8"/>`);
    g.push(`<rect x="0" y="${y + 10}" width="${W}" height="15" fill="${plate}" stroke="${plateEdge}" stroke-width="0.8"/>`);

    const slot = plan.slot;
    const n = Math.min(plan.perLayer, 14);
    const carW = Math.min(plan.car.wid, slot - 4);
    const startX = (W - (n - 1) * slot - carW) / 2;
    for (let j = 0; j < n; j++) {
      const ch = plan.car.hgt * 0.72;
      g.push(`<rect x="${startX + j * slot}" y="${y + 10}" width="${carW}" height="${ch}" rx="${ch * 0.32}" fill="${car}" opacity="0.55"/>`);
      g.push(`<rect x="${startX + j * slot + carW * 0.22}" y="${y + 10 + ch * 0.62}" width="${carW * 0.56}" height="${ch * 0.45}" rx="${ch * 0.2}" fill="#5f7789" opacity="0.5"/>`);
    }
    // 十字夹
    g.push(`<rect x="-11" y="${y - 11}" width="22" height="22" fill="${clamp}" opacity="0.85" stroke="${ink}" stroke-width="0.8"/>`);
    g.push(`<rect x="${W - 11}" y="${y - 11}" width="22" height="22" fill="${clamp}" opacity="0.85" stroke="${ink}" stroke-width="0.8"/>`);
  }

  // 顶框 + 灯盒
  const ty = base + L * pitch;
  g.push(`<rect x="-10" y="${ty - 5}" width="${W + 20}" height="10" fill="${frame}" stroke="${ink}" stroke-width="1"/>`);
  g.push(`<rect x="-11" y="${ty - 11}" width="22" height="22" fill="${clamp}" opacity="0.85" stroke="${ink}" stroke-width="0.8"/>`);
  g.push(`<rect x="${W - 11}" y="${ty - 11}" width="22" height="22" fill="${clamp}" opacity="0.85" stroke="${ink}" stroke-width="0.8"/>`);
  if (s.light) {
    g.push(`<rect x="25" y="${ty + 4}" width="${W - 50}" height="30" rx="2" fill="#fdf3cf" stroke="#c9a227" stroke-width="1"/>`);
  }
  if (s.door) {
    g.push(`<rect x="0" y="0" width="${W}" height="${f.uprightLen}" fill="none" stroke="#8d8778" stroke-width="1.6" stroke-dasharray="7 5"/>`);
  }
  g.push("</g>");
  return g.join("");
}