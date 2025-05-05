const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/merge-audio", upload.array("files"), (req, res) => {
  const fileList = req.files;

  if (!fileList || fileList.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const listPath = "uploads/list.txt";
  const outputPath = `merged-${Date.now()}.mp3`;

  const listContent = fileList
    .map(f => `file '${path.resolve(f.path)}'`)
    .join("\n");

  fs.writeFileSync(listPath, listContent);

  exec(`ffmpeg -f concat -safe 0 -i ${listPath} -c copy ${outputPath}`, (err) => {
    fileList.forEach(file => fs.unlinkSync(file.path));
    fs.unlinkSync(listPath);

    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Merge failed" });
    }

    res.download(outputPath, () => {
      fs.unlinkSync(outputPath);
    });
  });
});

app.get("/", (req, res) => {
  res.send("🎧 Audio Merge API is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
