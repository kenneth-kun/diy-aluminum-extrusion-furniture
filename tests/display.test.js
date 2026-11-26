/*!
 * display-test.js —— 亚克力展示盒（悬停面板）核心逻辑回归测试（Node，无依赖）
 * 用法：node display-test.js
 */
"use strict";

import T from "../src/cores/display.js";
var pass = 0, fail = 0, fails = [];

function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; fails.push(name + (extra ? " → " + extra : "")); console.log("  ✗ " + name + (extra ? " → " + extra : "")); }
}
function eq(name, got, want) { ok(name + " = " + want, got === want, "实得 " + got); }
function near(name, got, want, tol) { ok(name + " ≈ " + want, Math.abs(got - want) <= tol, "实得 " + got); }

/* ---------- 1. 默认方案（3 层 · 30×25×25 cm · 5 mm） ---------- */
console.log("\n[1] 默认 3 层 · 内空 300×250×250");
var p = T.computeDisplay({});
eq("层数", p.N, 3);
eq("内宽", p.Wi, 300);
eq("内深", p.Di, 250);
eq("净高", p.Hi, 250);
eq("外宽 = 内宽 + 2×板厚", p.Wo, 310);
eq("外深", p.Do, 260);
eq("单层高 = 净高 + 铝梁", p.Hl, 270);
eq("总高", p.H, 814);
eq("门宽 = 内宽 - 2", p.doorW, 298);
eq("门高 = 净高 - 4", p.doorH, 246);
eq("单开门", p.doors, 1);
eq("每扇 2 片合页", p.hingesPerDoor, 2);
eq("合页总数 = 门数×片数×层数", p.hingeCount, 6);
eq("端盖 = 2×层数", p.endcaps, 6);
eq("定位销 = 4×(层数-1)", p.pins, 8);
eq("总价", p.total, 711);
eq("区间下限 ≈ 0.82", p.totalMin, 583);
eq("区间上限 ≈ 1.22", p.totalMax, 867);
near("门重", p.doorKg, 298 * 246 * 5 / 1e9 * 1.19 * 1000, 1e-6);
near("整箱重量", p.weight, 7.18, 0.02);
eq("默认无警告", p.warnings.length, 0);

/* ---------- 2. 公式自洽 ---------- */
console.log("\n[2] 公式自洽");
ok("外宽 = 内宽 + 2t", p.Wo === p.Wi + 2 * p.t);
ok("外深 = 内深 + 2t", p.Do === p.Di + 2 * p.t);
ok("单层高 = 净高 + 梁高", p.Hl === p.Hi + p.rail.h);
ok("总高 = N×单层高 + 顶盖 + 脚", p.H === p.N * p.Hl + p.lid.th + p.feet.h);
ok("门高 = 净高 - 4", p.doorH === p.Hi - 4);
ok("门宽 = 内宽 - 2", p.doorW === p.Wi - 2);
ok("解释文本含外廓", p.explain.indexOf(p.Wo + "×" + p.Do + "×" + p.H) >= 0, p.explain);

/* ---------- 3. 切料表 ---------- */
console.log("\n[3] 切料表");
function cutAc(sub) { return p.cutAc.filter(function (c) { return c.name.indexOf(sub) >= 0; })[0]; }
eq("侧板长 = 外深", cutAc("侧板").len, 260);
eq("侧板数 = 2N", cutAc("侧板").qty, 6);
eq("后板长 = 内宽", cutAc("后板").len, 300);
eq("后板数 = N", cutAc("后板").qty, 3);
eq("底板长 = 外宽", cutAc("底板").len, 310);
eq("底板数 = N", cutAc("底板").qty, 3);
eq("门板数 = N", cutAc("门板").qty, 3);
eq("顶盖长 = 外深", cutAc("顶盖").len, 260);
near("切割总长", p.cutAcTotalM, (260 * 6 + 300 * 3 + 310 * 3 + 246 * 3 + 260) / 1000, 0.001);
eq("切割总长显示", p.cutAcTotalM.toFixed(2), "4.39");
eq("铝梁根数 = N（+顶盖压条）", p.cutAl.reduce(function (s, c) { return s + c.qty; }, 0), 4);
near("铝梁总长", p.cutAlTotalM, (300 * 4) / 1000, 0.001);
ok("每行都有分组", p.cutAc.every(function (c) { return c.group && c.group.length > 0; }));
ok("切料长度都是整数", p.cutAc.every(function (c) { return c.len === Math.round(c.len); }));

