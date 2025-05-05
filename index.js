const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// Temporary upload endpoint: stores MP3s one-by-one
app.post("/upload-audio", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.status(200).json({ success: true, file: req.file.filename });
});

// Merge all uploaded MP3s and return the merged result
app.post("/merge-audio", (req, res) => {
  const uploadDir = "uploads/";
  const files = fs.readdirSync(uploadDir).filter(f => f.endsWith(".mp3"));

  if (files.length === 0) {
    return res.status(400).json({ error: "No files to merge" });
  }

  const listPath = `${uploadDir}list.txt`;
  const outputPath = `merged-${Date.now()}.mp3`;

  const listContent = files
    .map(f => `file '${path.resolve(uploadDir, f)}'`)
    .join("\n");

  fs.writeFileSync(listPath, listContent);

  exec(`ffmpeg -f concat -safe 0 -i ${listPath} -c copy ${outputPath}`, (err) => {
    // Clean up uploaded files and list.txt
    files.forEach(f => fs.unlinkSync(path.join(uploadDir, f)));
    fs.unlinkSync(listPath);

    if (err) {
      console.error("FFmpeg error:", err);
      return res.status(500).json({ error: "Merge failed" });
    }

    // Send merged file and delete it afterward
    res.download(outputPath, () => {
      fs.unlinkSync(outputPath);
    });
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("🎧 Audio Merge API is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
