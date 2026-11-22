/* Techno Fact — live Arabic tech news box.
   Reads news.json from the news-data branch (updated by .github/workflows/live-news.yml)
   and renders it into any element with id="liveNews". Refreshes every 5 minutes. */
(function () {
  var SRC = 'https://raw.githubusercontent.com/alzbymndhr7-lab/technofact1/news-data/news.json';
  var SHOW = 6, EVERY = 5 * 60 * 1000, KEY = 'tf-live-news';
  var data = null, seenTop = null;

  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(iso) {
    var m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (m < 1) return 'الآن';
    if (m === 1) return 'منذ دقيقة';
    if (m === 2) return 'منذ دقيقتين';
    if (m < 11) return 'منذ ' + m + ' دقائق';
    if (m < 60) return 'منذ ' + m + ' دقيقة';
    var h = Math.round(m / 60);
    if (h === 1) return 'منذ ساعة';
    if (h === 2) return 'منذ ساعتين';
    if (h < 11) return 'منذ ' + h + ' ساعات';
    if (h < 24) return 'منذ ' + h + ' ساعة';
    var d = Math.round(h / 24);
    return d === 1 ? 'منذ يوم' : d === 2 ? 'منذ يومين' : 'منذ ' + d + ' أيام';
  }

  function css() {
    if (document.getElementById('lnCss')) return;
    var s = document.createElement('style'); s.id = 'lnCss';
    s.textContent =
      '#liveNews:empty{display:none}' +
      '.ln{background:var(--card,#0d1424);border:1px solid var(--line,#1a2540);border-radius:18px;padding:20px 22px;margin:8px 0 30px}' +
      '.ln-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}' +
      '.ln-live{display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(239,68,68,.12);color:#f87171;font-weight:700;font-size:13px;letter-spacing:.3px}' +
      '.ln-dot{width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.7);animation:lnp 1.6s infinite}' +
      '@keyframes lnp{0%{box-shadow:0 0 0 0 rgba(239,68,68,.6)}70%{box-shadow:0 0 0 9px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}' +
      '.ln-t{margin:0;font-size:20px;font-weight:700;color:var(--ink,#e6edf7)}' +
      '.ln-u{margin-inline-start:auto;font-size:12.5px;color:var(--mut,#8a9ab5)}' +
      '.ln-l{list-style:none;margin:0;padding:0;display:grid;gap:2px}' +
      '.ln-i a{display:flex;gap:12px;align-items:flex-start;padding:11px 10px;border-radius:12px;text-decoration:none;color:var(--ink,#e6edf7);transition:background .2s}' +
      '.ln-i a:hover{background:var(--bg2,#0a1020)}' +
      '.ln-b{flex:none;width:6px;height:6px;border-radius:50%;background:var(--a,#3b82f6);margin-top:10px}' +
      '.ln-x{display:flex;flex-direction:column;gap:4px;min-width:0}' +
      '.ln-x b{font-weight:600;font-size:15.5px;line-height:1.6}' +
      '.ln-m{font-size:12.5px;color:var(--mut,#8a9ab5)}' +
      '.ln-new{display:inline-block;margin-inline-start:8px;padding:1px 8px;border-radius:6px;background:var(--a,#3b82f6);color:#04070e;font-size:11px;font-weight:800;vertical-align:middle}' +
      '.ln-i.fresh{animation:lnf 2.4s ease-out}' +
      '@keyframes lnf{0%{background:rgba(59,130,246,.18)}100%{background:transparent}}' +
      '@media(max-width:640px){.ln{padding:16px 14px}.ln-t{font-size:18px}.ln-x b{font-size:15px}}';
    document.head.appendChild(s);
  }

  function render() {
    var box = document.getElementById('liveNews');
    if (!box) return;
    if (!data || !data.items || !data.items.length) { box.innerHTML = ''; return; }
    css();
    var items = data.items.slice(0, SHOW);
    var lastSeen = store(KEY + '-seen') || '';
    var html = '<div class="ln" dir="rtl" lang="ar" aria-live="polite">' +
      '<div class="ln-h"><span class="ln-live"><span class="ln-dot" aria-hidden="true"></span>مباشر</span>' +
      '<h2 class="ln-t">أخبار التقنية أولاً بأول</h2>' +
      '<span class="ln-u">آخر تحديث ' + esc(ago(data.updated)) + '</span></div><ul class="ln-l">';
    items.forEach(function (it) {
      var isNew = lastSeen && it.d > lastSeen;
      html += '<li class="ln-i' + (isNew ? ' fresh' : '') + '"><a href="' + esc(it.u) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="ln-b" aria-hidden="true"></span><span class="ln-x"><b>' + esc(it.t) + (isNew ? '<span class="ln-new">جديد</span>' : '') + '</b>' +
        '<span class="ln-m">' + esc(it.s) + ' · ' + esc(ago(it.d)) + '</span></span></a></li>';
    });
    box.innerHTML = html + '</ul></div>';
    if (items[0] && items[0].d !== seenTop) { seenTop = items[0].d; setTimeout(function () { store(KEY + '-seen', items[0].d); }, 30000); }
  }

  function load() {
    fetch(SRC + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { if (j && j.items && j.items.length) { data = j; store(KEY, j); render(); } })
      .catch(function () { /* keep showing the last list we have */ });
  }

  data = store(KEY);
  new MutationObserver(function () { var b = document.getElementById('liveNews'); if (b && !b.firstChild) render(); })
    .observe(document.documentElement, { childList: true, subtree: true });
  render(); load();
  setInterval(load, EVERY);
  setInterval(render, 60000);
})();