/* ---------- 4. 双开门 ---------- */
console.log("\n[4] 宽箱体自动双开");
var w2 = T.computeDisplay({ W: 700 });
eq("外宽 710 → 双开", w2.doors, 2);
eq("单扇门宽", w2.doorW, 345);
eq("门板片数 = 2N", w2.cutAc.filter(function (c) { return c.name.indexOf("门板") >= 0; })[0].qty, 6);
eq("合页数翻倍", w2.hingeCount, 12);
ok("触发「太宽会扭」提醒", w2.warnings.some(function (w) { return w.indexOf("双开门") >= 0; }), w2.warnings.join(" / "));
eq("窄箱体仍单开", T.computeDisplay({ W: 500 }).doors, 1);

/* ---------- 5. 无门 ---------- */
console.log("\n[5] 不做门（纯展示盒）");
var nd = T.computeDisplay({ hinge: "none" });
eq("无门", nd.doors, 0);
eq("无合页", nd.hingeCount, 0);
ok("切料里没有门板", !nd.cutAc.some(function (c) { return c.name.indexOf("门板") >= 0; }));
ok("BOM 里没有合页", !nd.lines.some(function (l) { return l.name.indexOf("合页") >= 0; }));
ok("无门更便宜", nd.total < p.total);
eq("无门不加钻孔步", T.buildSteps(nd).steps.filter(function (s) { return s.title.indexOf("钻孔") >= 0; }).length, 0);
ok("无门工具不用螺丝刀", !T.buildSteps(nd).tools.some(function (t) { return t.indexOf("螺丝刀") >= 0; }));

/* ---------- 6. 3 mm 门警告 ---------- */
console.log("\n[6] 3 mm 薄板");
var t3 = T.computeDisplay({ sheet: "3", W: 500 });
eq("板厚", t3.t, 3);
ok("门宽 498 > 400 → 提醒发飘", t3.warnings.some(function (w) { return w.indexOf("3 mm 门宽") >= 0; }), t3.warnings.join(" / "));
ok("3 mm 更便宜", T.computeDisplay({ sheet: "3" }).total < p.total);
ok("3 mm 不给手指槽建议", !t3.notes.some(function (n) { return n.indexOf("手指槽") >= 0; }));

/* ---------- 7. 层数边界 ---------- */
console.log("\n[7] 层数 1–6");
var p1 = T.computeDisplay({ N: 1 }), p6 = T.computeDisplay({ N: 6 });
eq("1 层总高", p1.H, 270 + 1 + 3);
eq("1 层无定位销", p1.pins, 0);
ok("1 层切料无定位销行", !p1.lines.some(function (l) { return l.name.indexOf("定位销") >= 0; }));
eq("1 层不加叠层步", T.buildSteps(p1).steps.filter(function (s) { return s.title.indexOf("叠层") >= 0; }).length, 0);
eq("6 层总高", p6.H, 6 * 270 + 1 + 3);
eq("6 层端盖", p6.endcaps, 12);
ok("6 层提醒重心高", p6.warnings.some(function (w) { return w.indexOf("重心") >= 0; }));
eq("非法层数回落 6", T.computeDisplay({ N: 99 }).N, 6);
eq("层数 0 回落 1", T.computeDisplay({ N: 0 }).N, 1);

