const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "application/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"]
};

module.exports = function handler(req, res) {
  let pathname = String((req && req.url) || "/").split("?")[0];

  if (pathname !== "/" && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const entry = FILES[pathname];

  if (!entry) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  const filePath = path.join(ROOT, entry[0]);

  try {
    const body = fs.readFileSync(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", entry[1]);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.end(body);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Kabadiwala Connect deployment error.");
  }
};
