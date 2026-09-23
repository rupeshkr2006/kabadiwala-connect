const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.cwd());
const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "application/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"]
};

module.exports = (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  const entry = FILES[pathname];

  if (!entry) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  const file = path.join(ROOT, entry[0]);

  try {
    const body = fs.readFileSync(file);
    res.statusCode = 200;
    res.setHeader("Content-Type", entry[1]);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.end(body);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Kabadiwala Connect: deployment file is missing.");
  }
};