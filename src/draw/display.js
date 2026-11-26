/* 展示盒正视图：模型坐标 mm → 屏幕坐标，X()/Y() 直接映射（不用 transform，避免文字镜像） */
import { esc } from "../lib/util.js";

const C = {
  acrylic: "#e3eef2",
  acrylicLine: "#6d97a8",
  door: "#d6e7ec",
  doorLine: "#7ea6b2",
  alu: "#c9c5ba",
  aluLine: "#8d8778",
  ink: "#242830",
  copper: "#a8512a",
  copperSoft: "#c06a3d",
  text: "#6f7681",
  guide: "#b9b1a0",
  board: "#fbfaf5"
};

function rect(x, y, w, h, fill, stroke, op) {
  return (
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
    '" fill="' + fill + '" fill-opacity="' + (op == null ? 1 : op) +
    '" stroke="' + stroke + '" stroke-width="1"/>'
  );
}

function dimH(x1, x2, y, label) {
  return (
    '<g stroke="' + C.copper + '" stroke-width="1" fill="none"><path d="M' + x1 + " " + y + "H" + x2 +
    '"/><path d="M' + x1 + " " + (y - 4) + "v8M" + x2 + " " + (y - 4) + 'v8"/></g>' +
    '<text x="' + (x1 + x2) / 2 + '" y="' + (y - 7) + '" text-anchor="middle" fill="' + C.copper +
    '" font-size="11.5" font-family="ui-monospace,monospace">' + label + "</text>"
  );
}

function dimV(y1, y2, x, label, rot, dx) {
  const ymid = (y1 + y2) / 2;
  const tx = x + (dx || 0);
  const t =
    '<text x="' + tx + '" y="' + ymid + '" text-anchor="middle" fill="' + C.copper +
    '" font-size="11.5" font-family="ui-monospace,monospace" transform="rotate(' + rot + " " + tx + " " + ymid + ')">' + label + "</text>";
  return (
    '<g stroke="' + C.copper + '" stroke-width="1" fill="none"><path d="M' + x + " " + y1 + "V" + y2 +
    '"/><path d="M' + (x - 4) + " " + y1 + "h8M" + (x - 4) + " " + y2 + 'h8"/></g>' + t
  );
}

/* 左下角小侧视图：正视图是压缩过的，看不清门到底掀到哪 */
function sideInset(x0, y0, w, h, angle, doorH) {
  const rad = (angle * Math.PI) / 180;
  const cx = x0 + 12;
  const cy = y0 + 12;
  const L = Math.min(h - 26, doorH * 0.9);
  const ex = cx + L * Math.sin(rad);
  const ey = cy + L * Math.cos(rad);
  const o = [];
  o.push("<g>");
  o.push(
    '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h +
    '" rx="3" fill="#ffffff" fill-opacity="0.82" stroke="' + C.guide + '"/>'
  );
  o.push('<text x="' + (x0 + 8) + '" y="' + (y0 + 12) + '" fill="' + C.text + '" font-size="9.5">侧视</text>');
  o.push('<rect x="' + (x0 + 6) + '" y="' + (y0 + 20) + '" width="' + (w - 12) + '" height="6" fill="' + C.alu + '" stroke="' + C.aluLine + '"/>');
  o.push('<circle cx="' + cx + '" cy="' + (y0 + 26) + '" r="2.4" fill="' + C.copperSoft + '"/>');
  o.push('<path d="M' + cx + ' ' + (y0 + 26) + "V" + (y0 + 26 + L) + '" stroke="' + C.guide + '" stroke-dasharray="2 3" fill="none"/>');
  o.push('<path d="M' + cx + ' ' + (y0 + 26) + "L" + ex + " " + (ey + 12) + '" stroke="' + C.acrylicLine + '" stroke-width="2"/>');
  o.push('<path d="M' + cx + ' ' + (y0 + 26 + L) + ' A' + L + ' ' + L + ' 0 0 1 ' + ex + " " + (ey + 12) +
    '" stroke="' + C.copper + '" stroke-dasharray="2 3" fill="none"/>');
  o.push('<text x="' + (x0 + w / 2) + '" y="' + (y0 + h - 6) + '" text-anchor="middle" fill="' + C.copper +
    '" font-size="9.5" font-family="ui-monospace,monospace">' + angle + "°</text>");
  o.push("</g>");
  return o.join("");
}

