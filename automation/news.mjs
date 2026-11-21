// Collects the latest Arabic tech headlines from publishers' own RSS feeds.
// Usage: node automation/news.mjs <old.json> <out.json>
// Writes out.json only when at least a few headlines were collected; otherwise keeps the old list.
import { readFileSync, writeFileSync } from 'node:fs';

// kw: general-news feeds — keep only headlines that match TECH; only: keep links matching the pattern (or TECH)
const TECH = /تقني|تكنولوج|الذكاء الاصطناعي|ذكاء اصطناعي|تطبيق|هاتف|هواتف|آيفون|آيباد|أندرويد|جوجل|غوغل|آبل|أبل|مايكروسوفت|ميتا|فيسبوك|واتساب|إنستغرام|انستغرام|تيك توك|تيليغرام|تلغرام|يوتيوب|إيلون ماسك|سامسونغ|هواوي|شاومي|إنفيديا|انفيديا|رقائق|شرائح|أشباه الموصلات|سيبران|قرصنة إلكترونية|اختراق إلكتروني|هاكر|برمجي|برمجة|حاسوب|كمبيوتر|إنترنت|الإنترنت|روبوت|تسلا|شات ?جي ?بي ?تي|ChatGPT|OpenAI|أوبن إيه آي|Gemini|جيميني|بيتكوين|عملات مشفرة|العملات الرقمية|بلايستيشن|إكس بوكس|نينتندو|ألعاب الفيديو|الأقمار الصناعية|ستارلينك|5G|الجيل الخامس/i;
const SOURCES = [
  { name: 'الجزيرة نت', url: 'https://www.aljazeera.net/rss', only: /\/tech\// , kw: true },
  { name: 'بي بي سي عربي', url: 'https://feeds.bbci.co.uk/arabic/science-and-tech/rss.xml', kw: true },
  { name: 'سكاي نيوز عربية', url: 'https://www.skynewsarabia.com/rss/v1/technology.xml', kw: true },
  { name: 'البوابة العربية للأخبار التقنية', url: 'https://aitnews.com/feed/' },
  { name: 'عالم التقنية', url: 'https://www.tech-wd.com/wd/feed/' },
  { name: 'عرب هاردوير', url: 'https://arabhardware.net/feed' },
];
const MAX = 15, KEEP_DAYS = 3, MIN_NEW = 3;

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };
const linkOf = (block) => tag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';

async function fetchSource(src) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(src.url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (TechnoFact live news; +https://alzbymndhr7-lab.github.io/technofact1/)', Accept: 'application/rss+xml, application/xml, text/xml, */*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    const items = blocks.map((b) => {
      const t = tag(b, 'title'), u = linkOf(b).trim();
      const d = Date.parse(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
      return { t, u, s: src.name, d: Number.isFinite(d) ? new Date(d).toISOString() : null };
    }).filter((x) => x.t && /^https?:\/\//.test(x.u) && x.d && ((!src.only && !src.kw) || (src.only && src.only.test(x.u)) || (src.kw && TECH.test(x.t))));
    return { name: src.name, ok: true, count: items.length, items };
  } catch (e) {
    return { name: src.name, ok: false, error: String(e.message || e), items: [] };
  } finally { clearTimeout(timer); }
}

const [oldFile, outFile] = process.argv.slice(2);
let old = {}; try { old = JSON.parse(readFileSync(oldFile, 'utf8')); } catch {}
const results = await Promise.all(SOURCES.map(fetchSource));
const cutoff = Date.now() - KEEP_DAYS * 864e5;
const seen = new Set();
const fresh = results.flatMap((r) => r.items)
  .filter((x) => Date.parse(x.d) >= cutoff && Date.parse(x.d) <= Date.now() + 36e5)
  .sort((a, b) => b.d.localeCompare(a.d))
  .filter((x) => { const k = x.t.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 60); if (seen.has(k) || seen.has(x.u)) return false; seen.add(k); seen.add(x.u); return true; });

for (const r of results) console.log(`${r.ok ? 'OK ' : 'ERR'} ${r.name}: ${r.ok ? r.count + ' items' : r.error}`);
if (fresh.length < MIN_NEW) { console.log(`Only ${fresh.length} headlines — keeping the previous list.`); process.exit(0); }

const items = fresh.slice(0, MAX);
const same = JSON.stringify(items) === JSON.stringify(old.items || []);
if (same) { console.log('No new headlines.'); process.exit(0); }
writeFileSync(outFile, JSON.stringify({ updated: new Date().toISOString(), items, sources: results.map(({ name, ok, count, error }) => ({ name, ok, count, error })) }, null, 1));
console.log(`Wrote ${items.length} headlines.`);
