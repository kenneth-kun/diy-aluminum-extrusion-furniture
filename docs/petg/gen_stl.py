#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
光轴展示架 · 3D 打印层板生成器（透明 PETG）
------------------------------------------------------------------
输出可直接切片打印的二进制 STL。所有模型都由长方体组合而成，
按「大面朝下」摆放打印：贴床的那一面就是将来放车的顶面（最光滑、最透）。

用法：
    python3 gen_stl.py                     # 默认 256 热床，560×270 层板
    python3 gen_stl.py --bed 220           # 220×220 热床
    python3 gen_stl.py --mode frame        # 只打边框（配 1.5mm 透明片）
    python3 gen_stl.py --shelf 560x270 --th 3 --out ./stl
"""
import argparse
import math
import os
import struct

# ---------------- 参数（mm） ----------------
TH = 3.0          # 层板总厚
SKIN = 1.0        # 贴床面 / 顶面实心皮厚（决定透明度与刚度）
RIM_W = 2.0       # 四周立边宽
RIB_W = 1.2       # 筋宽
RIB_PITCH = 25.0  # 筋间距
FRAME_RIM = 8.0   # 边框方案的外框宽

DENSITY = 1.27    # PETG g/cm³
PRINT_G_PER_H = 11.0   # 透明慢速打印的经验出料速度（保守值）


# ---------------- 网格 ----------------
def box(x0, x1, y0, y1, z0, z1):
    """轴对齐长方体的 12 个三角面（外法线朝外）。"""
    v = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
    ]
    f = [(0, 3, 2), (0, 2, 1),      # bottom
         (7, 4, 5), (7, 5, 6),      # top
         (0, 1, 5), (0, 5, 4),      # front (-y)
         (1, 2, 6), (1, 6, 5),      # +x
         (2, 3, 7), (2, 7, 6),      # +y
         (3, 0, 4), (3, 4, 7)]      # -x
    tris = [(v[a], v[b], v[c]) for a, b, c in f]
    vol = (x1 - x0) * (y1 - y0) * (z1 - z0) / 1000.0  # cm³
    return tris, vol


def normal(t):
    (ax, ay, az), (bx, by, bz), (cx, cy, cz) = t
    ux, uy, uz = bx - ax, by - ay, bz - az
    vx, vy, vz = cx - ax, cy - ay, cz - az
    nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
    L = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    return nx / L, ny / L, nz / L


def write_stl(path, tris):
    with open(path, "wb") as f:
        f.write(b"\0" * 80)
        f.write(struct.pack("<I", len(tris)))
        for t in tris:
            n = normal(t)
            f.write(struct.pack("<3f", *n))
            for p in t:
                f.write(struct.pack("<3f", *p))
            f.write(struct.pack("<H", 0))


# ---------------- 零件 ----------------
def tile_full(W, D, th=TH, skin=SKIN):
    """整块层板瓦片：1mm 实心皮 + 2mm 筋（大面朝下打印）。"""
    boxes = [box(0, W, 0, D, 0, skin)]
    boxes += ribs(W, D, th)
    return merge(boxes)


def tile_frame(W, D, th=TH):
    """边框方案：外框 8mm + 筋，中间镂空，另配 1.5mm 透明片。"""
    boxes = []
    r = FRAME_RIM
    boxes.append(box(0, W, 0, r, 0, th))
    boxes.append(box(0, W, D - r, D, 0, th))
    boxes.append(box(0, r, r, D - r, 0, th))
    boxes.append(box(W - r, W, r, D - r, 0, th))
    # 内部筋（沿 Y）
    x = r + RIB_PITCH
    while x < W - r - 0.1:
        nx = min(x + RIB_W, W - r)
        boxes.append(box(x, nx, r, D - r, 0, th))
        x += RIB_PITCH
    return merge(boxes)


def ribs(W, D, th):
    boxes = []
    r = RIM_W
    boxes.append(box(0, W, 0, r, SKIN, th))
    boxes.append(box(0, W, D - r, D, SKIN, th))
    boxes.append(box(0, r, r, D - r, SKIN, th))
    boxes.append(box(W - r, W, r, D - r, SKIN, th))
    x = r
    while x < W - r - 0.1:
        nx = min(x + RIB_W, W - r)
        boxes.append(box(x, nx, r, D - r, SKIN, th))
        x += RIB_PITCH
    # 一道横筋，压住变形
    boxes.append(box(r, W - r, D / 2 - RIB_W / 2, D / 2 + RIB_W / 2, SKIN, th))
    return boxes


def lip(L, h=15.0, t=3.0):
    """前挡边条（侧躺打印，几乎不需要支撑）。"""
    return box(0, L, 0, t, 0, h)


def splice(L=60.0, w=18.0, t=1.8):
    """拼缝加强片，贴在层板底面（平躺打印）。"""
    return box(0, L, 0, w, 0, t)


def coupon(s=40.0):
    """透明度试片：跟层板同样的皮厚 + 一根筋。"""
    boxes = [box(0, s, 0, s, 0, SKIN), box(0, s, 0, RIM_W, SKIN, TH)]
    return merge(boxes)


def merge(boxes):
    tris, vol = [], 0.0
    for t, v in boxes:
        tris += t
        vol += v
    return tris, vol


# ---------------- 主流程 ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bed", type=float, default=245, help="可用打印幅面（mm），默认 245（256 热床）")
    ap.add_argument("--shelf", default="560x270", help="整块层板尺寸 WxD")
    ap.add_argument("--th", type=float, default=TH)
    ap.add_argument("--mode", default="both", choices=["full", "frame", "both"])
    ap.add_argument("--out", default="stl")
    args = ap.parse_args()

    W, D = [float(x) for x in args.shelf.lower().split("x")]
    cols = math.ceil(W / args.bed)
    rows = math.ceil(D / args.bed)
    tw, td = W / cols, D / rows

    os.makedirs(args.out, exist_ok=True)
    report = []

    def emit(name, tris, vol, qty_per_shelf):
        path = os.path.join(args.out, name + ".stl")
        write_stl(path, tris)
        g = vol * DENSITY
        report.append({
            "name": name, "size": f"{tw:.1f} × {td:.1f}" if "tile" in name else "-",
            "grams": g, "hours": g / PRINT_G_PER_H,
            "per_shelf": qty_per_shelf, "path": path,
        })
        print(f"  {name:18s} {len(tris):5d} 面  {g:6.1f} g  ≈{g / PRINT_G_PER_H:4.1f} h")

    print(f"层板 {W:g}×{D:g} → {cols} 列 × {rows} 行 = {cols * rows} 片/层")
    print(f"单片 {tw:.1f}×{td:.1f} mm，热床按 {args.bed:g} mm 计\n")

    if args.mode in ("full", "both"):
        t, v = tile_full(tw, td, args.th)
        emit("tile_full", t, v, cols * rows)
    if args.mode in ("frame", "both"):
        t, v = tile_frame(tw, td, args.th)
        emit("tile_frame", t, v, cols * rows)

    t, v = lip(tw)
    emit("lip", t, v, cols)

    t, v = splice()
    emit("splice", t, v, cols + rows - 1)

    t, v = coupon()
    emit("coupon", t, v, 1)

    # ---- 汇总（按 7 层） ----
    layers = 7
    def total_for(tile_name):
        g = h = 0.0
        for r in report:
            if r["name"] in ("tile_full", "tile_frame") and r["name"] != tile_name:
                continue
            g += r["grams"] * r["per_shelf"] * layers
            h += r["hours"] * r["per_shelf"] * layers
        return g, h

    print("\n—— 按 7 层汇总 ——")
    for name in (["tile_full", "tile_frame"] if args.mode == "both" else
                 (["tile_full"] if args.mode == "full" else ["tile_frame"])):
        g, h = total_for(name)
        tag = "全打印层板" if name == "tile_full" else "边框 + 1.5mm 透明片"
        print(f"  {tag:20s} {g / 1000:5.2f} kg，约 {h:5.0f} 小时（{g / 1000 * 65:.0f} 元料钱 @65 元/kg）")

    with open(os.path.join(args.out, "print_plan.md"), "w", encoding="utf-8") as f:
        f.write(f"# 3D 打印清单\n\n")
        f.write(f"层板 {W:g}×{D:g} mm，拆成 {cols}×{rows} = {cols * rows} 片，"
                f"每片 {tw:.1f}×{td:.1f} mm；按 7 层计算。\n\n")
        f.write("| 文件 | 尺寸 (mm) | 单件重量 | 单件耗时 | 每层 | 7 层 |\n|---|---|---|---|---|---|\n")
        for r in report:
            q7 = "1（试片）" if r["name"] == "coupon" else str(r["per_shelf"] * layers)
            f.write(f"| `{r['name']}.stl` | {r['size']} | {r['grams']:.1f} g | {r['hours']:.1f} h | "
                    f"{r['per_shelf']} | {q7} |\n")
        f.write("\n## 两种方案的总量\n\n")
        for name in (["tile_full", "tile_frame"] if args.mode == "both" else
                     (["tile_full"] if args.mode == "full" else ["tile_frame"])):
            g, h = total_for(name)
            tag = "全打印层板" if name == "tile_full" else "边框 + 1.5mm 透明片"
            f.write(f"- **{tag}**：{g:.0f} g（≈{g / 1000 * 65:.0f} 元料钱），约 {h:.0f} 小时\n")
        f.write("\n> 时间是按「透明慢速参数」（0.1 mm 层高、35 mm/s、100% 填充、风扇几乎关闭）估的；"
                "用 0.2 mm 层高可以快约 2/3，但会更雾。\n")
    print(f"\n清单已写入 {os.path.join(args.out, 'print_plan.md')}")


if __name__ == "__main__":
    main()
