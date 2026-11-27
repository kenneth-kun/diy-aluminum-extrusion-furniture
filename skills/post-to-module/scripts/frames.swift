// frames.swift —— 从视频里等间隔抽帧（macOS AVFoundation，不需要 ffmpeg）
// 编译：swiftc -O -module-cache-path /tmp/swift-mc frames.swift -o /tmp/xhs-frames
// 用法：/tmp/xhs-frames <video> <outdir> [count]
import Foundation
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("用法: frames <video> <outdir> [count]")
    exit(1)
}
let url = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let count = args.count >= 4 ? Int(args[3]) ?? 12 : 12

try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: url)
let seconds = CMTimeGetSeconds(asset.duration)
guard seconds.isFinite, seconds > 0 else {
    print("读不到时长：\(url.path)")
    exit(2)
}

let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true          // 竖屏视频不要转成横的
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 1280, height: 1280)

print(String(format: "视频 %.1f 秒，抽 %d 帧", seconds, count))
for i in 0..<count {
    // 掐头去尾各 4%，避开片头片尾
    let t = seconds * (0.04 + 0.92 * Double(i) / Double(max(count - 1, 1)))
    let time = CMTime(seconds: t, preferredTimescale: 600)
    do {
        let cg = try gen.copyCGImage(at: time, actualTime: nil)
        let rep = NSBitmapImageRep(cgImage: cg)
        guard let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.9]) else { continue }
        let name = String(format: "f%02d_%05.1fs.jpg", i + 1, t)
        try data.write(to: outDir.appendingPathComponent(name))
        print("  ✓ \(name) \(cg.width)×\(cg.height)")
    } catch {
        print("  ! \(String(format: "%.1f", t))s 抽帧失败：\(error.localizedDescription)")
    }
}