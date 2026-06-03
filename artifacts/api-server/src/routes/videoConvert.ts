import { Router, type Request, type Response } from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, cb) => cb(null, `pagoya-raw-${Date.now()}.webm`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB upload limit
});

// POST /api/video/convert
// Accepts a raw WebM recording and returns an H.264 MP4 under 100 MB.
// Target: 3 Mbps video, CRF 23, fast preset — gives ~65 MB for a 3-min 1080p recording.
router.post("/convert", upload.single("video"), (req: Request, res: Response): void => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: "No video file uploaded." });
    return;
  }

  const inputPath = file.path;
  const outputPath = path.join(os.tmpdir(), `pagoya-demo-en-${Date.now()}.mp4`);

  const ffmpegArgs = [
    "-y",
    "-i", inputPath,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-b:v", "3M",
    "-maxrate", "4M",
    "-bufsize", "8M",
    "-movflags", "+faststart",
    "-an",                // no audio track
    "-pix_fmt", "yuv420p",
    outputPath,
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  let stderr = "";
  ffmpeg.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

  ffmpeg.on("close", (code) => {
    fs.unlink(inputPath, () => {});

    if (code !== 0) {
      fs.unlink(outputPath, () => {});
      console.error("[video-convert] ffmpeg failed:\n", stderr);
      res.status(500).json({ error: "Conversion failed.", detail: stderr.slice(-500) });
      return;
    }

    const stat = fs.statSync(outputPath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'attachment; filename="pagoya-demo-en.mp4"');
    res.setHeader("Content-Length", stat.size);

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on("close", () => fs.unlink(outputPath, () => {}));
  });

  ffmpeg.on("error", (err) => {
    fs.unlink(inputPath, () => {});
    console.error("[video-convert] spawn error:", err);
    res.status(500).json({ error: "ffmpeg not available." });
  });
});

export default router;
