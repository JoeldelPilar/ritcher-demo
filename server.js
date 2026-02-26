const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3333;

// Ritcher stitcher URL — set via env var for OSC deployment
const RITCHER_URL = process.env.RITCHER_URL || "http://localhost:3000";

// CORS headers — allow Ritcher stitcher to proxy from demo server
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Config endpoint — tells the frontend where the stitcher is
app.get("/config", (_req, res) => {
  res.json({ ritcherUrl: RITCHER_URL });
});

// Serve static files from public/ (includes /ads/ creatives)
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      } else if (filePath.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      }
    },
  })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ritcher Demo running on http://localhost:${PORT}`);
  console.log(`Stitcher URL: ${RITCHER_URL}`);
  console.log(`Ad creatives served at http://localhost:${PORT}/ads/`);
});
