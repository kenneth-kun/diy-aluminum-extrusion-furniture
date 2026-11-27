// montage.swift —— 把一目录的帧/图拼成 4 列网格，一次看 12 张
// 编译：swiftc -O -module-cache-path /tmp/swift-mc montage.swift -o /tmp/xhs-montage
// 用法：/tmp/xhs-montage <dir> <out.jpg> [cols] [cellW]
import Foundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("用法: montage <dir> <out.jpg> [cols=4] [cellW=420]")
    exit(1)
}
let dir = URL(fileURLWithPath: args[1])
let outPath = args[2]
let cols = args.count >= 4 ? Int(args[3]) ?? 4 : 4
let cellW = CGFloat(args.count >= 5 ? Int(args[4]) ?? 420 : 420)

let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil))?
    .filter { ["jpg", "jpeg", "png", "webp"].contains($0.pathExtension.lowercased()) }
    .sorted { $0.lastPathComponent < $1.lastPathComponent } ?? []
guard !files.isEmpty else { print("目录里没有图片"); exit(2) }

let images: [NSImage] = files.compactMap { NSImage(contentsOf: $0) }
let cellH = cellW * 1.35                            // 竖图为主，格子略高
let rows = Int(ceil(Double(images.count) / Double(cols)))
let gap: CGFloat = 12
let labelH: CGFloat = 18
let W = CGFloat(cols) * cellW + gap * CGFloat(cols + 1)
let H = CGFloat(rows) * (cellH + labelH + gap) + gap

let out = NSImage(size: NSSize(width: W, height: H))
out.lockFocus()
NSColor(calibratedWhite: 0.10, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: W, height: H).fill()

for (i, img) in images.enumerated() {
    let c = i % cols, r = i / cols
    let x = gap + CGFloat(c) * (cellW + gap)
    let y = H - gap - CGFloat(r + 1) * (cellH + labelH + gap) + labelH
    let box = NSRect(x: x, y: y, width: cellW, height: cellH)

    // cover 裁切：按比例缩放后居中裁剪
    let iw = img.size.width, ih = img.size.height
    let scale = max(cellW / iw, cellH / ih)
    let dw = iw * scale, dh = ih * scale
    let srcRect = NSRect(x: (dw - cellW) / 2 / scale, y: (dh - cellH) / 2 / scale,
                         width: cellW / scale, height: cellH / scale)
    NSGraphicsContext.current?.saveGraphicsState()
    NSBezierPath(rect: box).addClip()
    img.draw(in: box, from: srcRect, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.current?.restoreGraphicsState()

    // 文件名当标签
    let label = files[i].lastPathComponent as NSString
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular),
        .foregroundColor: NSColor(calibratedWhite: 0.75, alpha: 1)
    ]
    label.draw(at: NSPoint(x: x, y: y - labelH + 2), withAttributes: attrs)
}
out.unlockFocus()

guard let tiff = out.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
      let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) else {
    print("导出失败"); exit(3)
}
try data.write(to: URL(fileURLWithPath: outPath))
print("✓ \(outPath)  \(Int(W))×\(Int(H))，\(images.count) 张，\(cols) 列")