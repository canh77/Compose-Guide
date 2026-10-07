// Check every external link in index.html. Usage: node check-links.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const urls = [...new Set([...html.matchAll(/href="(https?:\/\/[^"#]+)(#[^"]*)?"/g)].map((m) => m[1].replace(/&amp;/g, '&')))]
  .filter((u) => !u.startsWith('https://fonts.'));

const bad = [];
let i = 0;
async function worker() {
  while (i < urls.length) {
    const url = urls[i++];
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' } });
      if (!res.ok) bad.push(`${res.status} ${url}`);
    } catch (e) {
      bad.push(`ERR ${url} (${e.message})`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`${urls.length} external links checked, ${bad.length} broken.`);
bad.forEach((b) => console.log('  ' + b));
process.exit(bad.length ? 1 : 0);
