const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml"
};

module.exports = (req, res) => {
  let pathname = (req.url || "/").split("?")[0];
  if (pathname === "/" || pathname === "") pathname = "/index.html";

  const allowed = new Set(["/index.html", "/app.js", "/styles.css", "/favicon.svg"]);
  if (!allowed.has(pathname)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  const file = path.join(root, pathname);
  try {
    const data = fs.readFileSync(file);
    res.statusCode = 200;
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Application file could not be loaded.");
  }
};
