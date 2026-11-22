/* Techno Fact — live Arabic tech news ticker ("آخر المستجدات").
   Reads news.json from the news-data branch (updated by .github/workflows/live-news.yml)
   and renders a rotating headline into the element with id="liveTicker". Refreshes every 5 minutes. */
(function () {
  var SRC = 'https://raw.githubusercontent.com/alzbymndhr7-lab/technofact1/news-data/news.json';
  var SHOW = 8, EVERY = 5 * 60 * 1000, ROTATE = 5000, KEY = 'tf-live-news';
  var data = null, idx = 0, timer = null, paused = false;

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
  function items() { return data && data.items ? data.items.slice(0, SHOW) : []; }

  function show(dir) {
    var box = document.getElementById('liveTicker'); if (!box) return;
    var list = items(); if (!list.length) { box.innerHTML = ''; return; }
    idx = (idx + list.length) % list.length;
    var it = list[idx];
    box.innerHTML = '<div class="tk-row"><a class="tk-a ' + (dir < 0 ? 'dn' : 'up') + '" href="' + esc(it.u) + '" target="_blank" rel="noopener noreferrer" dir="rtl" lang="ar" title="' + esc(it.t) + '">' +
      '<span class="tk-t">' + esc(it.t) + '</span><span class="tk-m">' + esc(it.s) + ' · ' + esc(ago(it.d)) + '</span></a>' +
      '<span class="tk-nav"><button type="button" class="tk-b" data-d="-1" aria-label="السابق">›</button><span class="tk-n">' + (idx + 1) + '/' + list.length + '</span><button type="button" class="tk-b" data-d="1" aria-label="التالي">‹</button></span></div>';
    box.querySelectorAll('.tk-b').forEach(function (b) { b.onclick = function () { var d = +b.getAttribute('data-d'); idx += d; show(d); restart(); }; });
  }
  function restart() { clearInterval(timer); timer = setInterval(function () { if (!paused && !document.hidden) { idx++; show(1); } }, ROTATE); }

  function load() {
    fetch(SRC + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { if (j && j.items && j.items.length) { data = j; store(KEY, j); show(0); } })
      .catch(function () { /* keep showing the last list we have */ });
  }

  function init() {
    var box = document.getElementById('liveTicker'); if (!box) return;
    box.addEventListener('mouseenter', function () { paused = true; });
    box.addEventListener('mouseleave', function () { paused = false; });
    data = store(KEY); show(0); load(); restart();
    setInterval(load, EVERY);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
