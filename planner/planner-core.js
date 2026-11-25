/*!
 * planner-core.js —— 光轴展示架「层数智能规划」纯逻辑层
 * 不依赖 DOM，可在浏览器 <script> 直接引入（挂到 window.PlannerCore），也可被 Node 测试 require。
 * 所有内部长度单位为 mm，界面输入用 cm。
 */
(function (global) {
  "use strict";

  /* ---------------- 车模规格（mm） ---------------- */
  var SCALES = {
    "1:64": { label: "1:64 小车（风火轮 / 火柴盒）", len: 72, wid: 33, hgt: 28, slotMin: 40 },
    "1:43": { label: "1:43 车模", len: 105, wid: 48, hgt: 40, slotMin: 58 },
    "1:24": { label: "1:24 大比例", len: 185, wid: 82, hgt: 68, slotMin: 96 }
  };

  /* ---------------- 价格（参考，元） ---------------- */
  var PRICE = {
    rodPerM10: 12.5, rodPerM8: 9.0,
    cutPerPiece: 1.5,
    clamp10: 6.0, clamp8: 4.0,
    seat: 8.0,
    acrylicM2_5mm: 130, acrylicM2_8mm: 200, acrylicM2_3mm: 110,
    shelfCraft: 18,      // 每片激光切割 + 热弯 + 抛光
    plateCraft: 25,
    doorCraft: 20,
    lightBase: 140, power: 30, switch: 20,
    hinge: 28, magnet: 15, feet: 15, misc: 90
  };

  /* ---------------- 3D 打印参数（与 petg/gen_stl.py 保持一致） ---------------- */
  var PRINT = {
    bed: 245,          // 可用打印幅面
    th: 3.0, skin: 1.0, rim: 2.0, rib: 1.2, pitch: 25.0, frameRim: 8.0,
    lipH: 15.0, lipT: 3.0, spliceL: 60.0, spliceW: 18.0, spliceT: 1.8,
    density: 1.27,     // PETG g/cm³
    gPerHour: 11.0,    // 透明慢速打印经验出料速度
    pricePerKg: 65,    // 元/kg
    sheetPriceM2: 20   // 1.5mm 透明 PET 片 元/㎡
  };

  var BASE = 40;   // 底板到第一层的高度
  var EDGE = 30;   // 每侧避让：四角 35mm 缺口会吃掉最边上一点，两侧各让 30
  var FOOT = 15;   // 脚垫 / 调节脚高度
  var SIDE_GAP = 10; // 左右各留

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function round5(v) { return Math.round(v / 5) * 5; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  /* 自动层距：车高 + 余量，取 5 的倍数，且不小于 55 */
  function autoPitch(scaleKey, carHgt) {
    return clamp(round5(carHgt + 32), 55, 120);
  }

  /* ---------------- 打印计划 ---------------- */
  function tileVolumeCm3(w, d, mode) {
    var P = PRINT, skin = P.skin, th = P.th;
    var v = 0;
    if (mode === "frame") {
      var fr = P.frameRim;
      v += (w * fr * 2 + (d - 2 * fr) * fr * 2) * th;      // 外框
      var x = fr + P.pitch;
      while (x < w - fr - 0.1) {
        v += Math.min(P.rib, w - fr - x) * (d - 2 * fr) * th;
        x += P.pitch;
      }
      return v / 1000;
    }
    v += w * d * skin;                                      // 实心皮
    var inner = th - skin;
    var r = P.rim;
    v += (w * r * 2 + (d - 2 * r) * r * 2) * inner;         // 四边立边
    var xx = r;
    while (xx < w - r - 0.1) {
      v += Math.min(P.rib, w - r - xx) * (d - 2 * r) * inner;
      xx += P.pitch;
    }
    v += (w - 2 * r) * P.rib * inner;                        // 中间横筋
    return v / 1000;
  }

  function buildPrintPlan(frameW, frameD, layers, mode) {
    var P = PRINT;
    var shelfW = frameW - 20, shelfD = frameD - 10;          // 宽内缩 10/边（避开立柱），深内缩 5/边
    var cols = Math.ceil(shelfW / P.bed);
    var rows = Math.ceil(shelfD / P.bed);
    var tw = shelfW / cols, td = shelfD / rows;

    var tileCm3 = tileVolumeCm3(tw, td, mode === "frame" ? "frame" : "full");
    var tileG = tileCm3 * P.density;
    var lipCm3 = tw * P.lipT * P.lipH / 1000;
    var lipG = lipCm3 * P.density;
    var spliceCm3 = P.spliceL * P.spliceW * P.spliceT / 1000;
    var spliceG = spliceCm3 * P.density;

    var tiles = cols * rows;
    var lips = cols;
    var splices = cols + rows - 1;

    var gramsTiles = tileG * tiles * layers;
    var gramsLips = lipG * lips * layers;
    var gramsSplices = spliceG * splices * layers;
    var grams = gramsTiles + gramsLips + gramsSplices;
    var hours = grams / P.gPerHour;

    var sheetM2 = (shelfW / 1000) * (shelfD / 1000) * layers;
    var sheetCost = mode === "frame" ? sheetM2 * P.sheetPriceM2 : 0;

    // 一床放得下几片（按可用幅面算）
    var perPlate = Math.max(1, Math.floor(P.bed / tw) * Math.floor(P.bed / td));
    var plates = Math.ceil((tiles * layers) / perPlate);

    return {
      perPlate: perPlate, plates: plates,
      mode: mode, bed: P.bed,
      shelf: { W: Math.round(shelfW), D: Math.round(shelfD) },
      cols: cols, rows: rows, tw: Math.round(tw * 10) / 10, td: Math.round(td * 10) / 10,
      tiles: tiles, tilesTotal: tiles * layers,
      tileG: Math.round(tileG * 10) / 10,
      tileHours: tileG / P.gPerHour,
      lips: lips, lipsTotal: lips * layers, lipG: Math.round(lipG * 10) / 10,
      splices: splices, splicesTotal: splices * layers, spliceG: Math.round(spliceG * 10) / 10,
      grams: grams, kg: grams / 1000, hours: hours,
      filamentCost: grams / 1000 * P.pricePerKg,
      sheetM2: sheetM2, sheetCost: sheetCost,
      totalCost: grams / 1000 * P.pricePerKg + sheetCost,
      perTile: { w: Math.round(tw * 10) / 10, d: Math.round(td * 10) / 10 }
    };
  }

  /**
   * 核心计算
   * @param {object} o
   *   scale, spaceW/spaceD/spaceH (cm), mode: 'space'|'cars'|'manual',
   *   cars (台), layers (手动), spacing (mm 车距), pitch (mm 或 'auto'),
   *   withDoor, withLight, withBack, withSide, budget (元 或 null),
   *   rod: '10'|'8', preset: 'standard'|'lite'
   */
  function computePlan(o) {
    o = o || {};
    var scaleKey = SCALES[o.scale] ? o.scale : "1:64";
    var car = SCALES[scaleKey];

    var spaceW = clamp(num(o.spaceW, 60), 20, 300) * 10;
    var spaceD = clamp(num(o.spaceD, 30), 15, 200) * 10;
    var spaceH = clamp(num(o.spaceH, 55), 20, 300) * 10;

    var material = (o.shelfMaterial === "petg" || o.shelfMaterial === "petg_frame") ? o.shelfMaterial : "acrylic";
    var rodDia = o.rod === "8" ? 8 : 10;
    var rodPriceM = rodDia === 8 ? PRICE.rodPerM8 : PRICE.rodPerM10;
    var clampPrice = rodDia === 8 ? PRICE.clamp8 : PRICE.clamp10;

    var spacing = clamp(num(o.spacing, 18), 0, 80);      // 台与台之间净距
    var slot = Math.max(car.wid + spacing, car.slotMin); // 车位节距

    var pitch = (o.pitch === "auto" || o.pitch == null)
      ? autoPitch(scaleKey, car.hgt)
      : clamp(num(o.pitch, 60), car.hgt + 15, 160);

    /* ---- 平面 ---- */
    var frameW = Math.max(spaceW - 2 * SIDE_GAP, 200);
    var frameD = Math.max(spaceD - 2 * SIDE_GAP, 120);
    var usableW = frameW - 2 * EDGE;
    var perLayerMax = Math.floor(usableW / slot);

    /* ---- 竖向 ---- */
    var topGap = o.withLight ? 42 : 25;   // 顶层之上留给灯盒 / 余量
    var availH = spaceH - BASE - topGap - FOOT;
    var maxLayers = Math.floor(availH / pitch);

    var warnings = [];
    var notes = [];

    if (perLayerMax < 1) {
      return {
        ok: false,
        error: "宽度不够：这个比例的车至少需要 " + Math.round(slot) +
          " mm 一个车位，当前只能放 " + Math.max(perLayerMax, 0) + " 台。",
        perLayerMax: perLayerMax
      };
    }
    if (maxLayers < 1) {
      return {
        ok: false,
        error: "高度不够：层距 " + pitch + " mm 下，最多只能做 0 层。" +
          "请把内空高度加到 ≥ " + (BASE + topGap + FOOT + pitch) / 10 + " cm，或改用更小比例的车模。",
        maxLayers: maxLayers
      };
    }
    maxLayers = Math.min(maxLayers, 30);

    /* ---- 层数决策 ---- */
    var mode = o.mode || "space";
    var layers, reason;
    var carsTarget = num(o.cars, 0);

    if (mode === "manual") {
      layers = clamp(Math.round(num(o.layers, maxLayers)), 1, 30);
      reason = "手动指定";
    } else if (mode === "cars" && carsTarget >= 1) {
      layers = Math.ceil(carsTarget / perLayerMax);
      reason = "按 " + carsTarget + " 台车倒推";
    } else {
      layers = maxLayers;
      reason = "按空间做到最满";
    }

    var desired = layers;
    if (layers > maxLayers) {
      layers = maxLayers;
      notes.push({
        type: "warn",
        text: "想放 " + desired + " 层，但内空只支持 " + maxLayers + " 层。" +
          "按 " + maxLayers + " 层算，总共能放 " + maxLayers * perLayerMax + " 台" +
          (carsTarget ? "，还差 " + Math.max(0, carsTarget - maxLayers * perLayerMax) + " 台" : "") + "。"
      });
    }

    var perLayer = perLayerMax;
    var capacity = layers * perLayer;

    /* ---- 尺寸 ---- */
    var uprightLen = BASE + layers * pitch + topGap;
    var frameH = uprightLen + FOOT;
    var rodLen = frameW + 20;             // 横杆两端各出头 10
    var shelfW = frameW;                  // 层板与立柱外沿齐，四角开缺口
    var shelfD = frameD;
    var nH = layers + 1;                  // 横杆层数（含顶框）

    /* ---- 校验 ---- */
    if (frameD < car.len + 12) {
      warnings.push("深度 " + Math.round(frameD) + " mm 比车长 " + car.len +
        " mm 富余不足，车头容易顶到背板/门；建议深度 ≥ " + (car.len + 40) / 10 + " cm，或改成斜放。");
    }
    if (frameH / frameW > 1.6) {
      warnings.push("高宽比 " + (frameH / frameW).toFixed(2) +
        " 偏瘦高（>1.6），建议配 L 角码固定到墙上，避免前倾。");
    }
    if (frameW > 700) {
      warnings.push("跨宽 " + Math.round(frameW) +
        " mm 超过 700，层板中间会明显下沉；建议中间加一对立柱或把宽度拆成两组。");
    }

    /* 如果差一点点就能多一层，提示改层距 */
    if (mode !== "manual") {
      var tighter = clamp(pitch - 5, car.hgt + 15, pitch);
      if (tighter < pitch) {
        var alt = Math.floor(availH / tighter);
        if (alt > maxLayers) {
          notes.push({
            type: "tip",
            text: "把层距从 " + pitch + " 改成 " + tighter + " mm，可以多塞 " + (alt - maxLayers) +
              " 层（净空会变紧，高一点的 SUV/皮卡可能放不进）。"
          });
        }
      }
    }

    /* ---- 造价 ---- */
    var shelfM2 = (shelfW / 1000) * (shelfD / 1000);
    var printPlan = null;
    var costShelves;
    if (material === "acrylic") {
      costShelves = layers * ((shelfM2 * PRICE.acrylicM2_5mm) + PRICE.shelfCraft);
    } else {
      printPlan = buildPrintPlan(frameW, frameD, layers, material === "petg_frame" ? "frame" : "full");
      costShelves = printPlan.totalCost;
    }
    var costRods = ((uprightLen * 4 + rodLen * 2 * nH) / 1000) * rodPriceM +
      (4 + 2 * nH) * PRICE.cutPerPiece;
    var costClamps = 4 * nH * clampPrice;
    var costSeats = 4 * PRICE.seat;
    var baseM2 = ((frameW + 20) / 1000) * ((frameD + 20) / 1000);
    var costBase = baseM2 * PRICE.acrylicM2_8mm + PRICE.plateCraft;
    var costDoor = 0, costBack = 0, costSide = 0, costHinge = 0, costMagnet = 0;
    if (o.withDoor) {
      costDoor = ((frameW / 1000) * ((frameH - 20) / 1000)) * PRICE.acrylicM2_3mm + PRICE.doorCraft;
      costHinge = PRICE.hinge; costMagnet = PRICE.magnet;
    }
    if (o.withBack) costBack = ((frameW / 1000) * (uprightLen / 1000)) * PRICE.acrylicM2_3mm + PRICE.doorCraft;
    if (o.withSide) costSide = 2 * (((frameD / 1000) * (uprightLen / 1000)) * PRICE.acrylicM2_3mm + PRICE.doorCraft);
    var costLight = 0;
    if (o.withLight) costLight = PRICE.lightBase + (frameW / 600) * 30 + PRICE.power + PRICE.switch;

    var lines = [
      { name: "镀铬光轴 φ" + rodDia + "（立柱）", kw: "镀铬光轴 φ" + rodDia + " " + Math.round(uprightLen) + "mm", spec: "φ" + rodDia + " × " + Math.round(uprightLen) + " mm", qty: 4, u: "根", unit: rodPriceM * uprightLen / 1000 + PRICE.cutPerPiece },
      { name: "镀铬光轴 φ" + rodDia + "（横杆）", kw: "镀铬光轴 φ" + rodDia + " " + Math.round(rodLen) + "mm", spec: "φ" + rodDia + " × " + Math.round(rodLen) + " mm", qty: 2 * nH, u: "根", unit: rodPriceM * rodLen / 1000 + PRICE.cutPerPiece },
      { name: "铝合金光轴十字夹", kw: "光轴十字夹 φ" + rodDia + " 铝合金", spec: "同径 φ" + rodDia + " × φ" + rodDia, qty: 4 * nH, u: "个", unit: clampPrice },
      { name: "圆法兰光轴固定座", kw: "SHF" + rodDia + " 光轴固定座", spec: "SHF" + rodDia, qty: 4, u: "个", unit: PRICE.seat },
      (material === "acrylic"
        ? { name: "亚克力层板（5 mm 浇铸）", kw: "亚克力定制 激光切割 5mm", spec: Math.round(shelfW) + " × " + Math.round(shelfD) + "，四角 35 缺口 + 15 前挡", qty: layers, u: "片", unit: shelfM2 * PRICE.acrylicM2_5mm + PRICE.shelfCraft }
        : { name: "PETG 耗材（层板）", kw: "PETG 透明 3D打印耗材 1.75mm 1kg", spec: "深色/透明 PETG，约 " + (printPlan.kg).toFixed(2) + " kg；打印 " + Math.round(printPlan.hours) + " h", qty: Math.round(printPlan.kg * 100) / 100, u: "kg", unit: PRICE.petgPerKg || PRINT.pricePerKg }),
      { name: "亚克力底板（8 mm）", kw: "亚克力板 8mm 定制 切割", spec: Math.round(frameW + 20) + " × " + Math.round(frameD + 20), qty: 1, u: "片", unit: costBase }
    ];
    if (o.withDoor) {
      lines.push({ name: "亚克力前门（3 mm）", kw: "亚克力板 3mm 定制 切割", spec: Math.round(frameW) + " × " + Math.round(frameH - 20), qty: 1, u: "片", unit: costDoor });
      lines.push({ name: "亚克力合页 + 磁吸", kw: "亚克力合页 透明 小号", spec: "透明小号 / φ6–8", qty: 1, u: "套", unit: costHinge + costMagnet });
    }
    if (o.withBack) lines.push({ name: "亚克力背板（3 mm）", kw: "亚克力板 3mm 定制 切割", spec: Math.round(frameW) + " × " + Math.round(uprightLen), qty: 1, u: "片", unit: costBack });
    if (o.withSide) lines.push({ name: "亚克力侧板（3 mm）", kw: "亚克力板 3mm 定制 切割", spec: Math.round(frameD) + " × " + Math.round(uprightLen), qty: 2, u: "片", unit: costSide / 2 });
    if (printPlan && material === "petg_frame") {
      lines.push({ name: "1.5 mm 透明 PET 片", spec: Math.round(printPlan.shelf.W) + " × " + Math.round(printPlan.shelf.D) + " × " + layers, qty: Math.round(printPlan.sheetM2 * 100) / 100, u: "㎡", unit: PRINT.sheetPriceM2 });
    }
    if (o.withLight) {
      lines.push({ name: "导光板灯箱（12 V）", kw: "导光板灯箱 定制 12v 侧发光", spec: Math.round(frameW - 50) + " × " + Math.round(frameD - 60) + " × 20", qty: 1, u: "个", unit: PRICE.lightBase + (frameW / 600) * 30 });
      lines.push({ name: "12 V 电源 + 调光开关", kw: "12V 2A 电源适配器 DC", spec: "2 A / 在线式", qty: 1, u: "套", unit: PRICE.power + PRICE.switch });
    }
    lines.push({ name: "脚垫 / 调节脚", kw: "硅胶脚垫 自粘 φ25", spec: "φ25 或 M6", qty: 4, u: "个", unit: PRICE.feet / 4 });
    lines.push({ name: "胶水 / 螺丝 / 工具", kw: material === "acrylic" ? "亚克力胶 氯仿" : "502 胶水 快干", spec: material === "acrylic" ? "氯仿 + M4 螺丝 + 内六角" : "502 胶 + M4 螺丝 + 内六角", qty: 1, u: "包", unit: PRICE.misc });

    var total = 0;
    lines.forEach(function (l) {
      l.subtotal = l.unit * l.qty;
      total += l.subtotal;
      var band = /十字夹/.test(l.name) ? [0.70, 1.35] : /亚克力/.test(l.name) ? [0.80, 1.40] : [0.78, 1.30];
      l.lo = Math.max(0.1, Math.round(l.unit * band[0] * 10) / 10);
      l.hi = Math.round(l.unit * band[1] * 10) / 10;
      if (!l.kw) l.kw = l.name.replace(/（.*?）/g, "").trim();
    });

    var budget = o.budget == null || o.budget === "" ? null : num(o.budget, 0);
    if (budget && total > budget) {
      var over = total - budget;
      notes.push({
        type: "warn",
        text: "超出预算约 " + Math.round(over) + " 元。可以：① 光轴换 φ8（省 ~25%）；② 少做 " +
          Math.max(1, Math.ceil(over / (costShelves / layers + costClamps / 4))) + " 层；③ 灯箱换灯条（省 ~90 元）。"
      });
    }

    var explain;
    if (mode === "cars" && carsTarget >= 1) {
      explain = carsTarget + " 台 ÷ 每层 " + perLayer + " 台 = " +
        (carsTarget / perLayer).toFixed(1) + " 层 → 向上取 " + desired + " 层";
      if (desired > maxLayers) explain += "，但内空最高只到 " + maxLayers + " 层，已按 " + maxLayers + " 层输出";
    } else if (mode === "manual") {
      explain = "手动指定 " + layers + " 层（内空上限 " + maxLayers + " 层）";
    } else {
      explain = "内空 " + Math.round(spaceH / 10) + " cm − 底 " + (BASE / 10).toFixed(1) +
        " − 顶 " + (topGap / 10).toFixed(1) + " − 脚 " + (FOOT / 10).toFixed(1) +
        " = " + (availH / 10).toFixed(1) + " cm ÷ 层距 " + (pitch / 10).toFixed(1) +
        " ≈ " + (availH / pitch).toFixed(1) + " → 取 " + maxLayers + " 层";
    }

    return {
      ok: true,
      explain: explain,
      spaceH: Math.round(spaceH),
      scale: scaleKey, scaleLabel: car.label,
      car: car,
      mode: mode, reason: reason,
      pitch: pitch, slot: slot, spacing: spacing,
      layers: layers, perLayer: perLayer, capacity: capacity,
      maxLayers: maxLayers, perLayerMax: perLayerMax,
      frame: {
        W: Math.round(frameW), D: Math.round(frameD), H: Math.round(frameH),
        uprightLen: Math.round(uprightLen), rodLen: Math.round(rodLen),
        shelfW: Math.round(shelfW), shelfD: Math.round(shelfD),
        nH: nH, topGap: topGap
      },
      lines: lines, total: total,
      totalMin: Math.round(total * 0.82 / 10) * 10,
      totalMax: Math.round(total * 1.22 / 10) * 10,
      warnings: warnings, notes: notes,
      material: material,
      printPlan: printPlan,
      layersOptions: buildOptions(maxLayers, perLayerMax, pitch, BASE, topGap, FOOT, availH)
    };
  }

  function buildOptions(maxLayers, perLayer, pitch, base, topGap, foot, availH) {
    var out = [];
    for (var i = 1; i <= maxLayers; i++) {
      out.push({ layers: i, capacity: i * perLayer, height: Math.round(base + i * pitch + topGap + foot) });
    }
    return out;
  }

  /* 生成可复制的采购清单文本 */
  function toText(p) {
    if (!p || !p.ok) return "";
    var L = [];
    L.push("【光轴展示架 · 采购清单】");
    L.push("方案：" + p.layers + " 层 × " + p.perLayer + " 台 = " + p.capacity + " 台（" + p.scaleLabel + "）");
    L.push("外廓：" + p.frame.W + " × " + p.frame.D + " × " + p.frame.H + " mm，层距 " + p.pitch + " mm");
    L.push("");
    p.lines.forEach(function (l) {
      L.push("· " + l.name + " | " + l.spec + " | " + l.qty + " " + (l.u || "个") + " | ≈" + Math.round(l.subtotal) + " 元");
    });
    L.push("");
    L.push("合计约 " + Math.round(p.total) + " 元（区间 " + p.totalMin + "–" + p.totalMax + " 元）");
    if (p.warnings.length) {
      L.push("");
      L.push("注意：");
      p.warnings.forEach(function (w) { L.push("· " + w); });
    }
    return L.join("\n");
  }

  /* ---------------- 安装步骤（随方案变化） ---------------- */
  function buildSteps(p) {
    if (!p || !p.ok) return null;
    var f = p.frame, L = p.layers, P = p.pitch;
    var topY = BASE + L * P;
    var diag = Math.sqrt(f.W * f.W + f.D * f.D).toFixed(1);
    var firstL = (BASE / 10).toString().replace(".0", "");
    var pitchCm = (P / 10).toString().replace(".0", "");
    var topCm = (topY / 10).toFixed(1).replace(".0", "");

    var steps = [
      {
        n: 1, title: "开箱清点，别急着装",
        desc: "4 根立柱 φ10×" + f.uprightLen + " mm、" + (2 * f.nH) + " 根横杆 φ10×" + f.rodLen +
          " mm、" + (4 * f.nH) + " 个十字夹、4 个固定座、" + L + " 片层板、" +
          "1 包 M4 螺丝。按长度分堆，层板按缺口朝向叠好。",
        check: "光轴放玻璃上滚一下，无明显跳动（≤0.2 mm）；层板四角缺口用卡尺抽查，35 ±0.5 mm。"
      },
      {
        n: 2, title: "底板 + 固定座（先别锁死）",
        desc: "4 个 SHF 固定座装上 8 mm 底板四角，螺丝只拧到一半。固定座中心到板边留 20 mm，保证横杆后面有出头。",
        check: "四个座子的内孔能顺畅套进立柱，不别劲。"
      },
      {
        n: 3, title: "立四根立柱，找垂直",
        desc: "把 4 根立柱插进固定座，底部顶丝先松着。用直角尺贴住立柱与底板，两个方向都要 90°。",
        check: "立柱垂直度偏差 ≤1 mm / 100 mm；从正面看四根立柱高度一致。"
      },
      {
        n: 4, title: "装第一层（离底板 " + firstL + " cm）",
        desc: "在每根立柱的 " + firstL + " cm 高度各套一个十字夹（开口朝向一致），穿入前后两根横杆，顶丝轻轻带上，先不要拧紧。",
        check: "横杆两端各出头约 10 mm，左右对称；夹子能用手推动但不会掉。"
      },
      {
        n: 5, title: "校方 —— 全流程最关键的一步",
        desc: "量两条对角线，理论值 " + diag + " mm；差 >2 mm 就轻轻敲立柱根部微调，再量一次。合上第一片层板，检查四周缝隙是否均匀。",
        check: "两对角线差 ≤2 mm，且层板放下去四个缺口都能同时落座。"
      },
      {
        n: 6, title: "逐层向上，每层都试板",
        desc: "以 " + pitchCm + " cm 为间隔重复步骤 4–5，共 " + L + " 层。每装完一层就放一片层板试，不要等全部装完再回头改。",
        check: "每层的十字夹高度误差 ≤1 mm（用一张 " + pitchCm + " cm 的木条/纸卡当高度尺最省事）。"
      },
      {
        n: 7, title: "封顶框，然后统一锁死",
        desc: "在 " + topCm + " cm 高度装最后一组横杆，形成闭合框架。然后从下往上、对角交替，把所有顶丝逐个拧紧。",
        check: "手推整体，晃动 <1 mm。扭力 2–3 N·m 即可，铝夹用死力会滑牙。"
      },
      {
        n: 8, title: "装灯（顶部留 " + (f.topGap / 10).toFixed(1) + " cm）",
        desc: "灯箱中心对中，VHB 胶贴在顶框下表面；电源线沿后侧立柱内侧走，扎带固定，开关放在侧面。",
        check: "每层都亮且无频闪（手机摄像头对着拍，画面不出现滚动横纹）。"
      },
      {
        n: 9, title: "装门与磁吸",
        desc: "合页先装顶框两颗，门挂上去后再定位磁吸；门自然下垂贴合后再拧死。",
        check: "开门 90° 不刮层板，关上门缝 2 mm 以内且左右一致。"
      },
      {
        n: 10, title: "加载 + 固化 + 防倾倒",
        desc: "每层先放 2–3 台，24 小时后看层板有没有下挠，再摆满；靠墙的两根立柱上部各装一个 L 角码固定。",
        check: "24 h 后层板中部下挠 <1 mm；用力推顶部不位移。"
      }
    ];

    var tools = ["内六角扳手 2.5 / 3 mm", "卷尺或钢直尺", "直角尺", "游标卡尺（可选）",
      "记号笔", "扎带", "薄手套（光轴有油）"];

    var pitfalls = [
      "别用电动螺丝刀锁铝夹：铝制夹块一滑牙就废，必须手拧。",
      "亚克力螺丝不要拧到底：加一片尼龙垫片，留一点弹性，不然应力裂。",
      "别在地毯/沙发上拼：底不平，校好的方一放下就歪。",
      "层板不要一次全放上去再锁：先装下层、锁紧、再上行，误差会被逐层放大。",
      "装完别马上搬到高处：光轴和亚克力都有应力释放期，放一晚再挪。"
    ];

    if (p.printPlan) {
      var pp = p.printPlan;
      steps[0].desc = "4 根立柱 φ10×" + f.uprightLen + " mm、" + (2 * f.nH) + " 根横杆 φ10×" + f.rodLen +
        " mm、" + (4 * f.nH) + " 个十字夹、4 个固定座、打印层板 " + pp.tilesTotal + " 片 + 挡边 " +
        pp.lipsTotal + " 条 + 加强片 " + pp.splicesTotal + " 片。打印件按编号分堆。";
      steps[0].check = "随机抽 2 片打印件量厚度（3.0 ±0.1 mm）；光轴放玻璃上滚，跳动 ≤0.2 mm。";
      steps[4].check = "两对角线差 ≤2 mm，且 6 片层板拼成的整片能平整落在两根横光轴上、拼缝不错位。";
      steps[9].desc += " 打印层板长期受力会蠕变，前两周每周看一次有没有下挠。";
    }

    return {
      intro: "按当前方案（" + L + " 层 × " + p.perLayer + " 台，层距 " + P + " mm）生成，约 2–3 小时。建议两人配合，一人扶一人锁。" +
        (p.printPlan ? "（层板为打印件，需先完成 " + Math.round(p.printPlan.hours) + " 小时的打印。）" : ""),
      steps: steps, tools: tools, pitfalls: pitfalls,
      keyNumbers: [
        { k: "首层高度", v: BASE + " mm" },
        { k: "层距", v: P + " mm" },
        { k: "顶框高度", v: topY + " mm" },
        { k: "立柱长度", v: f.uprightLen + " mm" },
        { k: "横杆长度", v: f.rodLen + " mm" },
        { k: "对角线（校方）", v: diag + " mm" }
      ]
    };
  }

  var api = { SCALES: SCALES, PRICE: PRICE, PRINT: PRINT, computePlan: computePlan, autoPitch: autoPitch,
    toText: toText, buildSteps: buildSteps, buildPrintPlan: buildPrintPlan, tileVolumeCm3: tileVolumeCm3 };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PlannerCore = api;
})(typeof window !== "undefined" ? window : globalThis);
