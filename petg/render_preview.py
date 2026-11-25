#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把打印件画成 2D 工程示意（比 3D 预览更清楚，也更好核对尺寸）。"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import matplotlib.font_manager as fm

for _f in ["/System/Library/Fonts/STHeiti Medium.ttc", "/System/Library/Fonts/STHeiti Light.ttc"]:
    try:
        fm.fontManager.addfont(_f)
    except Exception:
        pass
plt.rcParams["font.family"] = ["Heiti TC", "STHeiti", "sans-serif"]
plt.rcParams["axes.unicode_minus"] = False

W, D, TH, SKIN = 186.7, 135.0, 3.0, 1.0
RIM, RIB, PITCH = 2.0, 1.2, 25.0
LINE = "#2f3437"; FILL = "#d9eef6"; FILL2 = "#a9d8e8"; DIM = "#b03a2e"; LIP = "#f6d7b0"

base = os.path.dirname(os.path.abspath(__file__))


def ribs_x():
    xs, x = [], RIM
    while x < W - RIM - 0.1:
        xs.append(x)
        x += PITCH
    return xs


# ================= 图 1：单片 =================
fig = plt.figure(figsize=(12.4, 5.2), dpi=170)
fig.patch.set_facecolor("white")

# --- 俯视 ---
ax = fig.add_axes([0.04, 0.12, 0.44, 0.72])
ax.set_aspect("equal"); ax.axis("off")
ax.set_xlim(-8, W + 8); ax.set_ylim(-22, D + 26)
ax.add_patch(Rectangle((0, 0), W, D, fc=FILL, ec=LINE, lw=1.3))
ax.add_patch(Rectangle((0, 0), W, RIM, fc=FILL2, ec=LINE, lw=0.7))
ax.add_patch(Rectangle((0, D - RIM), W, RIM, fc=FILL2, ec=LINE, lw=0.7))
ax.add_patch(Rectangle((0, 0), RIM, D, fc=FILL2, ec=LINE, lw=0.7))
ax.add_patch(Rectangle((W - RIM, 0), RIM, D, fc=FILL2, ec=LINE, lw=0.7))
for x in ribs_x():
    ax.add_patch(Rectangle((x, RIM), RIB, D - 2 * RIM, fc=FILL2, ec=LINE, lw=0.6))
ax.add_patch(Rectangle((RIM, D / 2 - RIB / 2), W - 2 * RIM, RIB, fc=FILL2, ec=LINE, lw=0.6))
ax.annotate("", xy=(W, -9), xytext=(0, -9),
            arrowprops=dict(arrowstyle="<->", color=DIM, lw=1))
ax.text(W / 2, -18, "%.1f" % W, color=DIM, ha="center", fontsize=10, backgroundcolor="white")
ax.annotate("", xy=(W + 6, 0), xytext=(W + 6, D),
            arrowprops=dict(arrowstyle="<->", color=DIM, lw=1))
ax.text(W + 8, D / 2, "%.0f" % D, color=DIM, fontsize=10, va="center", backgroundcolor="white")
ax.text(W / 2, D + 12, "① 俯视：皮 1 mm + 筋 2 mm，筋距 %.0f mm" % PITCH,
        ha="center", fontsize=10.5, color="#23293a")

# --- 剖面（局部放大） ---
ax2 = fig.add_axes([0.55, 0.12, 0.42, 0.70])
ax2.set_aspect("auto"); ax2.axis("off")
ax2.set_xlim(-6, 62); ax2.set_ylim(-3.2, 10.5)
SW_ = 50.0
ax2.add_patch(Rectangle((0, 0), SW_, SKIN, fc=FILL, ec=LINE, lw=1.4))
for x in (0, 25, 50):
    ax2.add_patch(Rectangle((x, SKIN), RIM, TH - SKIN, fc=FILL2, ec=LINE, lw=1.0))
ax2.annotate("", xy=(0, SKIN), xytext=(0, TH), arrowprops=dict(arrowstyle="<->", color=DIM, lw=1.2))
ax2.text(1.5, 2.0, "筋 2", color=DIM, fontsize=10, va="center")
ax2.annotate("", xy=(56, 0), xytext=(56, TH), arrowprops=dict(arrowstyle="<->", color=DIM, lw=1.2))
ax2.text(57, 1.5, "总厚 3", color=DIM, fontsize=10, va="center")
ax2.annotate("", xy=(52.5, 0), xytext=(52.5, SKIN), arrowprops=dict(arrowstyle="<->", color=DIM, lw=1.2))
ax2.text(51.5, -1.2, "皮 1", color=DIM, fontsize=9.5, ha="right")
ax2.annotate("", xy=(0, 4.6), xytext=(25, 4.6), arrowprops=dict(arrowstyle="<->", color=DIM, lw=1))
ax2.text(12.5, 5.3, "筋距 25", color=DIM, fontsize=9.5, ha="center")
ax2.text(25, 8.4, "② 剖面（纵向放大）：光滑面贴床，筋朝上",
         ha="center", fontsize=10.5, color="#23293a")
