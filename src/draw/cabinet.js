// 铝型材抽屉柜：正视图（含长虹纹抽屉面、拉手、脚轮、尺寸线）
const INK = "#8d8778";
const ALU = "#e9e4d8";
const ALU_EDGE = "#a9a29a";
const DIMC = "#a8512a";

function rect(x, y, w, h, fill, stroke) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
}
function dimH(x1, x2, y, label) {
  return `<g stroke="${DIMC}" stroke-width="1" fill="none"><path d="M${x1} ${y}H${x2}"/><path d="M${x1} ${y - 4}v8M${x2} ${y - 4}v8"/></g>` +
    `<text x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle" fill="${DIMC}" font-size="11.5">${label}</text>`;
}
function dimV(y1, y2, x, label, rot, extra) {
  const ymid = (y1 + y2) / 2;
  const t = `<text x="${x}" y="${ymid}" text-anchor="middle" fill="${DIMC}" font-size="11.5" transform="rotate(${rot} ${x} ${ymid})">${label}</text>`;
  return `<g stroke="${DIMC}" stroke-width="1" fill="none"><path d="M${x} ${y1}V${y2}"/><path d="M${x - 4} ${y1}h8M${x - 4} ${y2}h8"/></g>` + t;
}

export function drawCabinet(p) {
  const d = p.dims;
  const W = d.W, H = d.H, pz = d.profSize, q = d.drawerProfSize;
  const ML = 78, MR = 96, MT = 76, MB = 34;
  const vw = W + ML + MR, vh = H + MT + MB;
  const Y = (y) => vh - MB - y;
  const X = (x) => ML + x;

  const o = [];
  o.push(`<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,PingFang SC,sans-serif" font-size="12">`);
  o.push(`<defs><pattern id="flute" width="7" height="7" patternUnits="userSpaceOnUse">` +
    `<rect width="7" height="7" fill="#e7eff2"/><path d="M3.5 0V7" stroke="#c8dbe4" stroke-width="1.6"/></pattern></defs>`);
  o.push(`<rect width="100%" height="100%" fill="#fcfaf4"/>`);

  const legH = d.legH, fh = d.frameH;
  // 立柱
  o.push(rect(X(0), Y(legH + fh), pz, fh, ALU, ALU_EDGE));
  o.push(rect(X(W - pz), Y(legH + fh), pz, fh, ALU, ALU_EDGE));
  // 顶框 / 底框
  o.push(rect(X(0), Y(H), W, pz, ALU, ALU_EDGE));
  o.push(rect(X(0), Y(legH + pz), W, pz, ALU, ALU_EDGE));

  // 抽屉
  const y0 = legH + pz + d.gap;
  for (let i = 0; i < d.drawerN; i++) {
    const y = y0 + i * (d.Hd + d.gap);
    o.push(rect(X(pz), Y(y + d.Hd), W - 2 * pz, d.Hd, "url(#flute)", "#b6b0a4"));
    o.push(rect(X(pz), Y(y + d.Hd), W - 2 * pz, q, "#ded8ca", ALU_EDGE));
    o.push(rect(X(pz), Y(y + q), W - 2 * pz, q, "#ded8ca", ALU_EDGE));
    o.push(rect(X(pz), Y(y + d.Hd), q, d.Hd, "#ded8ca", ALU_EDGE));
    o.push(rect(X(W - pz - q), Y(y + d.Hd), q, d.Hd, "#ded8ca", ALU_EDGE));
    // 拉手
    const hx = X(W / 2 - 55), hy = Y(y + d.Hd - q / 2);
    o.push(`<path d="M${hx} ${hy + 7} v-7 h110 v7" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  }

  // 脚
  if (legH > 0) {
    [[pz / 2, 0], [W - pz / 2, 0]].forEach((pt) => {
      const cx = X(pt[0]), cy = Y(legH * 0.42);
      o.push(`<rect x="${cx - 5}" y="${Y(legH)}" width="10" height="${legH * 0.45}" fill="#a9a29a" rx="2"/>`);
      o.push(`<circle cx="${cx}" cy="${cy}" r="${Math.min(16, legH * 0.3)}" fill="#3f4650"/>`);
      o.push(`<circle cx="${cx}" cy="${cy}" r="${Math.min(6, legH * 0.12)}" fill="${ALU}"/>`);
    });
  }

  // 尺寸线
  o.push(dimH(X(0), X(W), Y(H) - 22, W + " mm"));
  o.push(dimV(Y(0), Y(H), X(0) - 30, H + " mm", -90));
  o.push(dimV(Y(legH + pz + d.gap), Y(legH + pz + d.gap + d.Hd), X(W) + 26, "单抽 " + d.Hd, 0));
  o.push(`<text x="${X(W / 2)}" y="${vh - 10}" text-anchor="middle" fill="#9a938a" font-size="11">` +
    `正视图 · ${d.drawerN} 抽 · ${d.slide || "定制"} 导轨</text>`);
  o.push("</svg>");
  return o.join("");
}