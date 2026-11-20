// Generates a 1280x720 cover image (WebP) for a Techno Fact post.
// Usage: node automation/cover.mjs <spec.json> <out.webp>
// spec: { "title": "...", "kicker": "أمان حساباتك", "category": "security|news|pick", "icon": "shield", "label": "فيسبوك" }
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
function load(name) {
  for (const p of [name, `/opt/npm-tools/node_modules/${name}`, path.join(process.env.HOME || '', '.npm-global/lib/node_modules', name)]) {
    try { return require(p); } catch {}
  }
  throw new Error(`Missing module ${name}: run "npm i --no-save ${name}" in the repo`);
}

const THEMES = {
  security: { accent: '#FBBF24', tag: 'أمان حساباتك' },
  news:     { accent: '#22D3EE', tag: 'أخبار التقنية' },
  pick:     { accent: '#A3E635', tag: 'اختيار تكنو فاكت' },
};

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  shield: I('<path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/><rect x="9" y="10.5" width="6" height="5" rx="1"/><path d="M10 10.5V9a2 2 0 0 1 4 0v1.5"/>'),
  key: I('<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M16 7l3 3M14 9l2 2"/>'),
  lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.5"/>'),
  eye: I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  phone: I('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  chat: I('<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6A8 8 0 1 1 21 12z"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  globe: I('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3.5 3 16.5 0 20M12 2c-3 3.5-3 16.5 0 20"/>'),
  chip: I('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
  robot: I('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3" r="1"/>'),
  code: I('<path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>'),
  bolt: I('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  wifi: I('<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>'),
  cloud: I('<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/>'),
  bug: I('<rect x="7" y="8" width="10" height="13" rx="5"/><path d="M12 8V21M3 13h4M17 13h4M4 7l3 2M20 7l-3 2M4 19l3-2M20 19l-3-2M9 5l1.5 2M15 5l-1.5 2"/>'),
  gamepad: I('<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1"/><circle cx="18" cy="13.5" r="1"/>'),
  camera: I('<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>'),
  laptop: I('<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>'),
  sparkle: I('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 3v4M17 5h4"/>'),
};

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function html(spec) {
  const t = THEMES[spec.category] || THEMES.pick;
  const accent = spec.accent || t.accent;
  const icon = ICONS[spec.icon] || ICONS[spec.category === 'security' ? 'shield' : spec.category === 'news' ? 'bolt' : 'sparkle'];
  const title = String(spec.title || '');
  const fs = title.length > 60 ? 52 : title.length > 44 ? 60 : title.length > 30 ? 68 : 84;
  const font = readFileSync(path.join(here, 'fonts/Cairo.ttf')).toString('base64');
  const dots = Array.from({ length: 16 }, (_, i) => `<circle cx="${20 + i * 40}" cy="20" r="2"/><circle cx="${20 + i * 40}" cy="700" r="2"/>`).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:Cairo;src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:200 1000}
*{box-sizing:border-box}html,body{margin:0;width:1280px;height:720px;background:#0B1220;overflow:hidden}
.root{position:relative;width:1280px;height:720px;font-family:Cairo,sans-serif;color:#F8FAFC;display:flex;align-items:center;gap:56px;padding:72px 88px}
.bg{position:absolute;left:0;top:0}
.txt{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:24px;position:relative}
.pill{align-self:flex-start;display:flex;align-items:center;gap:10px;padding:6px 20px;border:2px solid ${accent};border-radius:999px;color:${accent};font-size:24px;font-weight:700}
h1{margin:0;font-size:${fs}px;line-height:1.25;font-weight:900}
.sub{margin:0;font-size:32px;line-height:1.4;font-weight:600;color:#CBD5E1}
.brand{display:flex;align-items:center;gap:14px;margin-top:14px;font-size:24px;font-weight:600;color:#94A3B8}
.bar{width:44px;height:4px;border-radius:2px;background:${accent}}
.vis{flex:0 0 380px;height:380px;position:relative;display:grid;place-items:center}
.ring{position:absolute;inset:0;border:3px solid #1E293B;border-radius:50%}
.ring2{position:absolute;inset:-40px;border:2px dashed #162033;border-radius:50%}
.disc{width:250px;height:250px;border-radius:50%;background:#131D33;border:6px solid ${accent};display:grid;place-items:center;color:${accent}}
.disc svg{width:140px;height:140px}
.label{position:absolute;bottom:6px;padding:8px 26px;border-radius:12px;background:${accent};color:#0B1220;font-size:28px;font-weight:800}
</style></head><body><div class="root">
<svg class="bg" width="680" height="720" viewBox="0 0 680 720" fill="#1E293B">${dots}</svg>
<div class="txt">
<div class="pill">${esc(spec.kicker || t.tag)}</div>
<h1>${esc(title)}</h1>
${spec.subtitle ? `<p class="sub">${esc(spec.subtitle)}</p>` : ''}
<div class="brand"><span class="bar"></span><span>تكنو فاكت · Techno Fact</span></div>
</div>
<div class="vis"><div class="ring2"></div><div class="ring"></div><div class="disc">${icon}</div>${spec.label ? `<div class="label">${esc(spec.label)}</div>` : ''}</div>
</div></body></html>`;
}

export async function makeCover(spec, out) {
  const { chromium } = load('playwright');
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(html(spec), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png' });
    const sharp = load('sharp');
    writeFileSync(out, await sharp(png).webp({ quality: 86 }).toBuffer());
  } finally { await browser.close(); }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [specFile, out] = process.argv.slice(2);
  if (!specFile || !out) { console.error('usage: node automation/cover.mjs spec.json out.webp'); process.exit(2); }
  await makeCover(JSON.parse(readFileSync(specFile, 'utf8')), out);
  console.log('cover written:', out);
}