ax2.text(25, -2.6, "翻过来，贴床那一面就是放车面", ha="center", fontsize=8.6, color="#6b7280")
plt.savefig(os.path.join(base, "preview_tile.png"), facecolor="white")
print("saved preview_tile.png")

# ================= 图 2：一层拼装 =================
fig2 = plt.figure(figsize=(12.0, 6.4), dpi=170)
fig2.patch.set_facecolor("white")
ax3 = fig2.add_axes([0.03, 0.05, 0.86, 0.82])
ax3.set_aspect("equal"); ax3.axis("off")
gap = 3.0
SW, SD = 3 * W + 2 * gap, 2 * D + gap
ax3.set_xlim(-25, SW + 95); ax3.set_ylim(-60, SD + 45)
for r in range(2):
    for c in range(3):
        x, y = c * (W + gap), r * (D + gap)
        tint = "#eaf6fa" if (r + c) % 2 == 0 else "#dff1f7"
        ax3.add_patch(Rectangle((x, y), W, D, fc=tint, ec=LINE, lw=1.0, zorder=1))
        for xx in ribs_x():
            ax3.add_patch(Rectangle((x + xx, y + RIM), RIB, D - 2 * RIM, fc=FILL2, ec="none", zorder=2))
        ax3.text(x + W - 12, y + D - 12, str(r * 3 + c + 1), fontsize=11, color="#2c7a8c",
                 ha="right", va="top", zorder=5, fontweight="bold")
# 拼缝
for c in (1, 2):
    x = c * (W + gap) - gap / 2
    ax3.plot([x, x], [0, 2 * D + gap], color=DIM, lw=1.6, ls=(0, (6, 4)))
ax3.plot([0, SW], [D + gap / 2, D + gap / 2], color=DIM, lw=1.6, ls=(0, (6, 4)))
# 前挡边
for c in range(3):
    x = c * (W + gap)
    ax3.add_patch(Rectangle((x, -13), W, 13, fc=LIP, ec="#b5762f", lw=1))
ax3.text(SW / 2, -28, "前挡边 3 条：186.7 × 3 × 15（可省，有门就不用）",
         ha="center", fontsize=9.5, color="#8a5a12")
# 加强片
for c in (1, 2):
    for r in range(2):
        x = c * (W + gap) - 30
        y = r * (D + gap) + D / 2 - 9
        ax3.add_patch(Rectangle((x, y), 60, 18, fc="none", ec="#15803d", lw=1.3, ls=(0, (3, 2))))
ax3.text(SW + 10, SD / 2 + 40,
         "红虚线 = 拼缝\n绿框 = 60×18 加强片\n（粘在底面，跨缝）",
         fontsize=9, color="#15803d", va="center", linespacing=1.9)
ax3.text(SW / 2, SD + 26, "一层 = 6 片（3 × 2），拼成 560 × 270",
         ha="center", fontsize=11.5, color="#23293a")
plt.savefig(os.path.join(base, "preview_assembly.png"), facecolor="white")
print("saved preview_assembly.png")

# ================= 图 3：边框方案 =================
fig3 = plt.figure(figsize=(10.6, 4.6), dpi=170)
fig3.patch.set_facecolor("white")
ax4 = fig3.add_axes([0.05, 0.14, 0.9, 0.68])
ax4.set_aspect("equal"); ax4.axis("off")
ax4.set_xlim(-8, W + 8); ax4.set_ylim(-28, D + 28)
ax4.add_patch(Rectangle((0, 0), W, D, fc="white", ec=LINE, lw=1.2))
FR = 8.0
ax4.add_patch(Rectangle((0, 0), W, FR, fc=FILL2, ec=LINE, lw=0.8))
ax4.add_patch(Rectangle((0, D - FR), W, FR, fc=FILL2, ec=LINE, lw=0.8))
ax4.add_patch(Rectangle((0, 0), FR, D, fc=FILL2, ec=LINE, lw=0.8))
ax4.add_patch(Rectangle((W - FR, 0), FR, D, fc=FILL2, ec=LINE, lw=0.8))
for x in ribs_x()[1:]:
    ax4.add_patch(Rectangle((x, FR), RIB, D - 2 * FR, fc=FILL2, ec=LINE, lw=0.6))
ax4.text(W / 2, D - 26, "上面粘 1.5 mm 透明 PET 片", ha="center", va="center",
         fontsize=11, color="#2c7a8c")
ax4.annotate("", xy=(W, -11), xytext=(0, -11), arrowprops=dict(arrowstyle="<->", color=DIM, lw=1))
ax4.text(W / 2, -20, "%.1f" % W, color=DIM, ha="center", fontsize=9.5, backgroundcolor="white")
ax4.text(W / 2, D + 18, "边框方案：22 g/片，打印量只有整片方案的 57%",
         ha="center", fontsize=10.5, color="#23293a")
plt.savefig(os.path.join(base, "preview_frame.png"), facecolor="white")
print("saved preview_frame.png")
