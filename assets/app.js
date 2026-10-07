(function () {
  'use strict';

  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    }
  };

  var root = document.documentElement;
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.toc li a'));
  var topics = Array.prototype.slice.call(document.querySelectorAll('section.topic'));
  var linkById = {};
  navLinks.forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a; });

  /* ---------- Theme ---------- */
  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('cg-theme', next); } catch (e) { /* ignore */ }
  });

  /* ---------- Mobile sidebar ---------- */
  function setMenu(open) {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { setMenu(!sidebar.classList.contains('open')); });
  scrim.addEventListener('click', function () { setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) setMenu(false);
  });
  navLinks.forEach(function (a) {
    a.addEventListener('click', function () { if (window.innerWidth <= 1000) setMenu(false); });
  });

  /* ---------- Read tracking ---------- */
  var readSet = {};
  store.get('cg-read', []).forEach(function (id) { readSet[id] = true; });
  var total = topics.length;
  var progressText = document.getElementById('progressText');
  var progressBar = document.getElementById('progressBar');
  var checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function renderProgress() {
    var n = topics.filter(function (s) { return readSet[s.id]; }).length;
    progressText.textContent = n + '/' + total;
    progressBar.style.width = (total ? (n / total) * 100 : 0) + '%';
  }
  function renderRead(id, btn) {
    var on = !!readSet[id];
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = on ? checkSvg + 'Đã đọc' : 'Đánh dấu đã đọc';
    var a = linkById[id];
    if (a) a.parentNode.classList.toggle('is-read', on);
  }

  topics.forEach(function (s) {
    var h2 = s.querySelector('h2');
    if (!h2) return;
    var anchor = document.createElement('a');
    anchor.className = 'anchor';
    anchor.href = '#' + s.id;
    anchor.setAttribute('aria-label', 'Liên kết tới mục này');
    anchor.textContent = '#';
    h2.appendChild(anchor);

    var head = document.createElement('div');
    head.className = 'topic-head';
    h2.parentNode.insertBefore(head, h2);
    head.appendChild(h2);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'read-btn';
    head.appendChild(btn);
    renderRead(s.id, btn);
    btn.addEventListener('click', function () {
      if (readSet[s.id]) delete readSet[s.id]; else readSet[s.id] = true;
      store.set('cg-read', Object.keys(readSet));
      renderRead(s.id, btn);
      renderProgress();
    });
  });
  renderProgress();

  /* ---------- Active nav item ---------- */
  var current = null;
  function setActive(id) {
    if (current === id) return;
    if (current && linkById[current]) linkById[current].classList.remove('is-active');
    current = id;
    var a = linkById[id];
    if (!a) return;
    a.classList.add('is-active');
    var r = a.getBoundingClientRect();
    var sr = sidebar.getBoundingClientRect();
    if (r.top < sr.top + 80 || r.bottom > sr.bottom - 40) {
      sidebar.scrollTop += r.top - sr.top - sr.height / 3;
    }
  }
  if ('IntersectionObserver' in window) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      for (var i = 0; i < topics.length; i++) {
        if (visible[topics[i].id]) { setActive(topics[i].id); return; }
      }
    }, { rootMargin: '-64px 0px -60% 0px', threshold: 0 });
    topics.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Search ---------- */
  function norm(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  }
  var index = topics.map(function (s) {
    return {
      id: s.id,
      title: norm(s.getAttribute('data-title') + ' ' + (s.querySelector('h2') ? s.querySelector('h2').textContent : '')),
      body: norm(s.textContent)
    };
  });
  var searchInput = document.getElementById('search');
  var searchStatus = document.getElementById('searchStatus');
  var groups = Array.prototype.slice.call(document.querySelectorAll('.nav-group'));
  var timer = null;

  function runSearch() {
    var q = norm(searchInput.value.trim());
    var terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) {
      navLinks.forEach(function (a) { a.parentNode.classList.remove('is-hidden'); });
      groups.forEach(function (g) { g.classList.remove('is-hidden'); });
      searchStatus.textContent = '';
      return [];
    }
    var hits = index.filter(function (it) {
      return terms.every(function (t) { return it.body.indexOf(t) !== -1; });
    });
    hits.sort(function (a, b) {
      var at = terms.every(function (t) { return a.title.indexOf(t) !== -1; }) ? 0 : 1;
      var bt = terms.every(function (t) { return b.title.indexOf(t) !== -1; }) ? 0 : 1;
      return at - bt;
    });
    var hitSet = {};
    hits.forEach(function (h) { hitSet[h.id] = true; });
    navLinks.forEach(function (a) {
      a.parentNode.classList.toggle('is-hidden', !hitSet[a.getAttribute('href').slice(1)]);
    });
    groups.forEach(function (g) {
      g.classList.toggle('is-hidden', !g.querySelector('li:not(.is-hidden)'));
    });
    searchStatus.textContent = hits.length
      ? hits.length + ' chủ đề khớp · Enter để mở chủ đề đầu tiên'
      : 'Không tìm thấy chủ đề phù hợp';
    return hits;
  }
  searchInput.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 120);
  });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var hits = runSearch();
      if (hits.length) {
        location.hash = '#' + hits[0].id;
        if (window.innerWidth <= 1000) setMenu(false);
      }
    } else if (e.key === 'Escape') {
      searchInput.value = '';
      runSearch();
    }
  });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      if (window.innerWidth <= 1000) setMenu(true);
      searchInput.focus();
    }
  });

  /* ---------- Code blocks ---------- */
  var langNames = { kotlin: 'Kotlin', toml: 'TOML', markup: 'XML', xml: 'XML', bash: 'Shell', groovy: 'Groovy', java: 'Java', json: 'JSON' };
  var copySvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }

  Array.prototype.slice.call(document.querySelectorAll('.content pre > code')).forEach(function (code) {
    var pre = code.parentNode;
    var m = /language-(\w+)/.exec(code.className);
    var lang = m ? m[1] : '';
    var wrap = document.createElement('div');
    wrap.className = 'code-block';
    var head = document.createElement('div');
    head.className = 'code-head';
    var label = document.createElement('span');
    label.textContent = langNames[lang] || lang || 'Code';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.innerHTML = copySvg + 'Chép';
    btn.addEventListener('click', function () {
      copyText(code.textContent).then(function () {
        btn.innerHTML = checkSvg + 'Đã chép';
        setTimeout(function () { btn.innerHTML = copySvg + 'Chép'; }, 1600);
      }, function () {
        btn.textContent = 'Không chép được';
      });
    });
    head.appendChild(label);
    head.appendChild(btn);
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(head);
    wrap.appendChild(pre);
  });

  /* ---------- Back to top ---------- */
  var toTop = document.getElementById('toTop');
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      toTop.hidden = window.scrollY < 700;
      ticking = false;
    });
  }, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();
