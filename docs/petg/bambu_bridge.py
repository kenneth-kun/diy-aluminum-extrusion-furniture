#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bambu_bridge.py —— 拓竹（Bambu Lab）局域网直连的试验脚本
================================================================
状态：**未在真机验证**。只在你明确同意、并且打印机开了「仅局域网模式(LAN Only)」
      的情况下使用。默认只做只读操作（发现/查状态），上传和开打需要额外加 --yes。

依赖：paho-mqtt（本机已装到 /tmp/pylibs，可 PYTHONPATH 指定）

用法：
    python3 bambu_bridge.py discover
    python3 bambu_bridge.py status  --ip 192.168.0.50 --serial 01S00A123456789 --code 12345678
    python3 bambu_bridge.py upload  --ip ... --code ... --file stl/tile_full.stl.gcode.3mf --yes
    python3 bambu_bridge.py print   --ip ... --serial ... --code ... --file xxx.gcode.3mf --yes

协议要点（拓竹官方未公开，以下是社区逆向结果）：
  · 发现：UDP 1990 广播 "M99999"
  · 控制：MQTT over TLS tcp/8883，用户名 bblp，密码 = 打印机访问码
          topic: device/{serial}/report （订阅） / device/{serial}/request （发布）
  · 文件：FTPS（隐式 TLS）tcp/990，同样用 bblp + 访问码，传到 /cache/ 或 /sdcard/
