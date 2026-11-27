import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const assets = [
  ['index.html', 'text/html; charset=utf-8'],
  ['style.css', 'text/css; charset=utf-8'],
  ['app.js', 'text/javascript; charset=utf-8'],
  ['guidance.mjs', 'text/javascript; charset=utf-8'],
  ['smog-city.webp', 'image/webp'],
];
const root = new URL('../', import.meta.url);
const out = new URL('dist/server/', root);
const entries = await Promise.all(assets.map(async ([file, mime]) => {
  const data = await readFile(new URL(`public/${file}`, root));
  const literal = mime.startsWith('text/')
    ? JSON.stringify(data.toString('utf8'))
    : `Uint8Array.from(atob(${JSON.stringify(data.toString('base64'))}), (byte) => byte.charCodeAt(0))`;
  return `[${JSON.stringify('/' + file)}, [${JSON.stringify(mime)}, ${literal}]]`;
}));
const guidance = (await readFile(new URL('public/guidance.mjs', root), 'utf8')).replace(/^export /gm, '');
const server = (await readFile(new URL('server.mjs', root), 'utf8')).replace(/^import .*\n/, '');
await mkdir(out, { recursive: true });
await writeFile(new URL('index.js', out), `${guidance}\n${server}\nexport default createApp(new Map([\n${entries.join(',\n')}\n]));\n`);
const manifestDir = new URL('dist/.openai/', root);
await mkdir(manifestDir, { recursive: true });
await copyFile(new URL('.openai/hosting.json', root), new URL('hosting.json', manifestDir));
