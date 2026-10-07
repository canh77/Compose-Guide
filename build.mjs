// Build index.html from src/head.html + src/sections/*.html + src/foot.html.
// Usage: node build.mjs        (writes index.html, exits 1 on validation errors)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const sectionsDir = join(src, 'sections');

const CHAPTERS = {
  '01': 'Bắt đầu',
  '02': 'Bố cục',
  '03': 'Thành phần giao diện',
  '04': 'Trạng thái và kiến trúc',
  '05': 'Điều hướng',
  '06': 'Giao diện và Theme',
  '07': 'Animation, cử chỉ và đồ họa',
  '08': 'Chất lượng',
  '09': 'Tích hợp và học tiếp',
};
const BLOCKS = ['block-def', 'block-use', 'block-example', 'block-notes'];

const errors = [];
const warnings = [];
// data-title values are already HTML-escaped attribute text, so they are reused as-is.
const escapeHtml = (s) => s;

const files = readdirSync(sectionsDir).filter((f) => /^\d\d-\d\d-[\w-]+\.html$/.test(f)).sort();
const topics = files.map((file) => {
  const html = readFileSync(join(sectionsDir, file), 'utf8').replace(/^﻿/, '').trim();
  const chapter = file.slice(0, 2);
  const open = /^<section class="topic" id="([\w-]+)" data-title="([^"]+)">/.exec(html);
  if (!open) errors.push(`${file}: missing or malformed opening <section class="topic" id="…" data-title="…">`);
  if (!html.endsWith('</section>')) errors.push(`${file}: must end with </section>`);
  if (!CHAPTERS[chapter]) errors.push(`${file}: unknown chapter ${chapter}`);

  let last = -1;
  for (const b of BLOCKS) {
    const i = html.indexOf(`class="block ${b}"`);
    if (i === -1) errors.push(`${file}: missing block ${b}`);
    else if (i < last) errors.push(`${file}: block ${b} out of order`);
    last = Math.max(last, i);
  }

  for (const m of html.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)) {
    const code = m[1];
    if (/</.test(code)) errors.push(`${file}: unescaped "<" inside code block near: ${code.slice(code.indexOf('<'), code.indexOf('<') + 40).replace(/\n/g, ' ')}`);
    const amp = /&(?!(amp|lt|gt|quot|#39|#\d+|#x[0-9a-f]+);)/i.exec(code);
    if (amp) errors.push(`${file}: unescaped "&" inside code block near: ${code.slice(amp.index, amp.index + 30).replace(/\n/g, ' ')}`);
  }
  const outside = html.replace(/<pre><code[^>]*>[\s\S]*?<\/code><\/pre>/g, '');
  const bad = /<(?!\/?(section|h2|h3|h4|p|div|ul|ol|li|strong|em|code|a|pre|table|thead|tbody|tr|th|td|br|span|kbd|sup|sub|b|i)\b)[^\s>]/i.exec(outside);
  if (bad) errors.push(`${file}: unexpected "<" (unescaped text or disallowed tag) near: ${outside.slice(bad.index, bad.index + 40).replace(/\n/g, ' ')}`);
  if (/style="/.test(html)) warnings.push(`${file}: inline style attribute`);
  if (/<script/i.test(html)) errors.push(`${file}: <script> not allowed`);

  return { file, chapter, id: open ? open[1] : file, title: open ? open[2] : file, html };
});

const ids = new Set(['gioi-thieu', 'noi-dung']);
for (const t of topics) {
  if (ids.has(t.id)) errors.push(`${t.file}: duplicate id ${t.id}`);
  ids.add(t.id);
}
Object.keys(CHAPTERS).forEach((c) => ids.add(`chuong-${c}`));

// --draft: allow links to topics that are not written yet (for local preview only)
const draft = process.argv.includes('--draft');
for (const t of topics) {
  for (const m of t.html.matchAll(/href="#([\w-]+)"/g)) {
    if (!ids.has(m[1])) (draft ? warnings : errors).push(`${t.file}: broken internal link #${m[1]}`);
  }
}

// Navigation grouped by chapter
const usedChapters = [...new Set(topics.map((t) => t.chapter))];
const nav = usedChapters.map((c) => {
  const items = topics.filter((t) => t.chapter === c)
    .map((t) => `        <li><a href="#${t.id}">${escapeHtml(t.title)}</a></li>`).join('\n');
  return `    <div class="nav-group">\n      <p class="nav-chapter"><a href="#chuong-${c}">${Number(c)}. ${CHAPTERS[c]}</a></p>\n      <ul>\n${items}\n      </ul>\n    </div>`;
}).join('\n');

// Sections with chapter dividers and prev/next pager
let body = '';
topics.forEach((t, i) => {
  if (i === 0 || topics[i - 1].chapter !== t.chapter) {
    body += `\n<div class="chapter-divider" id="chuong-${t.chapter}"><span class="chapter-num">Chương ${Number(t.chapter)}</span><span class="chapter-name">${CHAPTERS[t.chapter]}</span></div>\n`;
  }
  const prev = topics[i - 1];
  const next = topics[i + 1];
  const pager = `  <nav class="pager" aria-label="Chủ đề trước và sau">`
    + (prev ? `<a class="prev" href="#${prev.id}"><span>Trước</span>${escapeHtml(prev.title)}</a>` : '')
    + (next ? `<a class="next" href="#${next.id}"><span>Tiếp theo</span>${escapeHtml(next.title)}</a>` : '')
    + `</nav>\n</section>`;
  body += '\n' + t.html.replace(/<\/section>\s*$/, pager) + '\n';
});

const fill = (s) => s
  .replaceAll('{{TOPIC_COUNT}}', String(topics.length))
  .replaceAll('{{CHAPTER_COUNT}}', String(usedChapters.length))
  .replace('{{NAV}}', nav);

const out = fill(readFileSync(join(src, 'head.html'), 'utf8')) + body + readFileSync(join(src, 'foot.html'), 'utf8');

warnings.forEach((w) => console.warn('WARN  ' + w));
if (errors.length) {
  errors.forEach((e) => console.error('ERROR ' + e));
  console.error(`\n${errors.length} error(s); index.html not written.`);
  process.exit(1);
}
writeFileSync(join(root, 'index.html'), out, 'utf8');
console.log(`index.html written: ${topics.length} topics in ${usedChapters.length} chapters, ${Math.round(out.length / 1024)} KB.`);