/* ---------- 8. 门重校核 ---------- */
console.log("\n[8] 门重与合页");
var heavy = T.computeDisplay({ sheet: "8", W: 500, H: 600 });
ok("8 mm 大尺寸门 > 1.5 kg", heavy.doorKg > 1.5, heavy.doorKg.toFixed(2));
ok("触发「会往下溜」提醒", heavy.warnings.some(function (w) { return w.indexOf("往下溜") >= 0; }), heavy.warnings.join(" / "));
ok("合页数量随门宽加到 3 片", heavy.doorW > 420 && heavy.hingesPerDoor === 3, heavy.doorW + "/" + heavy.hingesPerDoor);
var heavy2 = T.computeDisplay({ sheet: "8", W: 500, H: 600, hinge: "damped" });
ok("换阻尼合页单价更高", heavy2.total > heavy.total);

/* ---------- 9. 采购清单 ---------- */
console.log("\n[9] 采购清单");
ok("每行都有搜索词", p.lines.every(function (l) { return l.kw && l.kw.length > 2; }),
  p.lines.filter(function (l) { return !l.kw; }).map(function (l) { return l.name; }).join(","));
ok("区间下限 < 单价", p.lines.every(function (l) { return l.lo <= l.price; }));
ok("区间上限 > 单价", p.lines.every(function (l) { return l.hi >= l.price; }));
near("合计 = 各行之和", p.total, p.lines.reduce(function (s, l) { return s + l.price; }, 0), 0.001);
ok("亚克力是最大头", p.lines.slice().sort(function (a, b) { return b.price - a.price; })[0].name.indexOf("亚克力") >= 0);
ok("五金数量带单位", p.parts.every(function (l) { return /[个套支包片]/.test(l.qty); }), p.parts.map(function (l) { return l.qty; }).join("|"));

