#!/usr/bin/env bash
# grab.sh —— 把一条帖子（小红书图文/视频，或任意带 og:image 的网页）抓到本地
# 用法：bash grab.sh "<URL>" /tmp/post-<id>
# 产出：meta.txt（标题/正文/图片数）、img/*.jpg 或 v.mp4、frames/（视频抽帧）
set -uo pipefail

URL="${1:-}"; OUT="${2:-/tmp/post}"
[ -z "$URL" ] && { echo "用法: bash grab.sh <URL> <输出目录>"; exit 1; }
mkdir -p "$OUT/img" "$OUT/frames"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

# ---------- 0. 逃生口：直接喂一个"另存下来"的 HTML（登录墙 / xsec_token 过期时用） ----------
case "$URL" in
  /*|file://*)
    cp "${URL#file://}" "$OUT/page.html" 2>/dev/null || { echo "读不到 $URL"; exit 1; }
    echo "→ 解析本地 HTML：${URL#file://}"
    NOTE_ID=""; TOKEN="" ;;
  *)
    # ---------- 1. 小红书：把 /explore/<id> 换成 /discovery/item/<id>，并保留 xsec_token ----------
    NOTE_ID="$(printf '%s' "$URL" | sed -n 's#.*/\(explore\|discovery/item\)/\([0-9a-zA-Z]*\).*#\2#p')"
    TOKEN="$(printf '%s' "$URL" | sed -n 's#.*xsec_token=\([^&]*\).*#\1#p')"
    if [ -n "$NOTE_ID" ] && [ -n "$TOKEN" ]; then
      FETCH_URL="https://www.xiaohongshu.com/discovery/item/${NOTE_ID}?xsec_token=${TOKEN}&xsec_source=pc_collect"
    else
      FETCH_URL="$URL"
    fi

    echo "→ 抓取 $FETCH_URL"
    curl -sS -L -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" "$FETCH_URL" -o "$OUT/page.html"
    SIZE=$(wc -c < "$OUT/page.html" | tr -d ' ')
    echo "  页面 $SIZE 字节"
    if [ "$SIZE" -lt 20000 ] && [ -n "$NOTE_ID" ]; then
      echo "  页面过小，回退到原始 URL"
      curl -sS -L -A "$UA" "$URL" -o "$OUT/page.html"
    fi
    ;;
esac

# ---------- 2. 抽取标题 / 正文 / 图片 URL / 视频 URL ----------
python3 - "$OUT" <<'PY'
import json, os, re, sys, html
out = sys.argv[1]
s = open(os.path.join(out, "page.html"), encoding="utf-8", errors="replace").read()

def first(*pats):
    for p in pats:
        m = re.search(p, s)
        if m:
            v = html.unescape(m.group(1))
            if v.strip():
                return v.strip()
    return ""

title = first(r'<meta property="og:title" content="([^"]*)"', r'"title":"([^"]{2,80})"', r"<title>([^<]*)</title>")
desc  = first(r'<meta property="og:description" content="([^"]*)"', r'"desc":"((?:[^"\\]|\\.){10,})"')
desc  = desc.encode().decode("unicode_escape", "ignore") if "\\u" in desc else desc

# 图片：全页扫 sns-webpic（imageList 那段 JSON 常被截断，不要只解析它）
imgs = re.findall(r'//sns-webpic[^"\s\\]*', s)
imgs = [("https:" + u) for u in imgs if "!" in u]
imgs = list(dict.fromkeys(imgs))
# 兜底：普通站点用 og:image
if not imgs:
    imgs = list(dict.fromkeys(re.findall(r'<meta property="og:image" content="([^"]+)"', s)))

vids = list(dict.fromkeys(re.findall(r'https?://[^"\s\\]+\.mp4[^"\s\\]*', s)))
kind = "video" if ('"type":"video"' in s or vids) else "image"

# 登录墙 / 过期签名：拿到的只是"想了解些什么？"这类空壳页
shell = ("想了解些什么" in title) or (not imgs and not vids and "sns-webpic" not in s and '"noteId"' not in s)

open(os.path.join(out, "img_urls.txt"), "w").write("\n".join(imgs))
open(os.path.join(out, "vid_urls.txt"), "w").write("\n".join(vids))
open(os.path.join(out, "meta.txt"), "w").write(
    f"type: {kind}\ntitle: {title}\ndesc: {desc}\nimages: {len(imgs)}\nvideos: {len(vids)}\nshell: {shell}\n")
print(f"  标题：{title}")
print(f"  正文：{desc[:120]}{'…' if len(desc) > 120 else ''}")
print(f"  类型：{kind}｜图片 {len(imgs)} 张｜视频 {len(vids)} 个")
if shell:
    print("  ! 这不是笔记正文（被拦或 xsec_token 已过期）", file=sys.stderr)
    print("    处理：浏览器打开帖子 → 右键『存储为…』(网页,仅 HTML) → bash grab.sh /path/to/保存的.html <输出目录>",
          file=sys.stderr)
    sys.exit(9)
PY
GRAB_RC=$?
if [ "$GRAB_RC" != "0" ]; then
  echo "抓取失败（rc=$GRAB_RC）：见上面提示。图片/正文需要人工再给一次。"
  exit "$GRAB_RC"
fi

# ---------- 3. 下载图（最多 9 张） ----------
i=0
while read -r u; do
  [ -z "$u" ] && continue
  i=$((i+1)); [ "$i" -gt 9 ] && break
  curl -sS -A "$UA" "$u" -o "$OUT/img/p$i.jpg" && echo "  ✓ img/p$i.jpg $(wc -c < "$OUT/img/p$i.jpg" | tr -d ' ') 字节"
done < "$OUT/img_urls.txt"

# ---------- 4. 视频：下载 + 抽帧 ----------
VURL="$(head -1 "$OUT/vid_urls.txt" 2>/dev/null || true)"
if [ -n "$VURL" ]; then
  echo "→ 下载视频"
  curl -sS -A "$UA" -e "https://www.xiaohongshu.com/" "$VURL" -o "$OUT/v.mp4"
  if [ -s "$OUT/v.mp4" ]; then
    # 没有 ffmpeg 也能抽帧：Swift + AVFoundation
    SWIFT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if command -v swiftc >/dev/null 2>&1; then
      swiftc -O -module-cache-path /tmp/swift-mc "$SWIFT_DIR/frames.swift" -o /tmp/xhs-frames 2>/dev/null &&
      /tmp/xhs-frames "$OUT/v.mp4" "$OUT/frames" 12 && echo "  ✓ 抽帧 $(ls "$OUT/frames" | wc -l | tr -d ' ') 张"
    else
      echo "  ! 没有 swiftc，跳过抽帧（截图看封面也可以）"
    fi
  else
    echo "  ! 视频下载失败（sign 过期就重新打开帖子拿新链接）"
  fi
fi

echo "完成：$OUT"
ls -1 "$OUT" | head