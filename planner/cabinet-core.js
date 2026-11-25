/*!
 * cabinet-core.js —— 铝型材抽屉柜「切料 + 预算」纯逻辑层
 * 不依赖 DOM，可被浏览器 <script> 引入（window.CabinetCore），也可被 Node require。
 * 参考对象：小红书「铝型材抽屉柜，搭配不锈钢台面」（长虹纹亚克力 + 2020 抽屉框 + 三节导轨）。
 * 所有内部长度单位为 mm，界面输入用 cm。
 */
(function (global) {
  "use strict";

  /* ---------------- 型材规格 ---------------- */
  var PROFILES = {
    "2020": { label: "2020（20×20）", size: 20, slot: 6, price: 10 },
    "3030": { label: "3030（30×30）", size: 30, slot: 8, price: 18 },
    "4040": { label: "4040（40×40）", size: 40, slot: 8, price: 28 }
  };
  var DRAWER_PROFILE = "2020";

  /* ---------------- 面板 ---------------- */
  var PANELS = {
    flute:    { label: "长虹纹亚克力 5mm", price: 260, th: 5 },
    clear:    { label: "透明亚克力 5mm",   price: 180, th: 5 },
    opal:     { label: "乳白亚克力 5mm",   price: 200, th: 5 },
    wood:     { label: "多层板 8mm",       price: 120, th: 8 }
  };

  /* ---------------- 顶部 ---------------- */
  var TOPS = {
    steel: { label: "拉丝不锈钢 1.2mm", price: 300, note: "底下垫 8mm 多层板" },
    wood:  { label: "多层板 18mm",      price: 150, note: "封边后上木蜡油" },
    none:  { label: "不装台面",          price: 0,   note: "" }
  };

  /* ---------------- 脚 ---------------- */
  var FEETS = {
    caster: { label: "万向轮 2 寸（2 带刹）", h: 60, price: 16 },
    level:  { label: "M10 调节脚",           h: 25, price: 8 },
    none:   { label: "直接落地（加胶垫）",     h: 0,  price: 3 }
  };

  /* ---------------- 价格（元，参考区间中值） ---------------- */
  var PRICE = {
    bracket: 1.6,        // 角码（含 T 螺母 + 内六角）
    endcap: 0.4,         // 卡扣端盖（基准价，实际用 CAPFIX）
    tapPerHole: 1.2,     // 端面攻丝，每孔
    tapMin: 10,          // 攻丝起收
    gasketPerM: 2.5,     // 压条（嵌条）
    slide: 22,           // 三节钢珠导轨 / 对
    handle: 12,          // 不锈钢 U 型拉手
    plywoodM2: 120,      // 8mm 多层板（底板 / 抽屉底）
    sheetCraft: 15,      // 每块板的激光切割工时
    cutPerM: 1.0,        // 型材切料费
    screwPack: 30
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

  var SLIDE_STD = [250, 300, 350, 400, 450, 500];
  var GAP = 4;              // 抽屉之间 / 上下留缝
  var SLIDE_SIDE = 12.7;    // 三节轨单侧占位
  var CARRIAGE = 2;         // 抽屉两侧让位

  function round5(v) { return Math.round(v / 5) * 5; }
  function floor5(v) { return Math.floor(v / 5) * 5; }   // 型材只往下取整，宁短不长

  /* ---------------- 主计算 ---------------- */
  function computeCabinet(input) {
    var o = Object.assign({
      W: 450, D: 400, H: 760, N: 4,
      prof: "3030", panel: "flute", top: "steel", feet: "caster",
      capFix: "press", drawerProf: DRAWER_PROFILE
    }, input || {});

    var W = clamp(o.W, 250, 1200), D = clamp(o.D, 200, 800), H = clamp(o.H, 300, 1500);
    var N = clamp(Math.round(o.N), 1, 8);
    var prof = PROFILES[o.prof] || PROFILES["3030"];
    var dp = PROFILES[o.drawerProf] || PROFILES[DRAWER_PROFILE];
    var panel = PANELS[o.panel] || PANELS.flute;
    var top = TOPS[o.top] || TOPS.steel;
    var feet = FEETS[o.feet] || FEETS.caster;
    var caps = CAPFIX[o.capFix] || CAPFIX.press;

    var p = prof.size, q = dp.size, si = Math.round(panel.th / 2) + 3; // 面板插入槽的余量

    var legH = feet.h;
    var frameH = floor5(H - legH);               // 型材框总高
    var Wi = W - 2 * p, Di = D - 2 * p;          // 内空宽 / 深
    var Hi = frameH - 2 * p;                     // 内空高（顶框 + 底框各占 p）
    var Hd = floor5((Hi - (N + 1) * GAP) / N);   // 单抽高度（向下取整，防止装不进去）
    var WD = floor5(Wi - CARRIAGE);              // 抽屉宽
    var DD = floor5(Di - 2 * SLIDE_SIDE - 2);    // 抽屉深（导轨占位）
    var slide = pickSlide(DD);

    var warnings = [], notes = [];

    if (Hd < 70) warnings.push("抽屉净高 " + Hd + " mm 偏矮：三节轨和高一点的收纳盒都塞不进，建议层数减 1 或整柜加高。");
    if (DD < 250) warnings.push("抽屉深只有 " + DD + " mm，装不下最短的 250 三节轨，要么加深柜体，要么改用双节轨。");
    if (Wi < 200) warnings.push("内空宽 " + Wi + " mm 太窄，抽屉基本放不了东西。");
    if (frameH > 1100) warnings.push("柜体高 " + frameH + " mm，做成可移动柜会有倾覆风险：靠墙使用或加装防倒带。");
    if (W > 900 && o.prof === "3030") warnings.push("宽 " + W + " mm 用 3030 中间会塌腰，建议换 4040 或在每层中间加一根立柱。");
    if (N > 6) warnings.push(N + " 个抽屉会把单抽压到 " + Hd + " mm，抽屉越矮越难用，建议 3–5 个。");
    if (!slide) warnings.push("抽屉深 " + DD + " mm 超出标准导轨范围（250–500），需定制导轨或改尺寸。");

    /* ---------- 切料表 ---------- */
    var cut = [];
    addCut(cut, prof.label + " 立柱", frameH, 4, "柜体");
    addCut(cut, prof.label + " 顶框/底框前后", W - 2 * p, 4, "柜体");
    addCut(cut, prof.label + " 顶框/底框左右", D - 2 * p, 4, "柜体");
    addCut(cut, dp.label + " 抽屉前横", WD, 3 * N, "抽屉");
    addCut(cut, dp.label + " 抽屉前竖", Hd, 2 * N, "抽屉");
    addCut(cut, dp.label + " 抽屉侧上沿", DD, 2 * N, "抽屉");

    var cutTotalM = cut.reduce(function (s, c) { return s + c.len * c.qty; }, 0) / 1000;

    /* ---------- 面板 ---------- */
    var panelSet = [];
    var openW = WD - 2 * q + 2 * 6, openH = Hd - 2 * q + 2 * 6;
    panelSet.push({ name: "抽屉前板", w: openW, h: openH, qty: N, mat: panel.label });
    panelSet.push({ name: "抽屉侧板", w: DD - 2 * q + 2 * 6, h: openH, qty: 2 * N, mat: panel.label });
    panelSet.push({ name: "抽屉底板", w: WD - 2 * q + 2 * 6, h: DD - 2 * q + 2 * 6, qty: N, mat: "8mm 多层板" });
    panelSet.push({ name: "柜体侧板", w: Di + 2 * si, h: Hi + 2 * si, qty: 2, mat: panel.label });
    panelSet.push({ name: "柜体背板", w: Wi + 2 * si, h: Hi + 2 * si, qty: 1, mat: panel.label });
    panelSet.push({ name: "柜体底板", w: Wi + 2 * si, h: Di + 2 * si, qty: 1, mat: "8mm 多层板" });
    if (top.price > 0) panelSet.push({ name: "台面", w: W, h: D, qty: 1, mat: top.label });

    var panelArea = panelSet.reduce(function (s, x) {
      return s + (x.w * x.h * x.qty) / 1e6;
    }, 0);

    /* ---------- 五金 ---------- */
    var parts = [];
    var brackets = 16 + 4 + 8 * N;                // 柜体 8 角×2 + 底板 4 + 抽屉 8×N
    parts.push({ name: "角码 + T 螺母 + 内六角", spec: "M5，3030/2020 通用", qty: brackets + " 套", price: brackets * PRICE.bracket });
    var endcaps = 8 + 16 + 8 * N;
    parts.push({
      name: "型材端盖",
      spec: caps.screw ? "塑料盖 + M4 螺丝，按型材规格配" : "塑料卡扣盖，按型材规格配",
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
    var gasketM = panelSet.reduce(function (s, x) { return s + 2 * (x.w + x.h) * x.qty; }, 0) / 1000;
    parts.push({ name: "压条（面板嵌条）", spec: "5mm 板配 6mm 槽", qty: gasketM.toFixed(1) + " m", price: gasketM * PRICE.gasketPerM });
    parts.push({ name: "三节钢珠导轨", spec: slide ? slide + " mm" : "定制", qty: N + " 对", price: N * PRICE.slide });
    parts.push({ name: "不锈钢 U 型拉手", spec: "孔距 128 mm", qty: N + " 个", price: N * PRICE.handle });
    parts.push({ name: "万向轮", spec: feet.label, qty: feet.h > 0 ? 4 + " 个" : "—", price: feet.h > 0 ? 4 * feet.price : 4 * 3 });
    parts.push({ name: "螺丝 / 扳手 / 砂纸", spec: "内六角 4 号 5 号", qty: "1 包", price: PRICE.screwPack });

    /* ---------- 造价 ---------- */
    var frameM = (frameH * 4 + (W - 2 * p) * 4 + (D - 2 * p) * 4) / 1000;
    var drawerM = (WD * 3 + Hd * 2 + DD * 2) * N / 1000;
    var cutFee = (frameM + drawerM) * PRICE.cutPerM;

    var lines = [];
    lines.push(line("铝型材 " + prof.label, frameM.toFixed(2) + " m", frameM * prof.price, prof.label,
      (o.prof || "3030") + "铝型材 银色 氧化"));
    lines.push(line("铝型材 " + dp.label + "（抽屉）", drawerM.toFixed(2) + " m", drawerM * dp.price, dp.label + " 抽屉",
      "2020铝型材 银色 氧化"));
    var panelCost = panelSet.reduce(function (s, x) {
      var m2 = (x.w * x.h / 1e6) * x.qty;
      var uni = x.mat === "8mm 多层板" ? PRICE.plywoodM2 : panel.price;
      return s + m2 * uni;
    }, 0) + panelSet.reduce(function (s) { return s + PRICE.sheetCraft; }, 0);
    lines.push(line("面板（切割 + 材料）", panelArea.toFixed(2) + " ㎡", panelCost, panel.label,
      panel.label.indexOf("长虹") >= 0 ? "长虹纹亚克力 5mm 定制" : panel.label + " 定制 切割"));
    var KW = {
      "角码 + T 螺母 + 内六角": "铝型材角码 T型螺母 M5",
      "型材端盖": caps.screw ? "铝型材端盖 3030 带螺丝 M4" : "铝型材端盖 3030 2020",
      "端面攻丝（M4）": "铝型材 端面攻丝 M4 加工 定制",
      "压条（面板嵌条）": "亚克力压条 嵌条 6mm",
      "三节钢珠导轨": "三节钢珠导轨 " + (slide || 300),
      "不锈钢 U 型拉手": "不锈钢U型拉手 孔距128",
      "万向轮": o.feet === "caster" ? "万向轮 2寸 带刹车" : (o.feet === "level" ? "M10 调节脚" : "硅胶脚垫"),
      "螺丝 / 扳手 / 砂纸": "内六角扳手套装"
    };
    parts.forEach(function (pt) { lines.push(line(pt.name, pt.spec, pt.price, "", KW[pt.name] || "")); });
    if (top.price > 0) {
      lines.push(line("台面加工", (W / 1000) + "×" + (D / 1000) + " m", (W * D / 1e6) * top.price + 40, top.note,
        o.top === "wood" ? "多层板 18mm 定制" : "304不锈钢台面 定制 折边"));
    }
    lines.push(line("切料费", (frameM + drawerM).toFixed(2) + " m", cutFee, ""));

    var total = lines.reduce(function (s, l) { return s + l.price; }, 0);
    var lo = Math.round(total * 0.8 / 10) * 10, hi = Math.round(total * 1.25 / 10) * 10;
    lines.forEach(function (l) { l.lo = Math.round(l.price * 0.8); l.hi = Math.round(l.price * 1.25); });

    return {
      ok: true,
      input: o,
      dims: {
        W: W, D: D, H: H, legH: legH, frameH: frameH,
        Wi: Wi, Di: Di, Hi: Hi, Hd: Hd, WD: WD, DD: DD,
        slide: slide, drawerN: N, gap: GAP, profSize: p, drawerProfSize: q, panelT: panel.th
      },
      cut: cut, cutTotalM: cutTotalM,
      panels: panelSet, panelArea: panelArea,
      parts: parts, lines: lines,
      capFix: CAPFIX[o.capFix] ? o.capFix : "press",
      capLabel: caps.label, capCount: endcaps, capHoles: caps.hole ? endcaps : 0,
      capNote: caps.note,
      total: Math.round(total), lo: lo, hi: hi,
      warnings: warnings, notes: notes,
      explain: "柜体 " + W + "×" + D + "×" + H + " mm，" + prof.label + " 外框；内空 " + Wi + "×" + Di + "×" + Hi +
        " mm，均分 " + N + " 抽 → 单抽净高 " + Hd + " mm；抽屉深 " + DD + " mm 配 " + (slide || "定制") + " 导轨。"
    };
  }

  function pickSlide(dd) {
    var best = null;
    SLIDE_STD.forEach(function (s) { if (s <= dd && (!best || s > best)) best = s; });
    return best;
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

  function clamp(v, a, b) { return Math.min(b, Math.max(a, Number(v) || a)); }

  /* ---------------- 文本导出 ---------------- */
  function toText(p) {
    var L = [];
    L.push("【铝型材抽屉柜 · 切料清单】");
    L.push(p.explain);
    L.push("");
    L.push("— 型材切料（共 " + p.cutTotalM.toFixed(2) + " m）—");
    p.cut.forEach(function (c) {
      L.push("  " + c.name + "：" + c.len + " mm × " + c.qty + " 根");
    });
    L.push("");
    L.push("— 面板（共 " + p.panelArea.toFixed(2) + " ㎡）—");
    p.panels.forEach(function (x) {
      L.push("  " + x.name + "：" + x.w + " × " + x.h + " mm × " + x.qty + "（" + x.mat + "）");
    });
    L.push("");
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
    p.panels.forEach(function (x) { rows.push(["面板", x.name, x.w + "×" + x.h + " mm", x.qty + " 块", ""]); });
    p.parts.forEach(function (x) { rows.push(["五金", x.name, x.spec, x.qty, "¥" + x.price]); });
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
      { t: "切料核对", d: "把型材按长度分堆，用卷尺逐根复量。误差 ±1 mm 以内可直接装，超过 2 mm 让卖家重切——铝型材切口是斜面，短了没救。", k: "四根立柱长度必须一致（" + d.frameH + " mm）" },
      { t: "立柱穿 T 螺母", d: "每根立柱按图纸位置把 T 螺母滑进槽里（先不拧紧），一个角码位放 1 颗。", k: "T 螺母能顺槽滑到底、不卡" },
      { t: "组底框", d: "四根立柱 + 底框四杆，用角码先虚接。放在平整地面（瓷砖/地板，别在地毯上）拼。", k: "底框对角线差 ≤ 2 mm" },
      { t: "装底板", d: "8mm 多层板落进底框槽内，四角压角码固定。", k: "板面与框齐平，不翘" },
      { t: "立柜体 + 校方", d: "把四根立柱立起来，量顶部对角线；对角交替轻敲调整，确认方正后按对角顺序锁紧角码（2–3 N·m，别用死力）。", k: "两对角线差 ≤ 2 mm，四角都 90°" },
      { t: "装侧板 / 背板", d: "长虹亚克力从顶部开口滑进立柱槽，塞压条锁紧；两块侧板同色朝向一致（长虹纹的竖向要统一）。", k: "板不晃、纹路方向一致" },
      { t: "装顶框 + 台面", d: "顶框四杆压上，不锈钢台面落进框内（下面垫 8mm 板），四角用角码或双面胶固定。", k: "台面不响、不跷边" },
      { t: "做抽屉", d: "每个抽屉：前框 4 根（" + d.WD + " 横 + " + d.Hd + " 竖）+ 左右上沿 + 后上沿，插前板/侧板，底板用角码托住。先做一个试装。", k: "抽屉方正、板不晃动" },
      { t: "装导轨", d: "导轨内轨固定在抽屉侧板外侧，外轨固定在柜体立柱内侧；两侧等高，前后对齐（同一水平线）。", k: "抽屉推进去两侧缝隙一样大" },
      { t: "装拉手", d: "拉手装在前框上横杆正面，先定位打孔（用中心冲），再上螺丝。", k: "拉手居中，左右对称" },
      { t: "装脚轮", d: "底板四角装万向轮（带刹的两个装前侧），螺栓从底板下往上穿，加垫片。", k: "四个轮都着地，推起来不晃" },
      { t: "装端盖", d: caps.tap
          ? "端面已由卖家攻好 M4 螺纹：螺丝穿进端盖，先手拧 2–3 圈找正再拧到底。别用电批，塑料盖一裂就废。"
          : (caps.screw
            ? "自攻钉穿过端盖，垂直顶住端面中心孔，低速拧入 3–4 圈到底；拧歪会把孔撑大，拆下来就滑丝。"
            : "每根型材端面压一个卡扣端盖，立柱顶也压。压之前砂纸过一遍切口，不然盖子顶不平。"),
        k: caps.screw ? "螺丝都不歪，盖不翘边" : "每个端面都有盖，压到底" },
      { t: "负载测试", d: "每个抽屉先放 2–3 kg 试拉 10 次，听有没有异响；24 小时后再紧一遍角码。", k: "全开不点头、回弹顺畅" }
    ];
    var tools = ["内六角扳手 4/5 号", "卷尺", "直角尺", "橡胶锤", "电钻（装拉手/脚轮）", "水平尺", "美工刀（修压条）", "手套（型材切口很利）"];
    if (caps.tap) tools.push("M4 丝锥 + 铰手（卖家不代攻丝时）");
    if (caps.screw) tools.push("十字螺丝刀（小号）");
    var pitfalls = [
      "别用普通螺丝直接拧进型材：必须 T 螺母 + 内六角，自攻螺丝会把槽撑裂。",
      "长虹亚克力很脆：切口要倒角，装的时候别硬掰，压条是斜着压进去的。",
      "导轨必须两侧等高：差 1 mm 就会「推到底弹回来」，装之前先用记号笔画水平线。",
      "型材切口有毛刺：装之前用锉刀/砂纸过一遍，不然会刮手、刮板。",
      "台面不锈钢别用酸性清洁剂；贴膜撕掉后立刻擦干，否则会留水痕。",
      "万向轮装完先别锁紧，四个轮子着地后再统一拧死，不然柜子会「三条腿」晃。",
      "端面攻丝别用手电钻硬怼：M4 丝锥必须垂直，歪 2° 螺丝就锁不紧，宁可 1.2 元/孔让卖家攻。",
      "螺丝端盖别上电动螺丝刀：手拧到「贴住」即可，电动一次就过头、塑料盖开裂。",
      "3030 中心孔 φ6.8 偏大：直接攻 M4 锁不住，要么用 M8 沉头螺栓 + 扩孔的端盖，要么 3030 就用卡扣盖（2020 一端仍可攻 M5）。"
    ];
    return {
      intro: "按当前方案（" + p.dims.drawerN + " 抽，" + p.dims.W + "×" + p.dims.D + "×" + p.dims.H + " mm）生成，一个人约 4–5 小时，建议两人（一人扶、一人锁）。",
      steps: steps, tools: tools, pitfalls: pitfalls,
      keyNumbers: [
        { k: "单抽净高", v: d.Hd + " mm" },
        { k: "抽屉外形", v: d.WD + "×" + d.DD + " mm" },
        { k: "导轨长度", v: (d.slide || "定制") + " mm" },
        { k: "内空", v: d.Wi + "×" + d.Di + "×" + d.Hi },
        { k: "型材总长", v: p.cutTotalM.toFixed(2) + " m" },
        { k: "面板面积", v: p.panelArea.toFixed(2) + " ㎡" }
      ]
    };
  }

  var api = {
    PROFILES: PROFILES, CAPFIX: CAPFIX, PANELS: PANELS, TOPS: TOPS, FEETS: FEETS, PRICE: PRICE,
    computeCabinet: computeCabinet, buildSteps: buildSteps, toText: toText, toCSV: toCSV,
    pickSlide: pickSlide
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.CabinetCore = api;
})(typeof window !== "undefined" ? window : globalThis);