/* ---------- 10. 顶盖 / 铝梁 / 脚 ---------- */
console.log("\n[10] 顶盖、铝梁、脚");
var nl = T.computeDisplay({ lid: "none" });
ok("不装顶盖 → 无顶盖行", !nl.cutAc.some(function (c) { return c.name === "顶盖"; }));
ok("不装顶盖 → 铝梁少一根", nl.cutAl.reduce(function (s, c) { return s + c.qty; }, 0) === nl.N);
ok("不装顶盖 → 总高变矮", nl.H === nl.N * nl.Hl + nl.feet.h && nl.H < p.H);
var fl = T.computeDisplay({ rail: "flat" });
eq("扁铝梁高 20", fl.rail.h, 20);
ok("扁铝更便宜", fl.cutAl[0].len === p.cutAl[0].len && fl.rail.price < p.rail.price);
ok("扁铝加攻丝行", fl.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
ok("扁铝工具带丝锥", T.buildSteps(fl).tools.some(function (t) { return t.indexOf("丝锥") >= 0; }));
eq("换扁铝总高不变", fl.H, p.H);
var nf = T.computeDisplay({ feet: "none" });
eq("无脚总高 -3", nf.H, p.H - 3);
ok("无脚提醒垫 EVA", nf.notes.some(function (n) { return n.indexOf("EVA") >= 0; }));
eq("金属脚更高", T.computeDisplay({ feet: "metal" }).H, p.H + 9);

/* ---------- 11. 尺寸边界与提醒 ---------- */
console.log("\n[11] 尺寸边界");
ok("内深 < 160 提醒", T.computeDisplay({ D: 150 }).warnings.some(function (w) { return w.indexOf("放不下") >= 0; }));
ok("总高 > 900 提醒", T.computeDisplay({ N: 4, H: 400 }).warnings.some(function (w) { return w.indexOf("靠墙") >= 0; }),
  T.computeDisplay({ N: 4, H: 400 }).warnings.join(" / "));
eq("内宽下界 150", T.computeDisplay({ W: 100 }).Wi, 150);
eq("内宽上界 800", T.computeDisplay({ W: 999 }).Wi, 800);
eq("内深下界 120", T.computeDisplay({ D: 80 }).Di, 120);
eq("净高下界 120", T.computeDisplay({ H: 80 }).Hi, 120);
ok("净高 120 时梁占位提醒", T.computeDisplay({ H: 120 }).warnings.some(function (w) { return w.indexOf("铝梁占") >= 0; }));
eq("所有尺寸取整到 5", T.computeDisplay({ W: 333, D: 277, H: 263 }).Wi % 5, 0);

/* ---------- 12. 文本 / CSV ---------- */
console.log("\n[12] 导出");
var txt = T.toText(p);
ok("文本含标题", txt.indexOf("亚克力展示盒") >= 0);
ok("文本含亚克力切料段", txt.indexOf("— 亚克力切料") >= 0);
ok("文本含铝梁段", txt.indexOf("— 铝梁 —") >= 0);
ok("文本含合计", txt.indexOf("¥" + p.total) >= 0);
ok("文本含区间", txt.indexOf(p.totalMin + "–" + p.totalMax) >= 0);
var csv = T.toCSV(p);
eq("CSV 行数 = 表头 + 明细 + 合计", csv.split("\r\n").length, p.lines.length + 2);
ok("CSV 每行都加引号", csv.split("\r\n").every(function (r) { return r.charAt(0) === '"' && r.charAt(r.length - 1) === '"'; }));
ok("CSV 首行是表头", csv.indexOf('"类别","名称","规格","数量","金额","搜索词"') === 0);
ok("CSV 带 BOM 之前可被 Excel 识别（含中文）", csv.indexOf("亚克力") >= 0);

/* ---------- 13. 装配步骤 ---------- */
console.log("\n[13] 装配");
var st = T.buildSteps(p);
eq("默认 10 步", st.steps.length, 10);
ok("有钻孔步", st.steps.some(function (s) { return s.title.indexOf("钻孔") >= 0; }));
ok("有悬停验收", st.steps.some(function (s) { return s.check.indexOf("停") >= 0; }));
ok("每步都有检查点", st.steps.every(function (s) { return s.check && s.check.length > 3; }));
ok("工具含 φ4.2 钻头", st.tools.some(function (t) { return t.indexOf("4.2") >= 0; }));
eq("六个坑", st.pitfalls.length, 6);
ok("坑里有「不能上油」", st.pitfalls.some(function (x) { return x.indexOf("油") >= 0; }));
ok("关键数字 6 项", st.keyNumbers.length === 6 && st.keyNumbers.every(function (k) { return k.k && k.v; }));
ok("intro 带层数与外廓", st.intro.indexOf(p.N + " 层") >= 0 && st.intro.indexOf(p.Wo + "×") >= 0, st.intro);

/* ---------- 14. 价格口径 ---------- */
console.log("\n[14] 价格");
ok("亚克力价 = 面积 × 单价 + 切割", p.lines.filter(function (l) { return l.name === "亚克力板（含切割）"; })[0].price >=
  Math.round(p.area * p.sheet.price));
ok("盒体粘接 = 40 × 层数", p.lines.filter(function (l) { return l.name.indexOf("盒体粘接") >= 0; })[0].price === 40 * p.N);
ok("合页价 = 数量 × 单价", p.lines.filter(function (l) { return l.name === "任意停合页"; })[0].price === p.hingeCount * p.hinge.price);
ok("8 mm 板更贵", T.computeDisplay({ sheet: "8" }).total > p.total);
ok("6 层比 3 层贵", p6.total > p.total * 1.6);

/* ---------- 汇总 ---------- */
console.log("\n" + (fail ? "✗" : "✓") + " 通过 " + pass + " / " + (pass + fail));
if (fail) { console.log("失败项：\n  - " + fails.join("\n  - ")); process.exit(1); }