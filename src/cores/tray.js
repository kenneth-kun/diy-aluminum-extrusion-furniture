/*!
 * tray-core.js —— 铝型材桌面收纳柜「切料 + 预算」纯逻辑层
 * 不依赖 DOM，可被浏览器 <script> 引入（window.TrayCore），也可被 Node require。
 * 参考对象：小红书「新配色 桌面铝型材收纳柜」（2020 外框 + 可抽拉塑料盆 + 琥珀色亚克力顶板 + 荧光绿端盖）。
 * 所有内部长度单位为 mm，界面输入用 cm。
 */
const api = (function () {
  "use strict";

  /* ---------------- 型材 ---------------- */
  var PROFILES = {
    "2020": { label: "2020（20×20）", size: 20, slot: 6, price: 10 },
    "3030": { label: "3030（30×30）", size: 30, slot: 8, price: 18 }
  };

  /* ---------------- 抽屉盆（买现成的，不用做） ---------------- */
  var BINS = {
    small:  { label: "小盆 300×200×90",   w: 300, d: 200, h: 90,  price: 22 },
    mid:    { label: "中盆 400×300×120",  w: 400, d: 300, h: 120, price: 35 },
    large:  { label: "大盆 500×350×150",  w: 500, d: 350, h: 150, price: 48 },
    xl:     { label: "特大 600×400×180",  w: 600, d: 400, h: 180, price: 62 },
    custom: { label: "自定义尺寸",        w: 400, d: 300, h: 120, price: 35 }
  };

  /* ---------------- 顶板 ---------------- */
  var TOPS = {
    amber: { label: "琥珀色透明 3mm", price: 210, th: 3, note: "透光呈橙色，帖子里就是这个" },
    clear: { label: "透明 3mm",       price: 190, th: 3, note: "最百搭，能看见里面装什么" },
    opal:  { label: "乳白 3mm",       price: 200, th: 3, note: "柔光，看不见杂乱" },
    none:  { label: "不装顶板",        price: 0,   th: 0, note: "直接敞口，取放最方便" }
  };

  /* ---------------- 脚 ---------------- */
  var FEETS = {
    pad:   { label: "硅胶防滑脚垫（8 个）", h: 5,  price: 1.5 },
    metal: { label: "铝圆脚 M6",           h: 12, price: 3.5 },
    none:  { label: "不加脚（直接放桌面）",  h: 0,  price: 0 }
  };

  /* ---------------- 配色（帖子同款） ---------------- */
  var COLORS = {
    green: { label: "荧光绿端盖（同款）", cap: "#7ad64a" },
    black: { label: "黑色端盖",          cap: "#2b2f33" },
    gray:  { label: "灰色端盖",          cap: "#9aa3ad" }
  };
  var BIN_COLORS = [
    { name: "砖红",   hex: "#c0392b" },
    { name: "墨绿",   hex: "#2f6b52" },
    { name: "藏蓝",   hex: "#1f3d7a" },
    { name: "姜黄",   hex: "#c99a2e" },
    { name: "中灰",   hex: "#8d99a6" }
  ];

  /* ---------------- 价格（元，参考区间中值） ---------------- */
  var PRICE = {
    bracket: 1.6,     // 角码（含 T 螺母 + 内六角）
    endcap: 0.4,       // 卡扣端盖（基准价，实际用 CAPFIX）
    tapPerHole: 1.2,   // 端面攻丝，每孔
    tapMin: 10,        // 攻丝起收
    cutPerM: 1.0,     // 型材切料费
    acrylicCraft: 15, // 顶板切割工时
    screwPack: 20
  };

  var KW = {
    "角码 + T 螺母 + 内六角": "铝型材 内置角码 M5 T型螺母 2020",
    "型材端盖": "铝型材端盖 2020 塑料 荧光绿",
    "抽屉盆": "LongLife 塑料零件盆 抽屉式 收纳盆",
    "EVA 防滑垫（2mm）": "EVA 防滑垫 2mm 自粘",
    "内六角扳手 + 砂纸": "内六角扳手套装 4号5号",
    "脚": "硅胶防滑脚垫 自粘 家具",
    "顶板（材料 + 切割）": "亚克力 定制切割",
    "端面攻丝（M4）": "铝型材 端面攻丝 M4 加工 定制"
  };

  /* ---------------- 端盖固定方式（市面常见两类） ---------------- */
  var CAPFIX = {
    press:   { label: "卡扣端盖（免攻丝）",   price: 0.4, hole: 0, tap: false, screw: false,
               note: "塑料卡扣直接压进型材端面，最省事，反复拆会松" },
    tap:     { label: "螺丝端盖（端面攻丝）", price: 0.9, hole: 1, tap: true,  screw: true,
               note: "卖家在端面中心孔攻 M4 螺纹，M4×10 沉头螺丝锁紧，最牢" },
    selftap: { label: "自攻端盖（自攻钉）",   price: 0.6, hole: 1, tap: false, screw: true,
               note: "不攻丝，M4 自攻钉直接拧进端面中心孔，DIY 最快，别反复拆" }
  };

  var CLEAR = 14;     // 盆口上方留的抽拉余量
  var SIDE_GAP = 8;   // 盆左右各让多少（不然会刮型材）

  function floor5(v) { return Math.floor(v / 5) * 5; }
  function round5(v) { return Math.round(v / 5) * 5; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, Number(v) || a)); }

  /* ---------------- 主计算 ---------------- */
  function computeTray(input) {
    var o = Object.assign({
      N: 3, bin: "mid", binW: 400, binD: 300, binH: 120,
      prof: "2020", top: "amber", feet: "pad", color: "green", baseRigid: true,
      capFix: "press"
    }, input || {});

    var prof = PROFILES[o.prof] || PROFILES["2020"];
    var bin = BINS[o.bin] || BINS.mid;
    var top = TOPS[o.top] || TOPS.amber;
    var feet = FEETS[o.feet] || FEETS.pad;
    var color = COLORS[o.color] || COLORS.green;
    var caps = CAPFIX[o.capFix] || CAPFIX.press;

    var p = prof.size;
    var N = clamp(Math.round(o.N), 1, 6);
    var binW = o.bin === "custom" ? floor5(clamp(o.binW, 100, 900)) : bin.w;
    var binD = o.bin === "custom" ? floor5(clamp(o.binD, 80, 600)) : bin.d;
    var binH = o.bin === "custom" ? floor5(clamp(o.binH, 50, 300)) : bin.h;
    var binPrice = o.bin === "custom" ? Math.round(20 + binW * binD * binH / 1e6 * 900) : bin.price;

    /* ---- 由盆反算外廓 ---- */
    var W = round5(binW + 2 * SIDE_GAP + 2 * p);   // 外宽（取整到 5）
    var D = round5(binD + 2 * SIDE_GAP + 2 * p);
    var Wi = W - 2 * p;                    // 内空宽（盆两侧净余量 = (Wi - binW)/2）
    var Di = D - 2 * p;
    var Hd = floor5(binH + p + CLEAR);     // 单层节距 = 盆高 + 托梁厚 + 盆口余量
    var Lv = floor5(N * Hd + p);           // 立柱长 = N 层节距 + 顶框（顶板嵌在顶框槽内）
    var H = Lv + feet.h;                   // 总高

    /* ---- 检查 ---- */
    var warnings = [], notes = [];
    if (N > 4) warnings.push(N + " 层 × 节距 " + Hd + " mm，总高 " + H + " mm：桌面柜 3–4 层最好看，再多就挡视线了。");
    if (W > 700) warnings.push("外宽 " + W + " mm 已经超出「桌面柜」范畴，2020 中间会塌腰：换 3030 或每层中间加一根立柱。");
    if (H > 520) warnings.push("总高 " + H + " mm 放在桌上会挡视线，也容易被碰倒。");
    if (binH > 200) warnings.push("盆高 " + binH + " mm，装重物后抽拉会很费力，建议盆高 ≤ 150。");
    if (o.top !== "none" && W > 600) warnings.push("顶板超过 600 mm 宽建议用 4mm 或加一根中间横梁，3mm 会塌。");
    if (N >= 5 && o.feet === "pad") notes.push("层数多、重心高：脚垫换成铝圆脚更稳。");
    if (top.th > 0) notes.push("顶板四周留 1 mm 活动量，别严丝合缝——亚克力天热会胀。");
    if (feet.h === 0) notes.push("不加脚的话桌面要平整，不然柜子会晃、抽拉发涩。");

    /* ---- 切料 ---- */
    var wideRails = 2 * (N + 1);           // N 层托架 + 底框，每处前后 2 根（顶层即顶框）
    var deepRails = 2 + (o.baseRigid ? 2 : 0); // 顶框左右 2 +（底框左右 2）
    var cut = [];
    addCut(cut, prof.label + " 立柱（高）", Lv, 4, "柜体");
    addCut(cut, prof.label + " 横向梁（宽向）", Wi, wideRails, "层架");
    addCut(cut, prof.label + " 纵向梁（深向）", Di, deepRails, "顶框");
    var cutTotalM = cut.reduce(function (s, c) { return s + c.len * c.qty; }, 0) / 1000;

    /* ---- 顶板 ---- */
    var panels = [];
    if (top.th > 0) {
      panels.push({ name: "顶板", w: Wi + 2 * 6, h: Di + 2 * 6, qty: 1, th: top.th, mat: top.label });
    }
    var panelArea = panels.reduce(function (s, x) { return s + x.w * x.h / 1e6; }, 0);

    /* ---- 五金 ---- */
    var railCount = wideRails + deepRails;
    var brackets = railCount * 2;                    // 每根梁两端各 1 个角码
    var endcaps = railCount * 2 + 4;                 // 梁端面 + 立柱顶 4 角
    var parts = [];
    parts.push({ name: "角码 + T 螺母 + 内六角", spec: "M5 内置角码", qty: brackets + " 套", price: Math.round(brackets * PRICE.bracket) });
    parts.push({
      name: "型材端盖",
      spec: caps.screw ? "塑料盖 + M4 螺丝 · " + color.label.replace(/端盖.*$/, "") : "塑料卡扣盖 · " + color.label.replace(/端盖.*$/, ""),
      qty: endcaps + " 个",
      price: Math.round(endcaps * caps.price)
    });
    if (caps.tap) {
      parts.push({
        name: "端面攻丝（M4）",
        spec: "每根型材端面 1 孔 · 卖家加工",
        qty: endcaps + " 孔",
        price: Math.max(PRICE.tapMin, Math.round(endcaps * PRICE.tapPerHole))
      });
    }
    parts.push({ name: "抽屉盆", spec: binW + "×" + binD + "×" + binH + " mm", qty: N + " 个", price: N * binPrice });
    if (feet.h > 0) parts.push({ name: "脚", spec: feet.label, qty: "4 个", price: Math.round(4 * feet.price) });
    parts.push({ name: "EVA 防滑垫（2mm）", spec: "垫在盆底与横梁之间", qty: "1 张", price: 8 });
    parts.push({ name: "内六角扳手 + 砂纸", spec: "4 号 5 号", qty: "1 套", price: PRICE.screwPack });

    /* ---- 报价 ---- */
    var lines = [];
    var frameM = cutTotalM;
    lines.push(line("铝型材 " + prof.label, frameM.toFixed(2) + " m", frameM * prof.price, prof.label,
      (o.prof === "3030" ? "3030" : "2020") + "铝型材 银色 阳极氧化 定制切割"));
    parts.forEach(function (pt) {
      var kw = KW[pt.name] || "";
      if (pt.name === "型材端盖" && caps.screw) kw = "铝型材端盖 2020 带螺丝 M4";
      lines.push(line(pt.name, pt.spec, pt.price, "", kw));
    });
    if (top.th > 0) {
      lines.push(line("顶板（材料 + 切割）", panels[0].w + "×" + panels[0].h + " mm",
        panelArea * top.price + PRICE.acrylicCraft, top.note,
        top.label.replace(" 3mm", "") + "亚克力 定制切割"));
    }
    lines.push(line("切料费", cutTotalM.toFixed(2) + " m", cutTotalM * PRICE.cutPerM, "让卖家切，自己切容易斜", "铝型材 切割加工 定制"));

    var total = lines.reduce(function (s, l) { return s + l.price; }, 0);
    lines.forEach(function (l) { l.lo = Math.round(l.price * 0.8); l.hi = Math.round(l.price * 1.25); });
    var lo = Math.round(total * 0.82 / 10) * 10, hi = Math.round(total * 1.25 / 10) * 10;

    return {
      ok: true,
      input: o,
      dims: { W: W, D: D, H: H, N: N, Wi: Wi, Di: Di, Hd: Hd, Lv: Lv, binW: binW, binD: binD, binH: binH, profSize: p, topT: top.th, feetH: feet.h, clear: CLEAR },
      cut: cut, cutTotalM: cutTotalM,
      panels: panels, panelArea: panelArea,
      parts: parts, lines: lines,
      total: Math.round(total), lo: lo, hi: hi,
      binPrice: binPrice,
      colors: binColors(N),
      capColor: color.cap,
      capFix: CAPFIX[o.capFix] ? o.capFix : "press",
      capLabel: caps.label, capCount: endcaps, capHoles: caps.hole ? endcaps : 0,
      capNote: caps.note,
      warnings: warnings, notes: notes,
      explain: N + " 层 × 盆 " + binW + "×" + binD + "×" + binH + " mm → 外廓 " + W + "×" + D + "×" + H +
        " mm；层距（盆底到上一层梁底）" + Hd + " mm = 盆高 " + binH + " + 梁 " + p + " + 余量 " + CLEAR + "；立柱 " + Lv + " mm。"
    };
  }

  function binColors(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(BIN_COLORS[i % BIN_COLORS.length]);
    return out;
  }

  function addCut(list, name, len, qty, group) {
    var L = floor5(len);
    var hit = list.filter(function (c) { return c.name === name && c.len === L; })[0];
    if (hit) hit.qty += qty;
    else list.push({ name: name, len: L, qty: qty, group: group, price: 0 });
  }

  function line(name, spec, price, note, kw) {
    return { name: name, spec: spec, price: Math.round(price), note: note || "", kw: kw || "", lo: 0, hi: 0 };
  }


  /* ---------------- 文本导出 ---------------- */
  function toText(p) {
    var L = [];
    L.push("【铝型材桌面收纳柜 · 切料清单】");
    L.push(p.explain);
    L.push("");
    L.push("— 型材切料（共 " + p.cutTotalM.toFixed(2) + " m）—");
    p.cut.forEach(function (c) { L.push("  " + c.name + "：" + c.len + " mm × " + c.qty + " 根"); });
    L.push("");
    if (p.panels.length) {
      L.push("— 顶板 —");
      p.panels.forEach(function (x) { L.push("  " + x.name + "：" + x.w + " × " + x.h + " mm × " + x.qty + "（" + x.mat + "）"); });
      L.push("");
    }
    L.push("— 端面 —");
    L.push("  端盖：" + p.capLabel + " × " + p.capCount + " 个" +
      (p.capHoles ? "；需攻丝 " + p.capHoles + " 孔（M4）" : "；免攻丝"));
    L.push("");
    L.push("— 五金 —");
    p.parts.forEach(function (x) { L.push("  " + x.name + "：" + x.spec + " × " + x.qty); });
    L.push("");
    L.push("合计 ≈ " + p.total + " 元（区间 " + p.lo + "–" + p.hi + "）");
    return L.join("\n");
  }

  function toCSV(p) {
    var rows = [["类别", "名称", "规格/尺寸", "数量", "金额"]];
    p.cut.forEach(function (c) { rows.push(["型材", c.name, c.len + " mm", c.qty + " 根", ""]); });
    p.panels.forEach(function (x) { rows.push(["顶板", x.name, x.w + "×" + x.h + " mm", x.qty + " 块", ""]); });
    p.parts.forEach(function (x) { rows.push(["配件", x.name, x.spec, x.qty, "¥" + x.price]); });
    p.lines.forEach(function (l) { rows.push(["报价", l.name, l.spec, "", "¥" + l.price]); });
    rows.push(["合计", "", "", "", "¥" + p.total]);
    return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
  }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  /* ---------------- 装配步骤 ---------------- */
  function buildSteps(p) {
    var d = p.dims;
    var caps = CAPFIX[p.capFix] || CAPFIX.press;
    var steps = [
      { t: "切料核对", d: "把 " + p.cut.length + " 组型材按长度分堆，逐根复量。让卖家切好、切口去毛刺；自己切很难保证 90°。", k: "四根立柱一致（" + d.Lv + " mm），误差 ≤1 mm" },
      { t: "滑 T 螺母", d: "每根立柱按图纸把 T 螺母先滑进槽里（不拧紧），一个角码位 1 颗。别一次滑太多——锁紧后螺母就滑不动了。", k: "螺母能顺槽滑到底、不卡" },
      { t: "组底框", d: "地面（或桌面）垫报纸，四根立柱 + 底框四杆用角码虚接。先只拧到「能调但不掉」的程度。", k: "底框对角线差 ≤2 mm" },
      { t: "装第一层平台", d: "两根横向梁装到最底层位置，把一只盆放上去试抽。盆底要整面接触横梁，不能只有边角吃力。", k: "盆能顺畅抽出 2/3，不刮立柱" },
      { t: "逐层向上", d: "每装一层就放一只盆试抽。层距已经算好：" + d.Hd + " mm = 盆高 " + d.binH + " + 托梁 " + d.profSize + " + 余量 " + d.clear + "（取整到 5）。梁装反、盆口顶到上一层梁都是这一步能发现的。", k: "每层盆都能自由抽拉、不打架" },
      { t: "封顶框 + 顶板", d: "顶框四杆装好后再放亚克力顶板，四周留 1 mm 活动量。顶板不要预先固定死——先看整体方正再定。", k: "顶板不晃、四边缝隙均匀" },
      { t: "校方 + 统一锁紧", d: "量正面和侧面两条对角线，对角交替调整；确认方正后按对角顺序锁紧所有角码（2–3 N·m）。", k: "对角线差 ≤2 mm，四角 90°" },
      { t: "装端盖", d: caps.tap
          ? "端面已由卖家攻好 M4 螺纹：螺丝穿进端盖，先手拧 2–3 圈找正，再轻轻拧到底。别用电批——塑料盖一裂就废。"
          : (caps.screw
            ? "自攻钉穿过端盖，垂直顶住端面中心孔，低速拧入 3–4 圈到底。一次拧歪会把孔撑大，拆下来就滑丝。"
            : "每根型材端面压一个卡扣端盖，四根立柱顶也压。压之前先用砂纸过一遍切口毛刺，不然盖子会被顶歪。"),
        k: caps.screw ? "螺丝都不歪，盖不翘边" : "每个端面都有盖，压到底、不歪" },
      { t: "贴防滑垫 + 脚垫", d: "每根承重横梁上贴一条 EVA 垫（防金属声 + 防盆底磨损）；四角贴脚垫。", k: "抽拉无金属摩擦声" },
      { t: "加载试抽", d: "每只盆装到预期重量的 1.5 倍，连续抽拉 20 次；24 小时后再复紧一遍角码。", k: "盆不下垂、型材无咯吱声" }
    ];
    var tools = ["内六角扳手 4 号", "卷尺", "直角尺", "橡胶锤", "美工刀（修垫片）", "砂纸 / 锉刀（去毛刺）", "手套"];
    if (caps.tap) tools.push("M4 丝锥 + 铰手（卖家不代攻丝时）");
    if (caps.screw) tools.push("十字螺丝刀（小号）");
    var pitfalls = [
      "别用自攻螺丝直接拧进型材：必须 T 螺母 + 内六角，自攻会把槽撑裂。",
      "2020 型材单盆别超过 8 kg：梁会明显下弯，抽拉开始发涩。",
      "盆是塑料的，长期抽拉会磨白型材表面：贴一条 EVA 或特氟龙胶带。",
      "端盖一定要装全：型材切口是「刀口」，不装盖会刮手、刮衣服。",
      "顶板 3mm 亚克力不能站、不能压重物；靠窗放要避开直晒，会翘。",
      "立柱下料宁可长 1 mm：短了没法通过螺母微调来找方，只能返工。",
      "端面攻丝别用手电钻硬怼：M4 丝锥必须垂直，歪 2° 螺丝就锁不紧；宁可花 1.2 元/孔让卖家攻。",
      "螺丝端盖别用电动螺丝刀：塑料盖受力集中，一次过头就开裂，手拧到「贴着」即可。"
    ];
    return {
      intro: "按当前方案（" + d.N + " 层，" + d.W + "×" + d.D + "×" + d.H + " mm）生成，一个人约 1.5–2 小时，全程不用打孔。",
      steps: steps, tools: tools, pitfalls: pitfalls,
      keyNumbers: [
        { k: "外廓", v: d.W + "×" + d.D + "×" + d.H },
        { k: "层距", v: d.Hd + " mm" },
        { k: "盆尺寸", v: d.binW + "×" + d.binD + "×" + d.binH },
        { k: "立柱长", v: d.Lv + " mm" },
        { k: "型材总长", v: p.cutTotalM.toFixed(2) + " m" },
        { k: "角码数", v: (p.cut.reduce(function (s, c) { return s + c.qty; }, 0) - 4) * 2 + " 个" }
      ]
    };
  }

  var api = {
    PROFILES: PROFILES, CAPFIX: CAPFIX, BINS: BINS, TOPS: TOPS, FEETS: FEETS, COLORS: COLORS, BIN_COLORS: BIN_COLORS,
    PRICE: PRICE, CLEAR: CLEAR, SIDE_GAP: SIDE_GAP,
    computeTray: computeTray, buildSteps: buildSteps, toText: toText, toCSV: toCSV
  };
  return api;
})();

export default api;
