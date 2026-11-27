import './build.mjs';
import { createServer } from 'node:http';

const { default: app } = await import('../dist/server/index.js');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    const request = new Request(new URL(req.url, `http://${host}:${port}`), {
      method: req.method,
      headers: req.headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' }),
    });
    const response = await app.fetch(request, process.env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end('Server error');
  }
}).listen(port, host, () => console.log(`Local: http://${host}:${port}`));
