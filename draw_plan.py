# -*- coding: utf-8 -*-
"""生成光轴多层展示架三视图尺寸图（单位 mm），单坐标系手工排布，保证版面稳定。"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle
import matplotlib.font_manager as fm

for p in ["/System/Library/Fonts/STHeiti Medium.ttc",
          "/System/Library/Fonts/STHeiti Light.ttc"]:
    try:
        fm.fontManager.addfont(p)
    except Exception:
        pass
plt.rcParams["font.family"] = ["Heiti TC", "STHeiti", "sans-serif"]
plt.rcParams["axes.unicode_minus"] = False

W, D, H = 600, 300, 500
SHELF_Y = [40, 100, 160, 220, 280, 340, 400]
TOP_Y = 460
ROD, OVER, SHELF_T = 10, 10, 5

LINE = "#2f3437"
GLASS = "#e3f2f8"
GLASS_E = "#5a8ea0"
DIM = "#b03a2e"
METAL = "#c9ced3"
LIGHT = "#fdf3d0"

fig = plt.figure(figsize=(13.0, 13.0), dpi=150)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 1500); ax.set_ylim(0, 1500)
ax.set_aspect("equal"); ax.axis("off")


def dim(x1, y1, x2, y2, text, dx=0, dy=0, rot=0, fs=11):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="<->", color=DIM, lw=1.0,
                                shrinkA=0, shrinkB=0))
    ax.text((x1 + x2) / 2 + dx, (y1 + y2) / 2 + dy, text, color=DIM,
            fontsize=fs, ha="center", va="center", rotation=rot,
            backgroundcolor="white", zorder=20)


def frame(ox, oy, w, is_side=False):
    """画框架（正视图/侧视图共用）。ox,oy 为左下角原点。"""
    for x in (ox, ox + w):
        ax.add_patch(Rectangle((x - ROD / 2, oy - 8), ROD, H + 8,
                               fc="#eceff1", ec=LINE, lw=1.0, zorder=3))
        ax.add_patch(Rectangle((x - 9, oy - 15), 18, 7, fc=METAL, ec=LINE, lw=0.7, zorder=4))
    for y in SHELF_Y:
        ax.add_patch(Rectangle((ox - OVER, oy + y - ROD / 2), w + 2 * OVER, ROD,
                               fc="#f4f5f6", ec=LINE, lw=0.9, zorder=5))
        ax.add_patch(Rectangle((ox + 8, oy + y + ROD / 2), w - 16, SHELF_T,
                               fc=GLASS, ec=GLASS_E, lw=0.7, zorder=6))
        if not is_side:
            ax.add_patch(Rectangle((ox + 8, oy + y + ROD / 2 + SHELF_T), w - 16, 15,
                                   fc=GLASS, ec=GLASS_E, lw=0.7, zorder=6))
    ax.add_patch(Rectangle((ox - OVER, oy + TOP_Y - ROD / 2), w + 2 * OVER, ROD,
                           fc="#f4f5f6", ec=LINE, lw=0.9, zorder=5))
    ax.add_patch(Rectangle((ox + 25, oy + TOP_Y + 4), w - 50, 30,
                           fc=LIGHT, ec="#c9a227", lw=1.0, zorder=6))
    for x in (ox, ox + w):
        for y in SHELF_Y + [TOP_Y]:
            ax.add_patch(Rectangle((x - 11, oy + y - 11), 22, 22,
                                   fc=METAL, ec=LINE, lw=0.5, zorder=7))


# ================= 正视图 =================
FX, FY = 110, 830
frame(FX, FY, W)
ax.text(FX + W / 2, FY + H + 95, "① 正视图", ha="center", fontsize=15)
dim(FX, FY + H + 34, FX + W, FY + H + 34, "600")
dim(FX - 40, FY, FX - 40, FY + H, "500", rot=90)
dim(FX + W + 40, FY + SHELF_Y[0], FX + W + 40, FY + SHELF_Y[1], "60", rot=90, fs=10)
ax.text(FX + W + 72, FY + 71, "层距 60", fontsize=10.5, color=DIM, va="center", ha="left")
ax.text(FX + W / 2, FY + 275, "7 层 × 10 位", ha="center", fontsize=13, color="#3a5a66")
ax.text(FX + W / 2, FY - 45, "前门 3mm 亚克力 600×470（上翻）", ha="center", fontsize=11, color="#4a6572")

# ================= 侧视图 =================
SX, SY = 900, 830
frame(SX, SY, D, is_side=True)
ax.text(SX + D / 2, SY + H + 95, "② 侧视图", ha="center", fontsize=15)
dim(SX, SY + H + 34, SX + D, SY + H + 34, "300")
dim(SX - 40, SY, SX - 40, SY + H, "500", rot=90)
ax.text(SX + D / 2, SY - 45, "深 300，容 1:64 全车长", ha="center", fontsize=11, color="#4a6572")

# ================= 俯视图 =================
TX, TY = 110, 240
ax.add_patch(Rectangle((TX, TY), W, D, fc="#fcfcfc", ec=LINE, lw=1.0))
for y in (TY, TY + D):
    ax.add_patch(Rectangle((TX - OVER, y - ROD / 2), W + 2 * OVER, ROD,
                           fc="#eceff1", ec=LINE, lw=0.9, zorder=3))
for x in (TX, TX + W):
    for y in (TY, TY + D):
        ax.add_patch(Circle((x, y), 11, fc=METAL, ec=LINE, lw=0.6, zorder=4))
ax.add_patch(Rectangle((TX + 8, TY + 8), W - 16, D - 16,
                       fc=GLASS, ec=GLASS_E, lw=0.7, ls=(0, (4, 3)), zorder=2))
ax.text(TX + W / 2, TY + D / 2 + 30, "10 台 / 层，节距 58", ha="center", fontsize=11, color="#3a5a66")
ax.annotate("", xy=(TX + W / 2 + 110, TY + D / 2 - 50), xytext=(TX + W / 2 - 30, TY + D / 2 - 50),
            arrowprops=dict(arrowstyle="-|>", color="#e67e22", lw=1.6))
ax.text(TX + W / 2 + 40, TY + D / 2 - 72, "车头朝外", ha="center", fontsize=10.5, color="#e67e22")
dim(TX, TY - 40, TX + W, TY - 40, "600")
dim(TX + W + 40, TY, TX + W + 40, TY + D, "300", rot=90)
ax.text(TX + W / 2, TY - 105, "③ 俯视图", ha="center", fontsize=15)

# ================= 说明区 =================
notes = [
    ("整体外廓", "600 × 300 × 500 mm   7 层 × 10 位 ≈ 70 台"),
    ("立柱", "φ10 光轴 × 500 mm × 4"),
    ("横杆", "φ10 光轴 × 620 mm × 16（每层前后各 1 + 顶框 2）"),
    ("十字夹", "φ10 铝合金十字夹 × 32"),
    ("层板", "5mm 透明亚克力 600 × 300 × 7（四角 35 缺口 + 15 前挡）"),
    ("层距", "60 mm（净空约 55，1:64 车高 25–30 余量足）"),
]
y0 = 560
ax.text(900, y0 + 80, "尺寸速查", fontsize=14, color="#2f3437")
for i, (k, v) in enumerate(notes):
    yy = y0 - i * 62
    ax.text(900, yy, k, fontsize=11, color=DIM, va="top")
    ax.text(1000, yy, v, fontsize=11, color="#2f3437", va="top")
ax.text(900, y0 - 6 * 60 - 20,
        "换算：光轴长度 = 外廓 + 2 × 10（两端出头）\n"
        "      层板 = 外廓尺寸，四角开 35 × 35 缺口\n"
        "      改尺：层距 ≥ 55，立杆高 = 层数 × 层距 + 40",
        fontsize=10.5, color="#6b6b6b", va="top", linespacing=1.8)

out = "/Users/lilikun/Documents/deepseek-harness/default-workspace/光轴置物架/尺寸图.png"
fig.savefig(out, facecolor="white")
print("saved", out)
