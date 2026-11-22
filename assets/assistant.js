/* Techno Fact — on-site assistant ("مساعد تكنو فاكت").
   Answers visitor questions from the site's own articles and settings.
   Runs fully in the browser: no API keys, no server. It searches every published
   article (split into sections), picks the best-matching passage and links to the article. */
(function () {
  'use strict';
  var BASE = (location.pathname.replace(/index\.html$/, '').replace(/[^/]*$/, '')) || '/';
  var st = { open: false, ready: null, posts: [], settings: {}, chunks: [], df: {}, avgLen: 1 };

  /* ---------- text helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lang() { return (document.documentElement.lang || 'ar').slice(0, 2) === 'en' ? 'en' : 'ar'; }
  function L(ar, en) { return lang() === 'ar' ? ar : en; }
  function tr(o, f) { if (!o) return ''; var a = o[lang()] || {}, b = o[lang() === 'ar' ? 'en' : 'ar'] || {}; return a[f] || b[f] || ''; }

  var STOP = ('في من على الى إلى عن مع هذا هذه ذلك تلك التي الذي الذين هو هي هم انا أنا انت أنت نحن كان كانت يكون ' +
    'ما ماذا متى اين أين كيف لماذا هل او أو ثم قد لا لم لن ان أن إن كل بعض اي أي غير بين عند حتى اذا إذا لكن ' +
    'شو ايش إيش وش كيفية طريقة ممكن بدي اريد أريد ابغى عايز يعني عشان علشان ليش لو منين وين فيه فيها به بها له لها ' +
    'لي لك لكم عليه عليها كمان برضو يا ياريت رجاء من فضلك اعرف أعرف معرفة شرح اشرح وضح ' +
    'the a an of to in on for and or is are was be how what why when where which who can do does i my me you your it this that with about please').split(/\s+/);
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[norm(w)] = 1; });

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ْٰـ]/g, '')       // diacritics + tatweel
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  }
  function stem(w) {
    if (/^[a-z0-9]+$/.test(w)) { return w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w; }
    if (w.length > 4) w = w.replace(/^(وال|بال|كال|فال|لل|ال)/, '');
    else if (w.length > 3) w = w.replace(/^(ال)/, '');
    if (w.length > 4) w = w.replace(/^(و|ف|ب|ل)(?=...)/, '');
    if (w.length > 4) w = w.replace(/(ات|ون|ين|ان|ها|هم|كم|نا|يه|ه)$/, '');
    return w;
  }
  function tokens(s) {
    var out = [];
    norm(s).replace(/[^؀-ۿa-z0-9]+/g, ' ').split(' ').forEach(function (w) {
      if (!w || w.length < 2 || STOPSET[w]) return;
      var t = stem(w); if (t.length >= 2 && !STOPSET[t]) out.push(t);
    });
    return out;
  }
  function plain(md) {
    return String(md || '').replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`>#|]/g, '').replace(/\s+/g, ' ').trim();
  }

  /* ---------- data + index ---------- */
  function getJSON(p) { return fetch(BASE + p + '?t=' + Math.floor(Date.now() / 60000)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function getText(p) { return fetch(BASE + p).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; }); }
  function published(ps) {
    var today = new Date().toISOString().slice(0, 10);
    return (ps || []).filter(function (p) { return p.status !== 'draft' && (!p.date || p.date <= today); })
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  }
  function load() {
    if (st.ready) return st.ready;
    st.ready = Promise.all([getJSON('data/posts.json'), getJSON('data/settings.json')]).then(function (r) {
      st.posts = published(r[0]); st.settings = r[1] || {};
      return Promise.all(st.posts.map(function (p) {
        return Promise.all([getText('content/' + p.slug + '.ar.md'), getText('content/' + p.slug + '.en.md')]).then(function (m) {
          [['ar', m[0]], ['en', m[1]]].forEach(function (x) { if (x[1]) addChunks(p, x[0], x[1]); });
        });
      }));
    }).then(function () {
      var tot = 0; st.chunks.forEach(function (c) { tot += c.len; });
      st.avgLen = st.chunks.length ? tot / st.chunks.length : 1;
    });
    return st.ready;
  }
  function addChunks(p, lg, md) {
    var title = (p[lg] && p[lg].title) || tr(p, 'title');
    var parts = String(md).split(/\n(?=##\s)/);
    parts.forEach(function (part, i) {
      var m = part.match(/^##+\s+(.+)/), head = m ? m[1].trim() : '';
      var body = m ? part.slice(m[0].length) : part;
      if (/^(المصادر|sources)$/i.test(norm(head).trim())) return;
      var toks = tokens(title + ' ' + head + ' ' + head + ' ' + body);
      var tf = {}; toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      var titleT = {}; tokens(title + ' ' + head).forEach(function (t) { titleT[t] = 1; });
      Object.keys(tf).forEach(function (t) { st.df[t] = (st.df[t] || 0) + 1; });
      st.chunks.push({ post: p, lang: lg, title: title, head: head, body: body.trim(), tf: tf, titleT: titleT, len: toks.length || 1, idx: i });
    });
  }
  function search(q) {
    var qt = tokens(q); if (!qt.length) return [];
    var N = st.chunks.length, k1 = 1.4, b = 0.7, uniq = {};
    qt.forEach(function (t) { uniq[t] = 1; }); qt = Object.keys(uniq);
    var res = st.chunks.map(function (c) {
      var s = 0, hit = 0;
      qt.forEach(function (t) {
        var f = c.tf[t] || 0;
        if (!f) { // allow prefix match for longer words (e.g. "حساب" ~ "حسابك")
          if (t.length >= 4) Object.keys(c.tf).some(function (k) { if (k.length >= 4 && (k.indexOf(t) === 0 || t.indexOf(k) === 0)) { f = c.tf[k] * 0.6; return true; } return false; });
          if (!f) return;
        }
        hit++;
        var idf = Math.log(1 + (N - (st.df[t] || 1) + 0.5) / ((st.df[t] || 1) + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * c.len / st.avgLen));
        if (c.titleT[t]) s += idf * 0.8;
      });
      if (c.lang !== lang()) s *= 0.85;
      return { c: c, s: s * (0.5 + hit / qt.length), hit: hit, need: qt.length };
    }).filter(function (r) { return r.s > 0; });
    res.sort(function (a, b) { return b.s - a.s; });
    return res;
  }
  function bestPassage(c, q) {
    var qt = tokens(q), lines = c.body.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return '';
    var scored = lines.map(function (l, i) {
      var lt = tokens(l), s = 0; qt.forEach(function (t) { if (lt.indexOf(t) >= 0) s++; });
      return { i: i, s: s };
    });
    var top = scored.slice().sort(function (a, b) { return b.s - a.s || a.i - b.i; })[0];
    var start = top.s > 0 ? top.i : 0;
    // take the matching line plus following lines (lists stay together), up to ~420 chars
    var out = [], len = 0;
    for (var i = start; i < lines.length && len < 420; i++) { out.push(lines[i]); len += lines[i].length; }
    if (start > 0 && /^(\d+\.|[-*])\s/.test(lines[start]) && !/^(\d+\.|[-*])\s/.test(lines[start - 1]) && lines[start - 1].length < 220) out.unshift(lines[start - 1]);
    return out.join('\n');
  }
  function mdHTML(md) {
    if (window.marked && window.DOMPurify) { try { return DOMPurify.sanitize(marked.parse(md)); } catch (e) { } }
    return '<p>' + esc(md).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</p>';
  }

  /* ---------- built-in answers about the site ---------- */
  function has(q, words) { var n = ' ' + norm(q) + ' '; return words.some(function (w) { return n.indexOf(norm(w)) >= 0; }); }
  function siteName() { return st.settings['name_' + lang()] || L('تكنو فاكت', 'Techno Fact'); }
  function postLink(p, label) { return '<a class="as-link" href="#post-' + esc(p.slug) + '">' + esc(label || tr(p, 'title')) + '</a>'; }
  function intent(q) {
    var s = st.settings, words = tokens(q).length;
    if (words <= 2 && has(q, ['مرحبا', 'السلام', 'اهلا', 'هلا', 'مساء', 'صباح', 'hi', 'hello', 'hey'])) {
      return L('أهلًا بك! اسألني عن أي موضوع تقني، وسأبحث لك في مقالات ' + esc(siteName()) + ' عن الجواب.',
        'Hi! Ask me anything about tech and I will look for the answer in ' + esc(siteName()) + ' articles.');
    }
    if (has(q, ['تواصل', 'اتواصل', 'ايميل', 'إيميل', 'بريد', 'رقم', 'واتساب', 'راسل', 'contact', 'email', 'whatsapp', 'reach'])) {
      var so = s.social || {}, links = [];
      if (s.email) links.push('<a class="as-link" href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>');
      var names = { facebook: 'Facebook', instagram: 'Instagram', x: 'X', youtube: 'YouTube', tiktok: 'TikTok', linkedin: 'LinkedIn', telegram: 'Telegram', whatsapp: 'WhatsApp', github: 'GitHub' };
      Object.keys(names).forEach(function (k) {
        var v = String(so[k] || '').trim(); if (!v) return;
        if (k === 'whatsapp' && /^\+?[\d\s-]+$/.test(v)) v = 'https://wa.me/' + v.replace(/\D/g, '');
        links.push('<a class="as-link" href="' + esc(v) + '" target="_blank" rel="noopener">' + names[k] + '</a>');
      });
      return links.length ? L('تقدر تتواصل معنا عبر:', 'You can reach us via:') + '<div class="as-chips">' + links.join('') + '</div>'
        : L('يمكنك التواصل معنا من صفحة <a class="as-link" href="#about">عنّي</a>.', 'You can contact us from the <a class="as-link" href="#about">About</a> page.');
    }
    if (has(q, ['غرفه العمليات', 'غرفة العمليات', 'ops room', 'الموظفين', 'فريق'])) {
      return L('غرفة العمليات صفحة تعرض فريق الذكاء الاصطناعي الذي يبحث ويكتب ويراجع ويصمم مقالات الموقع. <a class="as-link" href="#office">افتح غرفة العمليات</a>',
        'The Ops Room shows the AI team that researches, writes, reviews and designs the articles. <a class="as-link" href="#office">Open the Ops Room</a>');
    }
    if (has(q, ['اخر المقالات', 'آخر المقالات', 'احدث', 'أحدث', 'جديد', 'اخر مقال', 'latest', 'newest', 'recent'])) {
      var ps = st.posts.slice(0, 4);
      return ps.length ? L('أحدث المقالات على الموقع:', 'Latest articles:') + '<ul class="as-ul">' + ps.map(function (p) { return '<li>' + postLink(p) + '</li>'; }).join('') + '</ul>'
        : L('لا توجد مقالات بعد.', 'No articles yet.');
    }
    if (words <= 4 && has(q, ['من انتم', 'من أنتم', 'عن الموقع', 'شو الموقع', 'ما هو الموقع', 'تكنو فاكت', 'about', 'who are you', 'techno fact'])) {
      var ab = s['about_' + lang()] || s.about_ar || '';
      return (ab ? mdHTML(ab) : '') + '<p>' + L('عدد المقالات المنشورة حاليًا: ', 'Published articles: ') + st.posts.length + '</p>';
    }
    return null;
  }

  function answer(q) {
    var pre = intent(q); if (pre) return pre;
    var res = search(q);
    if (!res.length || res[0].s < 1.2 || (res[0].hit < Math.min(2, res[0].need))) {
      return L('لم أجد جوابًا واضحًا لهذا السؤال في مقالات الموقع حتى الآن. جرّب صياغة أخرى أو كلمات أبسط، أو تصفّح <a class="as-link" href="#blog">كل المقالات</a>.',
        'I could not find a clear answer in the site articles yet. Try other words, or browse <a class="as-link" href="#blog">all articles</a>.');
    }
    var top = res[0].c, html = '';
    html += '<div class="as-ans">' + mdHTML(bestPassage(top, q)) + '</div>';
    html += '<div class="as-src">' + L('المصدر: ', 'Source: ') + postLink(top.post, top.title) + (top.head ? ' <span class="as-sec">— ' + esc(top.head) + '</span>' : '') + '</div>';
    var seen = {}, more = []; seen[top.post.slug] = 1;
    res.slice(1).forEach(function (r) { if (more.length < 2 && !seen[r.c.post.slug] && r.s > res[0].s * 0.45) { seen[r.c.post.slug] = 1; more.push(r.c); } });
    if (more.length) html += '<div class="as-more">' + L('قد يفيدك أيضًا:', 'You may also like:') + '<ul class="as-ul">' + more.map(function (c) { return '<li>' + postLink(c.post, c.title) + '</li>'; }).join('') + '</ul></div>';
    return html;
  }

  /* ---------- UI ---------- */
  function css() {
    var s = document.createElement('style');
    s.textContent =
      '.as-fab{position:fixed;bottom:calc(22px + env(safe-area-inset-bottom));inset-inline-start:20px;z-index:70;height:52px;padding:0 18px 0 16px;border-radius:999px;border:none;' +
      'background:var(--a,#3b82f6);color:#fff;font:inherit;font-weight:700;font-size:15px;display:inline-flex;align-items:center;gap:9px;box-shadow:0 10px 30px rgba(0,0,0,.3);cursor:pointer;transition:transform .2s}' +
      '.as-fab:hover{transform:translateY(-2px)}.as-fab svg{width:22px;height:22px}' +
      '.as-fab.hide{transform:scale(.85);opacity:0;pointer-events:none}' +
      '.as-panel{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom));inset-inline-start:20px;z-index:80;width:min(400px,calc(100vw - 24px));height:min(600px,calc(100vh - 110px));' +
      'background:var(--card,#121b2e);color:var(--ink,#e8edf5);border:1px solid var(--line,#1e293b);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden;' +
      'transform:translateY(16px) scale(.98);opacity:0;pointer-events:none;transition:.22s ease}' +
      '.as-panel.open{transform:none;opacity:1;pointer-events:auto}' +
      '.as-h{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line,#1e293b);background:var(--card2,var(--card))}' +
      '.as-av{width:38px;height:38px;border-radius:11px;background:var(--a,#3b82f6);color:#fff;display:grid;place-items:center;flex:none}.as-av svg{width:20px;height:20px}' +
      '.as-h b{display:block;font-size:15.5px;line-height:1.3}.as-h small{color:var(--mut,#94a3b8);font-size:12.5px;display:flex;align-items:center;gap:6px}' +
      '.as-h small i{width:7px;height:7px;border-radius:50%;background:#22c55e}' +
      '.as-x{margin-inline-start:auto;width:34px;height:34px;border-radius:9px;border:1px solid var(--line,#1e293b);background:none;color:var(--mut,#94a3b8);font-size:16px;cursor:pointer}' +
      '.as-x:hover{color:var(--ink,#fff);border-color:var(--line2,#2b3a55)}' +
      '.as-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}' +
      '.as-m{max-width:88%;padding:11px 14px;border-radius:16px;font-size:14.5px;line-height:1.8;word-wrap:break-word}' +
      '.as-m p{margin:0 0 8px}.as-m p:last-child{margin:0}.as-m ul,.as-m ol{margin:4px 0 8px;padding-inline-start:20px}.as-m li{margin:2px 0}' +
      '.as-bot{align-self:flex-start;background:var(--bg2,#0f172a);border:1px solid var(--line,#1e293b);border-end-start-radius:6px}' +
      '.as-me{align-self:flex-end;background:var(--a,#3b82f6);color:#fff;border-end-end-radius:6px}' +
      '.as-link{color:var(--a,#3b82f6);font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}' +
      '.as-src{margin-top:10px;padding-top:9px;border-top:1px dashed var(--line2,#2b3a55);font-size:13px;color:var(--mut,#94a3b8)}.as-sec{color:var(--mut,#94a3b8)}' +
      '.as-more{margin-top:8px;font-size:13px;color:var(--mut,#94a3b8)}.as-ul{margin:4px 0 0;padding-inline-start:18px}' +
      '.as-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
      '.as-chips a,.as-sug button{display:inline-block;border:1px solid var(--line2,#2b3a55);background:transparent;color:var(--ink,#e8edf5);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;text-decoration:none;cursor:pointer;text-align:start;line-height:1.5}' +
      '.as-chips a:hover,.as-sug button:hover{border-color:var(--a,#3b82f6);color:var(--a,#3b82f6)}' +
      '.as-sug{display:flex;flex-wrap:wrap;gap:6px}' +
      '.as-typing{display:inline-flex;gap:4px}.as-typing i{width:6px;height:6px;border-radius:50%;background:var(--mut,#94a3b8);animation:asb 1s infinite}' +
      '.as-typing i:nth-child(2){animation-delay:.15s}.as-typing i:nth-child(3){animation-delay:.3s}@keyframes asb{50%{opacity:.25;transform:translateY(-3px)}}' +
      '.as-f{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line,#1e293b)}' +
      '.as-f input{flex:1;min-width:0;height:46px;border-radius:12px;border:1px solid var(--line2,#2b3a55);background:var(--bg2,#0f172a);color:var(--ink,#e8edf5);padding:0 14px;font:inherit;font-size:15px;outline:none}' +
      '.as-f input:focus{border-color:var(--a,#3b82f6)}' +
      '.as-f button{width:46px;height:46px;border-radius:12px;border:none;background:var(--a,#3b82f6);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none}.as-f button svg{width:20px;height:20px}' +
      '[dir=rtl] .as-f button svg{transform:scaleX(-1)}' +
      '.as-note{font-size:11.5px;color:var(--mut,#94a3b8);text-align:center;padding:0 12px 10px}' +
      '@media(max-width:560px){.as-panel{inset-inline:8px;bottom:8px;width:auto;height:calc(100dvh - 16px);border-radius:18px}.as-fab .as-lbl{display:none}.as-fab{width:54px;padding:0;justify-content:center}}';
    document.head.appendChild(s);
  }
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/></svg>';
  var BOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M10 17h4"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var fab, panel, log, input;
  function add(html, who) {
    var d = document.createElement('div'); d.className = 'as-m ' + (who === 'me' ? 'as-me' : 'as-bot');
    if (who === 'me') d.textContent = html; else d.innerHTML = html;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function suggestions() {
    var sug = [L('آخر المقالات', 'Latest articles')];
    st.posts.slice(0, 3).forEach(function (p) { var t = tr(p, 'title').split(/[:：؟?]/)[0].trim(); if (t && t.length < 60) sug.push(t); });
    sug.push(L('كيف أتواصل معكم؟', 'How can I contact you?'));
    return '<div class="as-sug">' + sug.map(function (s) { return '<button type="button">' + esc(s) + '</button>'; }).join('') + '</div>';
  }
  function welcome() {
    log.innerHTML = '';
    add(L('أهلًا بك في ' + esc(siteName()) + '! أنا المساعد الذكي للموقع. اسألني أي سؤال تقني وسأبحث لك عن الجواب داخل مقالاتنا.',
      'Welcome to ' + esc(siteName()) + '! I am the site assistant. Ask any tech question and I will find the answer in our articles.'), 'bot');
    var s = add(suggestions(), 'bot'); s.style.background = 'transparent'; s.style.border = 'none'; s.style.padding = '0';
    s.querySelectorAll('button').forEach(function (b) { b.onclick = function () { ask(b.textContent); }; });
  }
  function ask(q) {
    q = String(q || '').trim(); if (!q) return;
    add(q, 'me'); input.value = '';
    var t = add('<span class="as-typing"><i></i><i></i><i></i></span>', 'bot');
    load().then(function () {
      setTimeout(function () {
        t.innerHTML = answer(q);
        t.querySelectorAll('a[href^="#"]').forEach(function (a) { a.addEventListener('click', function () { if (window.innerWidth < 560) toggle(false); }); });
        log.scrollTop = log.scrollHeight;
      }, 350);
    });
  }
  function toggle(open) {
    st.open = open == null ? !st.open : open;
    panel.classList.toggle('open', st.open); fab.classList.toggle('hide', st.open);
    fab.setAttribute('aria-expanded', st.open ? 'true' : 'false');
    if (st.open) {
      panel.querySelector('.as-h b').textContent = L('مساعد ' + siteName(), siteName() + ' Assistant');
      input.placeholder = L('اكتب سؤالك هنا…', 'Type your question…');
      if (!log.children.length || log.dataset.lang !== lang()) { log.dataset.lang = lang(); load().then(welcome); welcome(); }
      setTimeout(function () { input.focus(); }, 200);
    }
  }
  function init() {
    css();
    fab = document.createElement('button'); fab.className = 'as-fab'; fab.type = 'button'; fab.setAttribute('aria-label', L('المساعد', 'Assistant'));
    fab.innerHTML = ICON + '<span class="as-lbl">' + L('اسأل المساعد', 'Ask the assistant') + '</span>';
    panel = document.createElement('div'); panel.className = 'as-panel'; panel.setAttribute('role', 'dialog');
    panel.innerHTML = '<div class="as-h"><span class="as-av">' + BOT + '</span><div><b></b><small><i></i>' + L('يجيب من مقالات الموقع', 'Answers from site articles') + '</small></div>' +
      '<button class="as-x" type="button" aria-label="close">✕</button></div><div class="as-log" aria-live="polite"></div>' +
      '<form class="as-f"><input type="text" autocomplete="off" maxlength="300"><button type="submit" aria-label="send">' + SEND + '</button></form>' +
      '<div class="as-note">' + L('الإجابات مأخوذة من مقالات الموقع — راجع المقال للتفاصيل.', 'Answers come from site articles — open the article for details.') + '</div>';
    document.body.appendChild(fab); document.body.appendChild(panel);
    log = panel.querySelector('.as-log'); input = panel.querySelector('input');
    fab.onclick = function () { toggle(true); };
    panel.querySelector('.as-x').onclick = function () { toggle(false); };
    panel.querySelector('form').onsubmit = function (e) { e.preventDefault(); ask(input.value); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.open) toggle(false); });
    // keep labels in sync when the visitor switches language
    new MutationObserver(function () {
      fab.querySelector('.as-lbl').textContent = L('اسأل المساعد', 'Ask the assistant');
      panel.querySelector('.as-note').textContent = L('الإجابات مأخوذة من مقالات الموقع — راجع المقال للتفاصيل.', 'Answers come from site articles — open the article for details.');
      panel.querySelector('.as-h small').innerHTML = '<i></i>' + L('يجيب من مقالات الموقع', 'Answers from site articles');
      if (st.open) toggle(true);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    // warm the index in the background after the page settles
    setTimeout(load, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