export function drawDisplay(p, angle) {
  const Wo = p.Wo;
  const H = p.H;
  const t = p.t;
  const railH = p.rail.h;
  const ML = 118;
  const MR = 98;
  const MT = 68;
  const MB = 40;
  const vw = Wo + ML + MR;
  const vh = H + MT + MB;
  const X = (x) => ML + x;
  const Y = (y) => vh - MB - y;
  const o = [];

  o.push('<svg viewBox="0 0 ' + vw + " " + vh + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,PingFang SC,sans-serif" font-size="12" role="img" aria-label="展示盒正视图">');
  o.push('<rect width="100%" height="100%" fill="' + C.board + '"/>');

  // 脚
  if (p.feet.h > 0) {
    [0, Wo - 24].forEach((x0) => {
      o.push(rect(X(x0), Y(p.feet.h), 24, p.feet.h, "#8b8578", "#6b665c", 1));
    });
  }

  for (let j = 0; j < p.N; j++) {
    const yb = p.feet.h + j * p.Hl;

    // 盒体：侧板 / 后板 / 底板
    o.push(rect(X(0), Y(yb + p.Hl), t, p.Hl, C.acrylic, C.acrylicLine, 0.9));
    o.push(rect(X(Wo - t), Y(yb + p.Hl), t, p.Hl, C.acrylic, C.acrylicLine, 0.9));
    o.push(rect(X(t), Y(yb + p.Hl), p.Wi, p.Hl, C.acrylic, C.acrylicLine, 0.3));
    o.push(rect(X(0), Y(yb + t), Wo, t, C.acrylic, C.acrylicLine, 1));

    // 前沿铝梁（压在这一层上沿）
    o.push(rect(X(0), Y(yb + p.Hl), Wo, railH, C.alu, C.aluLine, 1));
    o.push('<circle cx="' + X(3) + '" cy="' + Y(yb + p.Hl - railH / 2) + '" r="2.4" fill="' + C.ink + '"/>');
    o.push('<circle cx="' + X(Wo - 3) + '" cy="' + Y(yb + p.Hl - railH / 2) + '" r="2.4" fill="' + C.ink + '"/>');

    // 门：最上层可打开
    const openHere = j === p.N - 1 && angle > 0 && p.doors > 0;
    if (p.doors > 0 && !openHere) {
      o.push(rect(X(1), Y(yb + p.Hl - railH), Wo - 2, p.doorH, C.door, C.doorLine, 0.8));
    } else if (openHere) {
      const rad = (angle * Math.PI) / 180;
      const hy = yb + p.Hl - railH; // 合页轴线：门从这里往下挂
      const ys = Y(hy);
      const back = p.doorH * Math.cos(rad); // 正视投影高度
      // 关到位的幽灵框，用来看"压扁"了多少
      o.push('<rect x="' + X(1) + '" y="' + ys + '" width="' + (Wo - 2) + '" height="' + p.doorH +
        '" fill="none" stroke="' + C.copper + '" stroke-dasharray="3 3" stroke-width="1" stroke-opacity="0.5"/>');
      // 实心：高 doorH·cosθ
      o.push(rect(X(0), ys, Wo, Math.max(6, back), C.door, C.doorLine, 0.85));
      [0.18, 0.82].forEach((fx) => {
        o.push('<circle cx="' + X(Wo * fx) + '" cy="' + ys + '" r="3.2" fill="' + C.copperSoft + '" stroke="' + C.copper + '" stroke-width="0.6"/>');
      });
      o.push('<text x="' + X(Wo / 2) + '" y="' + (ys + back - 24) + '" text-anchor="middle" fill="' + C.acrylicLine + '" font-size="11.5">门开 ' +
        angle + "°（任意停）</text>");
      o.push('<text x="' + X(Wo / 2) + '" y="' + (ys + back - 8) + '" text-anchor="middle" fill="' + C.text + '" font-size="10.5">正视投影 ' +
        Math.round(back) + " mm = 门高 " + p.doorH + " × cos" + angle + "°</text>");
      o.push(sideInset(10, vh - MB - 116, 78, 104, angle, p.doorH));
    }

    // 手指槽（只露下半圆；打开的那层不画）
    if (p.doors > 0 && !openHere) {
      const cx = X(Wo / 2);
      const cy = Y(yb + p.Hl - railH);
      o.push('<path d="M' + (cx - 9) + " " + cy + " A9 9 0 0 0 " + (cx + 9) + " " + cy +
        '" fill="' + C.board + '" stroke="' + C.doorLine + '" stroke-width="0.9"/>');
    }

    // 层间定位销
    if (j < p.N - 1) {
      [0.15, 0.85].forEach((fx) => {
        o.push('<circle cx="' + X(Wo * fx) + '" cy="' + Y(yb + p.Hl) + '" r="2" fill="' + C.ink + '" fill-opacity="0.32"/>');
      });
    }
  }

  // 顶盖
  if (p.lid.th > 0) {
    o.push(rect(X(0), Y(H - p.feet.h) + (t - p.lid.th), Wo, p.lid.th, C.acrylic, C.acrylicLine, 1));
  }

  // 尺寸线
  o.push(dimH(X(0), X(Wo), Y(H) - 20, Wo + " mm"));
  o.push(dimV(Y(0), Y(H), X(0) - 30, H + " mm", -90));
  if (p.doors) {
    o.push(dimV(Y(p.feet.h + p.Hl - railH - p.doorH), Y(p.feet.h + p.Hl - railH), X(Wo) + 26, "门 " + p.doorH, -90, 12));
  }
  o.push(dimV(Y(p.feet.h), Y(p.feet.h + p.Hl), X(Wo) + 60, "层 " + p.Hl, -90, 12));

  // 图例（中文按双宽估宽，否则文字互相压）
  const lg = [
    ["亚克力 " + p.sheet.th + " mm", C.acrylic, C.acrylicLine],
    ["铝梁 " + railH + " mm", C.alu, C.aluLine],
    ["任意停合页", C.copperSoft, C.copper],
    ["端盖", C.ink, C.ink]
  ];
  let lx = 12;
  lg.forEach((it) => {
    o.push(rect(lx, 9, 9, 9, it[1], it[2], 1));
    o.push('<text x="' + (lx + 13) + '" y="18" fill="' + C.text + '" font-size="10.5">' + esc(it[0]) + "</text>");
    lx += 18 + it[0].replace(/[^\x00-\xff]/g, "aa").length * 5.6;
  });

  o.push('<text x="' + X(Wo / 2) + '" y="' + (vh - 10) + '" text-anchor="middle" fill="' + C.text + '" font-size="11">' +
    "正视图 · " + p.N + " 层 · " + p.sheet.label + " · " + (p.doors ? (p.doors === 1 ? "单开门" : "双开门") : "无门") + "</text>");
  o.push("</svg>");
  return o.join("");
}