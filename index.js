const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// Upload endpoint – saves file with original name like 'data_2.mp3'
app.post("/upload-audio", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = path.extname(req.file.originalname) || ".mp3";
  const newPath = path.join(req.file.destination, req.file.filename + ext);

  fs.renameSync(req.file.path, newPath);

  res.status(200).json({ success: true, file: path.basename(newPath) });
});

// Merge all uploaded MP3s in proper order: data_2, data_4, ...
app.post("/merge-audio", (req, res) => {
  const uploadDir = "uploads/";
  const files = fs.readdirSync(uploadDir)
    .filter(f => f.endsWith(".mp3"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/data_(\d+)/)?.[1]);
      const numB = parseInt(b.match(/data_(\d+)/)?.[1]);
      return numA - numB;
    });

  if (files.length === 0) {
    return res.status(400).json({ error: "No files to merge" });
  }

  const listPath = path.join(uploadDir, "list.txt");
  const outputPath = `merged-${Date.now()}.mp3`;

  const listContent = files
    .map(f => `file '${path.resolve(uploadDir, f)}'`)
    .join("\n");

  fs.writeFileSync(listPath, listContent);

  exec(`ffmpeg -f concat -safe 0 -i ${listPath} -c copy ${outputPath}`, (err) => {
    files.forEach(f => fs.unlinkSync(path.join(uploadDir, f)));
    fs.unlinkSync(listPath);

    if (err) {
      console.error("FFmpeg error:", err);
      return res.status(500).json({ error: "Merge failed" });
    }

    res.download(outputPath, () => {
      fs.unlinkSync(outputPath);
    });
  });
});

// Optional debug endpoint to view current uploads
app.get("/debug-uploads", (req, res) => {
  const files = fs.readdirSync("uploads/").filter(f => f.endsWith(".mp3"));
  res.json({ files });
});

app.get("/", (req, res) => {
  res.send("🎧 Audio Merge API is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