"""
import argparse
import json
import os
import socket
import ssl
import sys
import time


def discover(timeout=3.0):
    """UDP 1990 广播找打印机，返回 [{ip, serial, model, name}]"""
    msg = b"M99999\x00" + b"\x00" * 3
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.settimeout(timeout)
    found = []
    try:
        s.sendto(msg, ("255.255.255.255", 1990))
    except OSError as e:
        print("广播发送失败（可能被系统/沙箱拦了）:", e)
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            data, addr = s.recvfrom(4096)
        except socket.timeout:
            break
        try:
            info = json.loads(data.decode("utf-8", "ignore").strip("\x00"))
        except Exception:
            continue
        found.append({
            "ip": addr[0],
            "serial": info.get("sn", info.get("serial", "?")),
            "model": info.get("machine_type", info.get("model", "?")),
            "name": info.get("name", ""),
        })
    s.close()
    return found


def serial_from_cert(ip):
    """打印机证书的 CN 就是序列号，握手一次就能拿到（不需要访问码）"""
    import re
    import subprocess
    try:
        out = subprocess.run(
            ["bash", "-c",
             "echo | openssl s_client -connect %s:8883 -servername %s 2>/dev/null "
             "| openssl x509 -noout -subject 2>/dev/null" % (ip, ip)],
            capture_output=True, text=True, timeout=15).stdout
        m = re.search(r"CN\s*=\s*([0-9A-Za-z]+)", out)
        return m.group(1) if m else None
    except Exception:
        return None


def _mqtt(ip, serial, code, timeout=8):
    from paho.mqtt import client as mqtt
    ctx = ssl._create_unverified_context()      # 打印机是自签证书
    c = mqtt.Client(client_id="dsh-bridge", clean_session=True)
    c.username_pw_set("bblp", code)
    c.tls_set_context(ctx)
    c.tls_insecure_set(True)
    c.connect(ip, 8883, keepalive=30)
    return c


def status(ip, serial, code):
    """订阅 report 主题 5 秒，打印状态 / 温度 / 耗材 / 报错"""
    msgs = []
    c = _mqtt(ip, serial, code)

    def on_connect(cl, ud, flags, rc):
        print("认证:", "OK" if rc == 0 else "失败 rc=%s" % rc)
        if rc == 0:
            cl.subscribe("device/%s/report" % serial)

    def on_message(cl, ud, m):
        msgs.append(m.payload.decode("utf-8", "ignore"))

    c.on_connect = on_connect
    c.on_message = on_message
    c.loop_start()
    c.publish("device/%s/request" % serial,
              json.dumps({"pushing": {"sequence_id": "1", "command": "pushall"}}))
    time.sleep(4)
    c.loop_stop()
    c.disconnect()

    if not msgs:
        print("没收到任何上报 —— 检查访问码 / LAN Only / IP")
        return False

    data = {}
    for raw in msgs:
        try:
            data.update(json.loads(raw))
        except Exception:
            pass
    p = data.get("print", {})
    if not p:
        return False

    state = {"IDLE": "空闲", "FINISH": "已打完", "PREPARE": "准备中",
             "RUNNING": "打印中", "PAUSE": "已暂停", "FAILED": "失败"}.get(p.get("gcode_state"), p.get("gcode_state"))
    print("  状态        %s%s" % (state,
          "  %s%% 剩 %s 分钟" % (p.get("mc_percent"), p.get("mc_remaining_time"))
          if p.get("gcode_state") == "RUNNING" else ""))
    print("  上一次任务  %s（%s/%s 层）" % (p.get("subtask_name", "-"),
          p.get("layer_num", "-"), p.get("total_layer_num", "-")))
    print("  温度        喷头 %s°C / 热床 %s°C" % (p.get("nozzle_temper"), p.get("bed_temper")))
    print("  报错        %s" % ("无" if not p.get("print_error") and not p.get("hms") else
          "print_error=%s hms=%s" % (p.get("print_error"), p.get("hms"))))
    print("  WiFi        %s" % p.get("wifi_signal", "-"))

    slots = []
    for unit in ((p.get("ams") or {}).get("ams") or []):
        for t in (unit.get("tray") or []):
            if t.get("tray_type"):
                slots.append("%s:%s" % (t.get("id"), t.get("tray_type")))
    vt = p.get("vt_tray") or {}
    if vt.get("tray_type"):
        slots.append("外挂:%s" % vt.get("tray_type"))
    print("  耗材        %s" % (" / ".join(slots) if slots else "未读到"))
    return True


def upload(ip, code, path):
    """隐式 FTPS（990）上传到 /cache —— 拓竹用的是 implicit TLS，不是 21 端口的 AUTH TLS"""
    from ftplib import FTP_TLS
    ctx = ssl._create_unverified_context()
    raw = socket.create_connection((ip, 990), timeout=20)
    sock = ctx.wrap_socket(raw, server_hostname=ip)
    ftps = FTP_TLS(context=ctx)
    ftps.host, ftps.port = ip, 990
    ftps.sock = sock
    ftps.file = sock.makefile("r", encoding="utf-8")
    ftps.af = sock.family
    ftps.welcome = ftps.getresp()
    ftps.login("bblp", code)
    ftps.prot_p()
    ftps.cwd("/cache")
    with open(path, "rb") as f:
        ftps.storbinary("STOR " + os.path.basename(path), f)
    names = ftps.nlst()
    ftps.quit()
    print("已上传:", os.path.basename(path), "| /cache 现有", len(names), "项")


def simple_cmd(ip, serial, code, command):
    """暂停 / 继续 / 停止"""
    c = _mqtt(ip, serial, code)
    c.loop_start()
    c.publish("device/%s/request" % serial,
              json.dumps({"print": {"sequence_id": "7", "command": command}}))
    time.sleep(1.5)
    c.loop_stop(); c.disconnect()
    print("已发送:", command)


def watch(ip, serial, code, interval=10, count=30):
    """轮询状态，打印变化（用来盯首层）"""
    last = None
    for i in range(count):
        data = _snapshot(ip, serial, code)
        if data is None:
            print("[%02d] 读取失败" % i)
        else:
            p = data
            cur = (p.get("gcode_state"), p.get("mc_percent"), p.get("layer_num"))
            line = "[%02d] %s %s%% 层 %s/%s 喷头 %s°C 热床 %s°C %s" % (
                i, p.get("gcode_state"), p.get("mc_percent"), p.get("layer_num"),
                p.get("total_layer_num"), p.get("nozzle_temper"), p.get("bed_temper"),
                p.get("subtask_name") or "")
            print(line + ("  ← 变化" if cur != last else ""), flush=True)
            last = cur
            if p.get("print_error") or p.get("hms"):
                print("   ⚠ 报错:", p.get("print_error"), p.get("hms"))
        time.sleep(interval)
    return True


def _snapshot(ip, serial, code):
    """取一次状态快照"""
    msgs = []
    try:
        c = _mqtt(ip, serial, code)
    except Exception:
        return None
    c.on_connect = lambda cl, u, f, rc: cl.subscribe("device/%s/report" % serial)
    c.on_message = lambda cl, u, m: msgs.append(m.payload.decode("utf-8", "ignore"))
    c.loop_start()
    c.publish("device/%s/request" % serial,
              json.dumps({"pushing": {"sequence_id": "9", "command": "pushall"}}))
    time.sleep(1.5)
    c.loop_stop(); c.disconnect()
    data = {}
    for raw in msgs:
        try:
            data.update(json.loads(raw).get("print", {}))
        except Exception:
            pass
    return data or None


def start_print(ip, serial, code, filename):
    """发打印指令（会真的开打，谨慎）"""
    c = _mqtt(ip, serial, code)
    c.loop_start()
    payload = {
        "print": {
            "sequence_id": "2",
            "command": "project_file",
            "param": "Metadata/plate_1.gcode",
            "url": "ftp://bblp:%s@%s/cache/%s" % (code, ip, filename),
            "subtask_name": os.path.splitext(os.path.basename(filename))[0],
            "use_ams": False,
            "timelapse": False,
            "bed_type": "textured_plate",
            "bed_levelling": True,
            "flow_cali": False,
            "vibration_cali": False,
        }
    }
    c.publish("device/%s/request" % serial, json.dumps(payload))
    time.sleep(2)
    c.loop_stop()
    c.disconnect()
    print("已发送开打指令（是否真的开始，要看打印机屏幕/状态）")


def main():
    ap = argparse.ArgumentParser(description="拓竹局域网直连（试验）")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("discover", help="局域网发现打印机")

    for name in ("status", "print", "upload", "watch", "pause", "resume", "stop"):
        p = sub.add_parser(name)
        p.add_argument("--ip", required=True)
        p.add_argument("--code", required=True, help="打印机访问码（屏幕-设置-网络 里看）")
        if name == "watch":
            p.add_argument("--serial", help="不填就从打印机证书里自动读")
            p.add_argument("--interval", type=int, default=10)
            p.add_argument("--count", type=int, default=30, help="最多看几次")
        elif name != "upload":
            p.add_argument("--serial", help="不填就从打印机证书里自动读")
        else:
            p.add_argument("--file", required=True)
        if name == "print":
            p.add_argument("--file", required=True)
            p.add_argument("--yes", action="store_true", help="确认真的开始打印")
        if name == "upload":
            p.add_argument("--yes", action="store_true")

    a = ap.parse_args()

    if a.cmd == "discover":
        found = discover()
        if not found:
            print("没发现打印机。可能原因：打印机没开机 / 没开 LAN Only / 不在同一网段 / 广播被拦。")
        for f in found:
            print(json.dumps(f, ensure_ascii=False))
        return 0 if found else 1

    if a.cmd in ("status", "print", "watch") and not a.serial:
        a.serial = serial_from_cert(a.ip)
        print("从证书读到序列号:", a.serial)

    if a.cmd in ("pause", "resume", "stop"):
        if not a.serial:
            a.serial = serial_from_cert(a.ip)
            print("序列号:", a.serial)
        simple_cmd(a.ip, a.serial, a.code, a.cmd)
        return 0

    if a.cmd == "watch":
        if not a.serial:
            print("拿不到序列号，请手动加 --serial")
            return 1
        return 0 if watch(a.ip, a.serial, a.code, a.interval, a.count) else 1

    if a.cmd == "status":
        if not a.serial:
            print("拿不到序列号，请手动加 --serial")
            return 1
        return 0 if status(a.ip, a.serial, a.code) else 1

    if a.cmd == "upload":
        if not a.yes:
            print("加 --yes 才会真的上传。")
            return 2
        upload(a.ip, a.code, a.file)
        return 0

    if a.cmd == "print":
        if not a.serial:
            print("拿不到序列号，请手动加 --serial")
            return 1
        if not a.yes:
            print("加 --yes 才会真的开打。")
            return 2
        start_print(a.ip, a.serial, a.code, a.file)
        return 0


if __name__ == "__main__":
    sys.exit(main())
