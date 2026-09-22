const fs = require("fs");
const path = require("path");
const publicDir = path.join(__dirname, "public");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

module.exports = (req, res) => {
  try {
    let pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (pathname === "/") pathname = "/index.html";
    const file = path.resolve(publicDir, "." + pathname);
    if (!file.startsWith(publicDir)) {
      return res.status(403).send("Forbidden");
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return res.status(404).send("Not found");
    }
    res.setHeader("Content-Type", mime[path.extname(file).toLowerCase()] || "application/octet-stream");
    return res.send(fs.readFileSync(file));
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
};