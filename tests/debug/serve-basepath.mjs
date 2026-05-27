import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('out');
const BASE = '/thorndon-tennis-club-day';
const PORT = Number(process.env.PORT || 3737);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let pathname = new URL(req.url, 'http://x').pathname;
  if (!pathname.startsWith(BASE)) {
    res.statusCode = 404;
    res.end('not under basePath');
    return;
  }
  let rel = pathname.slice(BASE.length) || '/';
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.join(ROOT, rel);
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader('content-type', MIME[ext] || 'application/octet-stream');
    res.end(buf);
  });
});
server.listen(PORT, () => console.log(`serving ${ROOT} at http://localhost:${PORT}${BASE}/`));
