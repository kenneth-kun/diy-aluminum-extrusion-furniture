// 桌面铝型材收纳柜：正视图（立柱 + 每组托架 + 盆 + 端盖 + 顶板 + 尺寸线）
const ALU = "#e9e4d8", ALU_S = "#a9a29a", DIMC = "#a8512a";

function rect(x, y, w, h, fill, stroke, op) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${op == null ? 1 : op}" stroke="${stroke}" stroke-width="1"/>`;
}
function dimH(x1, x2, y, label) {
  return `<g stroke="${DIMC}" stroke-width="1" fill="none"><path d="M${x1} ${y}H${x2}"/><path d="M${x1} ${y - 4}v8M${x2} ${y - 4}v8"/></g>` +
    `<text x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle" fill="${DIMC}" font-size="11.5">${label}</text>`;
}
function dimV(y1, y2, x, label, rot) {
  const ymid = (y1 + y2) / 2;
  return `<g stroke="${DIMC}" stroke-width="1" fill="none"><path d="M${x} ${y1}V${y2}"/><path d="M${x - 4} ${y1}h8M${x - 4} ${y2}h8"/></g>` +
    `<text x="${x}" y="${ymid}" text-anchor="middle" fill="${DIMC}" font-size="11.5" transform="rotate(${rot} ${x} ${ymid})">${label}</text>`;
}
function binShape(x, y, w, h, fill) {
  const taper = Math.min(6, w * 0.02);
  const pts = [
    [x + taper, y + h], [x, y + h], [x, y],
    [x + w, y], [x + w, y + h], [x + w - taper, y + h]
  ].map((p) => p.join(",")).join(" ");
  return `<polygon points="${pts}" fill="${fill}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>` +
    `<rect x="${x + w * 0.12}" y="${y + h * 0.28}" width="${w * 0.76}" height="${h * 0.46}" fill="rgba(255,255,255,.14)" rx="3"/>` +
    `<rect x="${x + w * 0.16}" y="${y + h * 0.5}" width="${w * 0.68}" height="${Math.max(1, h * 0.04)}" fill="rgba(255,255,255,.5)" rx="1"/>`;
}
function cap(o, cx, cy, color, s) {
  o.push(`<rect x="${cx - s}" y="${cy - s}" width="${2 * s}" height="${2 * s}" rx="2" fill="${color}" stroke="rgba(0,0,0,.15)" stroke-width="0.8"/>`);
}

export function drawTray(p) {
  const d = p.dims, W = d.W, H = d.H, pz = d.profSize;
  const ML = 72, MR = 96, MT = 56, MB = 38;
  const vw = W + ML + MR, vh = H + MT + MB;
  const X = (x) => ML + x;
  const Y = (y) => vh - MB - y;
  const o = [];
  o.push(`<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,PingFang SC,sans-serif" font-size="12">`);
  o.push(`<rect width="100%" height="100%" fill="#fcfaf4"/>`);

  // 立柱
  o.push(rect(X(0), Y(H), pz, d.Lv, ALU, ALU_S));
  o.push(rect(X(W - pz), Y(H), pz, d.Lv, ALU, ALU_S));

  // 托架 j=0 底框 … j=N 顶框，每层一只盆
  for (let j = 0; j <= d.N; j++) {
    const yb = d.feetH + j * d.Hd;
    o.push(rect(X(pz), Y(yb + pz), W - 2 * pz, pz, ALU, ALU_S));
    if (j < d.N) {
      const c = p.colors[j] || p.colors[0];
      o.push(binShape(X(pz + 7), Y(yb + pz + d.binH), d.Wi - 14, d.binH, c.hex));
    }
    cap(o, X(0) + pz / 2, Y(yb + pz / 2), p.capColor, 7);
    cap(o, X(W) - pz / 2, Y(yb + pz / 2), p.capColor, 7);
  }

  // 顶板（嵌在顶框槽内）
  if (d.topT > 0) {
    o.push(rect(X(pz + 8), Y(H) + (pz - d.topT) / 2, W - 2 * pz - 16, d.topT, "#e8a76a", "#c98a45", 0.95));
  }

  // 脚
  if (d.feetH > 0) {
    [0, W - pz].forEach((x0) => o.push(rect(X(x0), Y(d.feetH), pz, d.feetH, "#8d8778", "#6e6a62", 1)));
  }

  // 尺寸线
  o.push(dimH(X(0), X(W), Y(H) - 18, W + " mm"));
  o.push(dimV(Y(0), Y(H), X(0) - 26, H + " mm", -90));
  o.push(dimV(Y(d.feetH), Y(d.feetH + d.Hd), X(W) + 26, d.Hd + " mm", 0));
  o.push(`<text x="${X(W / 2)}" y="${vh - 9}" text-anchor="middle" fill="#9a938a" font-size="11">` +
    `正视图 · ${d.N} 层 · 2020 外框 · 盆直接抽拉（无导轨）</text>`);
  o.push("</svg>");
  return o.join("");
}