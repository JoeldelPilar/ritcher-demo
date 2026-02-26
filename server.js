const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3333;

// CORS headers — allow Ritcher stitcher to proxy from demo server
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
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
  console.log(`Ad creatives served at http://localhost:${PORT}/ads/`);
});
