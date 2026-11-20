// Publishes one post to the site exactly the way the dashboard (admin.html) does.
// Usage: node automation/publish.mjs <post.json>
// post.json: {
//   "slug": "secure-facebook-account",          // lowercase latin, digits, dashes
//   "title": "عنوان المقال", "excerpt": "مقتطف قصير (حتى 170 حرفاً)",
//   "tags": ["facebook","security"],
//   "category": "security" | "news" | "pick",
//   "topic": "facebook",                         // platform/app key (security) or short topic key
//   "body_file": "automation/tmp/body.md",       // Markdown article body (no H1 title line)
//   "cover": { "kicker": "...", "icon": "shield", "label": "فيسبوك", "subtitle": "..." }
// }
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCover } from './cover.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(root, p);
const BASE = 'https://alzbymndhr7-lab.github.io/technofact1/';
const J = (v) => JSON.stringify(v, null, 2) + '\n';
const xesc = (v) => String(v ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c]));
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const words = (md) => (String(md).replace(/[#>*_`\[\]()!-]/g, ' ').match(/\S+/g) || []).length;
const today = () => new Date().toISOString().slice(0, 10);

const specFile = process.argv[2];
if (!specFile) { console.error('usage: node automation/publish.mjs post.json'); process.exit(2); }
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const body = (spec.body ?? readFileSync(path.resolve(root, spec.body_file), 'utf8')).trim();
if (!spec.title || body.length < 1500) { console.error('title missing or article body too short'); process.exit(1); }

const posts = JSON.parse(readFileSync(R('data/posts.json'), 'utf8'));
const settings = JSON.parse(readFileSync(R('data/settings.json'), 'utf8'));
let slug = slugify(spec.slug) || `post-${Date.now().toString(36)}`;
while (posts.some((p) => p.slug === slug) || existsSync(R(`content/${slug}.ar.md`))) slug = `${slug.slice(0, 64)}-${Date.now().toString(36).slice(-4)}`;

const date = today();
const year = date.slice(0, 4);
mkdirSync(R(`images/${year}`), { recursive: true });
const cover = `images/${year}/cover-${slug}.webp`;
await makeCover({ title: spec.title, category: spec.category, ...(spec.cover || {}) }, R(cover));

let excerpt = String(spec.excerpt || '').trim();
if (!excerpt) { const t = body.replace(/[#>*_`]/g, '').replace(/\s+/g, ' ').trim(); excerpt = t.length > 170 ? t.slice(0, 170).replace(/\s+\S*$/, '') + '…' : t; }

const post = {
  slug, date, tags: (spec.tags || []).map((t) => String(t).trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-')).filter(Boolean),
  cover, status: 'published', featured: false,
  ar: { title: spec.title, excerpt }, en: { title: '', excerpt: '' },
  readMin: Math.max(1, Math.round(words(body) / 200)), updated: date,
};
const list = [post, ...posts];

mkdirSync(R('content'), { recursive: true });
writeFileSync(R(`content/${slug}.ar.md`), body + '\n');
writeFileSync(R('data/posts.json'), J(list));

// share page (same template as admin.html sharePageHTML)
const site = settings.name_ar || 'Techno Fact', url = BASE + `p/${slug}/`, img = BASE + cover, target = `../../#post-${slug}`;
mkdirSync(R(`p/${slug}`), { recursive: true });
writeFileSync(R(`p/${slug}/index.html`), `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xesc(spec.title)} | ${xesc(site)}</title>
<meta name="description" content="${xesc(excerpt)}">
<link rel="canonical" href="${xesc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${xesc(site)}">
<meta property="og:locale" content="ar_AR">
<meta property="og:title" content="${xesc(spec.title)}">
<meta property="og:description" content="${xesc(excerpt)}">
<meta property="og:url" content="${xesc(url)}">
<meta property="og:image" content="${xesc(img)}">

<meta property="article:published_time" content="${xesc(date)}">
${post.tags.map((t) => `<meta property="article:tag" content="${xesc(t)}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${xesc(spec.title)}">
<meta name="twitter:description" content="${xesc(excerpt)}">
<meta name="twitter:image" content="${xesc(img)}">
<style>body{background:#070b14;color:#e6edf7;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#22d3ee}</style>
<script>location.replace(${JSON.stringify(target)});</script>
</head><body><p><a href="${xesc(target)}">${xesc(spec.title)}</a></p></body></html>
`);

// feeds (same as admin.html siteFeeds)
const pubs = list.filter((p) => p.status !== 'draft' && p.date <= date).sort((a, b) => b.date.localeCompare(a.date));
const items = pubs.slice(0, 30).map((p) => `  <item><title>${xesc(p.ar?.title || p.en?.title)}</title><link>${BASE}p/${p.slug}/</link><guid>${BASE}p/${p.slug}/</guid><pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate><description>${xesc(p.ar?.excerpt || p.en?.excerpt)}</description></item>`).join('\n');
writeFileSync(R('rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n  <title>${xesc(settings.name_ar || settings.name_en)}</title><link>${BASE}</link><description>${xesc(settings.tagline_ar)}</description><language>ar</language>\n${items}\n</channel></rss>\n`);
writeFileSync(R('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${BASE}</loc></url>\n${pubs.map((p) => `  <url><loc>${BASE}p/${p.slug}/</loc><lastmod>${p.updated || p.date}</lastmod></url>`).join('\n')}\n</urlset>\n`);

// history log used to avoid repeating topics
const hFile = R('automation/history.json');
const history = existsSync(hFile) ? JSON.parse(readFileSync(hFile, 'utf8')) : [];
history.unshift({ date, at: new Date().toISOString(), slug, category: spec.category, topic: spec.topic || '', title: spec.title });
writeFileSync(hFile, J(history));

console.log(JSON.stringify({ ok: true, slug, url, cover }, null, 2));
