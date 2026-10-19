/* Falcon Academy static site: highlights the current section in "On this page" menus while scrolling. */
(function () {
  var navs = document.querySelectorAll('nav.jump, nav.toc');
  if (!navs.length) return;

  var groups = [];
  navs.forEach(function (nav) {
    var links = Array.prototype.filter.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    });
    if (links.length) groups.push({ onClass: nav.classList.contains('jump') ? 'jump-on' : 'on', links: links });
  });

  function setActive(group, id) {
    group.links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle(group.onClass, on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }

  function update() {
    var line = window.innerHeight * 0.3;
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    groups.forEach(function (g) {
      var current = g.links[0].getAttribute('href').slice(1);
      g.links.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        if (document.getElementById(id).getBoundingClientRect().top <= line) current = id;
      });
      if (atBottom) current = g.links[g.links.length - 1].getAttribute('href').slice(1);
      setActive(g, current);
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* After School clubs: area, grade and day filters, and the week / area view switch. */
(function () {
  var GRADES = { all: null, k5: [0, 5], g68: [6, 8], g911: [9, 11] };

  document.querySelectorAll('[data-filter-root="clubs"]').forEach(function (root) {
    var st = { type: 'all', grade: 'all', day: 'all', campus: 'all' };
    function inCampus(el) { return st.campus === 'all' || el.getAttribute('data-campus') === st.campus; }

    function inGrade(el) {
      var r = GRADES[st.grade];
      if (!r) return true;
      var g = (el.getAttribute('data-g') || '0-99').split('-').map(Number);
      return g[0] <= r[1] && g[1] >= r[0];
    }

    function apply() {
      root.querySelectorAll('[data-f]').forEach(function (b) {
        var on = b.getAttribute('data-v') === st[b.getAttribute('data-f')];
        b.classList.toggle(b.classList.contains('act-btn') ? 'act-on' : 'chip-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      var items = root.querySelectorAll('[data-item]'), shown = 0;
      items.forEach(function (it) {
        var ok = (st.type === 'all' || it.getAttribute('data-type') === st.type) && inGrade(it) && inCampus(it) &&
          (st.day === 'all' || it.getAttribute('data-day') === st.day);
        it.hidden = !ok;
        if (ok) shown++;
      });
      var count = root.querySelector('[data-count]');
      if (count) count.textContent = shown === items.length ? 'Showing all ' + items.length + ' clubs' : 'Showing ' + shown + ' of ' + items.length + ' clubs';
      var all = st.type === 'all' && st.grade === 'all' && st.day === 'all' && st.campus === 'all';
      root.querySelectorAll('.reset[data-reset]').forEach(function (b) { b.hidden = all; });
      root.querySelectorAll('[data-empty]').forEach(function (e) { e.hidden = shown > 0; });

      root.querySelectorAll('[data-wrow]').forEach(function (row) {
        var any = false;
        row.querySelectorAll('[data-wgrp]').forEach(function (g) {
          var vis = 0;
          g.querySelectorAll('[data-wclub]').forEach(function (c) { c.hidden = !inGrade(c) || !inCampus(c); if (!c.hidden) vis++; });
          g.hidden = vis === 0;
          if (vis) any = true;
        });
        var none = row.querySelector('[data-wnone]');
        if (none) none.hidden = any;
        else row.hidden = !any;
      });
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]');
      if (b) {
        var f = b.getAttribute('data-f'), v = b.getAttribute('data-v');
        st[f] = (f === 'type' && st.type === v) ? 'all' : v;
        apply();
        return;
      }
      if (e.target.closest('[data-reset]')) {
        st.type = st.grade = st.day = st.campus = 'all';
        apply();
        return;
      }
      var view = e.target.closest('[data-view]');
      if (view) {
        var name = view.getAttribute('data-view');
        root.querySelectorAll('[data-view]').forEach(function (x) {
          var on = x === view;
          x.classList.toggle('seg-on', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        root.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
      }
    });
  });
})();

/* Filters, tabs, search, sorting, "show more" and paging on the static pages.
   Pages mark their parts with data attributes; the canvas renders every item, so here we only show and hide.
   Root [data-fx]. Controls: [data-f][data-v] buttons (data-toggle: click again to clear; data-on: class when on;
   data-clears: other filters to reset; data-keep: "show all" leaves it alone). [data-step=f][data-by][data-range] moves f
   through a list; [data-disclose=id] opens and closes a menu, and picking inside a [data-menu] closes it,
   input[data-f] (search), select[data-f] (filter) and select[data-sort].
   Items [data-item] list their values in data-k-<filter> ("any" always matches) and searchable text in data-text.
   [data-show="filter=value"] shows a part for one value. Scopes [data-scope] hold their own [data-count],
   [data-empty], [data-more] (data-limit on the scope) and [data-pager] (data-per on the scope). [data-group] hides when empty. */
(function () {
  var css = document.createElement('style');
  css.textContent = '[hidden]{display:none!important}';
  document.head.appendChild(css);
  document.querySelectorAll('[data-fx]').forEach(function (root) {
    var st = {}, def = {}, extra = {};
    var controls = root.querySelectorAll('[data-f]');

    function isOn(el) {
      return el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' ||
        el.classList.contains(el.getAttribute('data-on') || 'chip-on');
    }
    controls.forEach(function (c) {
      var f = c.getAttribute('data-f');
      if (c.tagName === 'INPUT') { st[f] = def[f] = ''; return; }
      if (c.tagName === 'SELECT') { st[f] = def[f] = c.value; return; }
      if (!(f in def)) def[f] = 'all';
      if (isOn(c) && !c.hasAttribute('data-toggle')) def[f] = c.getAttribute('data-v');
      if (isOn(c) && c.hasAttribute('data-toggle')) def[f] = 'all';
    });
    (root.getAttribute('data-init') || '').split(';').forEach(function (kv) {
      if (kv) { kv = kv.split('='); def[kv[0]] = kv[1]; }
    });
    Object.keys(def).forEach(function (k) { st[k] = def[k]; });
    var keep = [];
    controls.forEach(function (c) { if (c.hasAttribute('data-keep')) keep.push(c.getAttribute('data-f')); });

    function scopes() {
      var s = [].slice.call(root.querySelectorAll('[data-scope]'));
      return s.length ? s : [root];
    }
    function own(scope, sel) {
      return [].filter.call(scope.querySelectorAll(sel), function (el) {
        var sc = el.closest('[data-scope]');
        return scope === root ? true : sc === scope;
      });
    }
    function matches(it) {
      for (var f in st) {
        if (f === 'sort') continue;
        var v = st[f];
        if (typeof v === 'string' && controlType(f) === 'INPUT') {
          if (v && (it.getAttribute('data-text') || it.textContent).toLowerCase().indexOf(v.toLowerCase().trim()) < 0) return false;
          continue;
        }
        if (v === 'all' || v === '' || v == null) continue;
        var k = it.getAttribute('data-k-' + f);
        if (k == null) continue;
        var list = k.split(' ');
        if (list.indexOf(v) < 0 && list.indexOf('any') < 0) return false;
      }
      return true;
    }
    var types = {};
    controls.forEach(function (c) { types[c.getAttribute('data-f')] = c.tagName; });
    function controlType(f) { return types[f]; }

    function sortItems() {
      var sel = root.querySelector('select[data-sort]');
      if (!sel) return;
      var mode = sel.value, parents = [];
      root.querySelectorAll('[data-item]').forEach(function (it) { if (parents.indexOf(it.parentNode) < 0) parents.push(it.parentNode); });
      parents.forEach(function (p) {
        var items = [].filter.call(p.children, function (x) { return x.hasAttribute('data-item'); });
        items.sort(function (a, b) {
          var ia = +a.getAttribute('data-i'), ib = +b.getAttribute('data-i');
          var pa = +a.getAttribute('data-price'), pb = +b.getAttribute('data-price');
          if (mode === 'low') return pa - pb || ia - ib;
          if (mode === 'high') return pb - pa || ia - ib;
          if (mode === 'latest') return ib - ia;
          return ia - ib;
        });
        items.forEach(function (x) { p.appendChild(x); });
      });
    }

    function fill(tpl, o) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }

    function apply() {
      controls.forEach(function (c) {
        var f = c.getAttribute('data-f');
        if (c.tagName === 'INPUT') { if (c.value !== st[f]) c.value = st[f]; return; }
        if (c.tagName === 'SELECT') { c.value = st[f]; return; }
        var on = st[f] === c.getAttribute('data-v');
        c.classList.toggle(c.getAttribute('data-on') || 'chip-on', on);
        if (c.hasAttribute('aria-pressed')) c.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (c.hasAttribute('aria-selected')) c.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      root.querySelectorAll('[data-show]').forEach(function (el) {
        var ok = el.getAttribute('data-show').split('|').some(function (cond) {
          var kv = cond.split('=');
          return kv[1].split(',').indexOf(st[kv[0]]) >= 0;
        });
        el.hidden = !ok;
      });
      sortItems();
      scopes().forEach(function (scope) {
        var items = own(scope, '[data-item]');
        var hit = items.filter(matches);
        var key = scope.getAttribute('data-scope') || 'root';
        var per = +scope.getAttribute('data-per') || 0, lim = +scope.getAttribute('data-limit') || 0;
        var ex = extra[key] || (extra[key] = { page: 1, shown: lim });
        var from = 0, to = hit.length;
        if (per) {
          var pages = Math.max(1, Math.ceil(hit.length / per));
          ex.page = Math.min(ex.page, pages);
          from = (ex.page - 1) * per; to = Math.min(hit.length, from + per);
        } else if (lim) {
          to = Math.min(hit.length, ex.shown);
        }
        items.forEach(function (it) { it.hidden = true; });
        hit.forEach(function (it, i) { it.hidden = i < from || i >= to; });
        own(scope, '[data-group]').forEach(function (g) {
          g.hidden = ![].some.call(g.querySelectorAll('[data-item]'), function (x) { return !x.hidden; });
        });
        var o = { n: hit.length, total: items.length, from: hit.length ? from + 1 : 0, to: to, k: Math.min(lim, hit.length - to) };
        own(scope, '[data-count]').forEach(function (c) {
          var t = o.n === o.total && c.getAttribute('data-tpl-all') ? c.getAttribute('data-tpl-all') : c.getAttribute('data-tpl');
          if (t) c.textContent = fill(t, o);
        });
        own(scope, '[data-empty]').forEach(function (e) { e.hidden = hit.length > 0; });
        own(scope, '[data-more]').forEach(function (b) {
          b.hidden = to >= hit.length;
          if (b.getAttribute('data-tpl')) b.textContent = fill(b.getAttribute('data-tpl'), o);
        });
        own(scope, '[data-pager]').forEach(function (pg) {
          var pages = Math.max(1, Math.ceil(hit.length / per));
          pg.hidden = pages <= 1;
          var tpl = pg.querySelector('[data-pg]');
          if (!tpl) return;
          var nums = pg.querySelectorAll('[data-pg]');
          for (var i = nums.length - 1; i > 0; i--) nums[i].remove();
          var anchor = tpl;
          for (var p = 1; p <= pages; p++) {
            var b = p === 1 ? tpl : tpl.cloneNode(true);
            b.textContent = p;
            b.setAttribute('data-pg', p);
            b.classList.toggle('pg-on', p === ex.page);
            if (p === ex.page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
            b.setAttribute('aria-label', 'Page ' + p + ' of ' + pages);
            if (p > 1) { anchor.after(b); anchor = b; }
          }
          var prev = pg.querySelector('[data-pg-prev]'), next = pg.querySelector('[data-pg-next]');
          if (prev) { prev.classList.toggle('pg-off', ex.page === 1); prev.setAttribute('aria-disabled', ex.page === 1 ? 'true' : 'false'); }
          if (next) { next.classList.toggle('pg-off', ex.page === pages); next.setAttribute('aria-disabled', ex.page === pages ? 'true' : 'false'); }
        });
      });
      var dirty = Object.keys(def).some(function (k) { return k !== 'sort' && st[k] !== def[k]; });
      root.querySelectorAll('[data-reset][data-reset-auto]').forEach(function (b) { b.hidden = !dirty; });
    }

    function resetPaging() {
      scopes().forEach(function (scope) {
        var key = scope.getAttribute('data-scope') || 'root';
        extra[key] = { page: 1, shown: +scope.getAttribute('data-limit') || 0 };
      });
    }

    root.addEventListener('click', function (e) {
      var dis = e.target.closest('[data-disclose]');
      if (dis) {
        var box = document.getElementById(dis.getAttribute('data-disclose'));
        if (box) { box.hidden = !box.hidden; dis.setAttribute('aria-expanded', box.hidden ? 'false' : 'true'); }
        return;
      }
      var step = e.target.closest('[data-step]');
      if (step) {
        var sf = step.getAttribute('data-step'), range = step.getAttribute('data-range').split(' ');
        var at = range.indexOf(st[sf]) + (+step.getAttribute('data-by'));
        st[sf] = range[Math.max(0, Math.min(range.length - 1, at))];
        resetPaging(); apply(); return;
      }
      var c = e.target.closest('[data-f]');
      if (c && root.contains(c) && c.tagName !== 'INPUT' && c.tagName !== 'SELECT') {
        var f = c.getAttribute('data-f'), v = c.getAttribute('data-v');
        st[f] = c.hasAttribute('data-toggle') && st[f] === v ? 'all' : v;
        (c.getAttribute('data-clears') || '').split(' ').forEach(function (k) { if (k in def) st[k] = def[k]; });
        var menu = c.closest('[data-menu]');
        if (menu) menu.hidden = true;
        resetPaging(); apply();
        if (c.tagName === 'A' && c.getAttribute('href') && c.getAttribute('href').charAt(0) !== '#') e.preventDefault();
        return;
      }
      if (e.target.closest('[data-reset]')) {
        Object.keys(def).forEach(function (k) { if (k !== 'sort' && keep.indexOf(k) < 0) st[k] = def[k]; });
        resetPaging(); apply(); return;
      }
      var more = e.target.closest('[data-more]');
      if (more) {
        var sc = more.closest('[data-scope]') || root, key = sc.getAttribute('data-scope') || 'root';
        extra[key].shown += +sc.getAttribute('data-limit') || 12; apply(); return;
      }
      var pg = e.target.closest('[data-pg],[data-pg-prev],[data-pg-next]');
      if (pg) {
        var sc2 = pg.closest('[data-scope]') || root, key2 = sc2.getAttribute('data-scope') || 'root';
        var ex = extra[key2];
        if (pg.hasAttribute('data-pg')) ex.page = +pg.getAttribute('data-pg');
        else if (pg.hasAttribute('data-pg-prev')) ex.page = Math.max(1, ex.page - 1);
        else ex.page += 1;
        apply();
        sc2.scrollIntoView({ block: 'start' });
      }
    });
    root.addEventListener('input', function (e) {
      var c = e.target;
      if (c.matches && c.matches('input[data-f]')) { st[c.getAttribute('data-f')] = c.value; resetPaging(); apply(); }
    });
    root.addEventListener('change', function (e) {
      var c = e.target;
      if (c.matches && c.matches('select[data-f]')) { st[c.getAttribute('data-f')] = c.value; resetPaging(); apply(); }
      if (c.matches && c.matches('select[data-sort]')) apply();
    });

    resetPaging();
    apply();
  });
})();

/* Tuition calculator: children and payment plan. Same numbers as the design. */
(function () {
  var root = document.querySelector('[data-calc="tuition"]');
  if (!root) return;
  var st = { kids: 2, plan: 'monthly' };
  var on = root.querySelector('[data-kids][aria-pressed="true"]'); if (on) st.kids = +on.getAttribute('data-kids');
  on = root.querySelector('[data-plan][aria-pressed="true"]'); if (on) st.plan = on.getAttribute('data-plan');
  var lineTpl = root.querySelector('[data-lines] .ln');
  function fmt(v) { return '$' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function line(label, extra, value) {
    var p = lineTpl.cloneNode(true), spans = p.querySelectorAll(':scope > span');
    spans[0].innerHTML = '';
    spans[0].appendChild(document.createTextNode(label));
    var ex = document.createElement('span'); ex.style.display = 'inline-block'; ex.textContent = extra;
    spans[0].appendChild(ex);
    spans[1].textContent = value;
    return p;
  }
  function apply() {
    root.querySelectorAll('[data-kids]').forEach(function (b) {
      var x = +b.getAttribute('data-kids') === st.kids;
      b.classList.toggle('pill-on', x); b.setAttribute('aria-pressed', x ? 'true' : 'false');
    });
    root.querySelectorAll('[data-plan]').forEach(function (b) {
      var x = b.getAttribute('data-plan') === st.plan;
      b.classList.toggle('pill-on', x); b.setAttribute('aria-pressed', x ? 'true' : 'false');
    });
    var n = st.kids, tuition = 0, box = root.querySelector('[data-lines]');
    box.innerHTML = '';
    for (var k = 1; k <= n; k++) {
      var t = k === 1 ? 13350 : 12900;
      tuition += t;
      box.appendChild(line('Child ' + k + ' tuition ', k === 1 ? '' : '(−$450 sibling)', fmt(t)));
    }
    var disc = st.plan === 'full' ? Math.ceil((tuition * 5 - 50) / 100) : 0;
    if (disc) box.appendChild(line('Pay-in-full discount ', '(5% of tuition)', '−' + fmt(disc)));
    box.appendChild(line('Books & technology ', '× ' + n, fmt(600 * n)));
    var total = tuition - disc + 600 * n;
    var plans = {
      monthly: [total / 10, 'per month · Aug 15 – May 15'],
      two: [total / 2, 'per payment · Aug 15 & Jan 15'],
      full: [total, 'once · by Aug 1']
    }[st.plan];
    root.querySelector('[data-amount]').textContent = fmt(Math.round(plans[0]));
    root.querySelector('[data-unit]').textContent = plans[1];
    root.querySelector('[data-total]').textContent = fmt(total);
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-kids],[data-plan]');
    if (!b) return;
    if (b.hasAttribute('data-kids')) st.kids = +b.getAttribute('data-kids'); else st.plan = b.getAttribute('data-plan');
    apply();
  });
})();

/* Question lists: one answer open at a time. */
(function () {
  document.querySelectorAll('[data-faq]').forEach(function (item) {
    var btn = item.querySelector('button[aria-expanded]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      item.parentNode.querySelectorAll('[data-faq]').forEach(function (other) {
        var b = other.querySelector('button[aria-expanded]'), a = b.closest('h3').nextElementSibling;
        var me = other === item && open;
        b.setAttribute('aria-expanded', me ? 'true' : 'false');
        if (a) a.hidden = !me;
        other.style.border = me ? '1.5px solid #1A2740' : '1px solid #DCE2EB';
        var bar = b.querySelectorAll('svg path')[1];
        if (bar) bar.style.opacity = me ? '0' : '1';
      });
    });
  });
})();

/* Falcon Academy static site: calm entrance motion. The first section (hero) settles in on load; other blocks fade up as they scroll into view, cards one after another. Works in every browser; off for reduced motion. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var html = document.documentElement;
  var SKIP = 'header, footer, nav, .fw, .mx, [hidden]';
  var picked = [];

  function css(el) { return window.getComputedStyle(el); }
  function skip(el) {
    if (el.matches(SKIP) || el.closest('header, footer')) return true;
    var c = css(el);
    if (c.display === 'none' || c.position === 'fixed' || c.position === 'sticky') return true;
    return !!el.querySelector('[style*="sticky"], .jump, .subtabs');
  }
  function mark(el, delay) {
    if (skip(el) || picked.indexOf(el) > -1) return;
    el.style.setProperty('--rd', delay + 'ms');
    el.classList.add('rv');
    picked.push(el);
  }
  function isGroup(el) {
    var kids = el.children;
    if (kids.length < 2) return false;
    var d = css(el).display;
    if (d.indexOf('grid') < 0 && d.indexOf('flex') < 0) return false;
    if (css(el).flexDirection === 'column' && d.indexOf('flex') > -1) return false;
    if (css(el).overflowX === 'auto' || css(el).overflowX === 'scroll') return false;
    return true;
  }

  var sections = Array.prototype.filter.call(document.querySelectorAll('section'), function (s) {
    return !s.closest('header, footer') && !s.parentElement.closest('section');
  });
  if (!sections.length) return;

  // 1. Hero: the text settles in line by line, the photo eases out of a slight zoom
  var hero = sections[0];
  var h1 = hero.querySelector('h1');
  if (h1) {
    var block = h1.parentElement;
    Array.prototype.forEach.call(block.children, function (el, i) {
      if (el.tagName !== 'INPUT' && el.tagName !== 'STYLE') mark(el, 80 + Math.min(i, 6) * 110);
    });
  }
  Array.prototype.forEach.call(hero.querySelectorAll('img'), function (img) {
    var p = img.parentElement, ov = css(p).overflow;
    if (img.getBoundingClientRect().width >= window.innerWidth * 0.4 && (ov === 'hidden' || ov === 'clip') && css(img).animationName === 'none')
      img.classList.add('rv-kb');
  });

  // 2. Every other section: its blocks fade up; rows of cards come in one after another
  sections.slice(1).forEach(function (s) {
    var wrap = s.querySelector(':scope > .wrap') || s;
    Array.prototype.forEach.call(wrap.children, function (el) {
      if (el.tagName === 'STYLE' || el.tagName === 'INPUT' || el.tagName === 'SCRIPT') return;
      if (isGroup(el)) {
        var n = 0;
        Array.prototype.forEach.call(el.children, function (k) {
          if (k.tagName === 'STYLE' || k.tagName === 'INPUT') return;
          mark(k, Math.min(n++, 5) * 90);
        });
      } else {
        mark(el, 0);
      }
    });
  });

  html.classList.add('mo');

  // 3. Reveal on entry, then remove the classes so hover effects and fixed overlays behave as before
  function show(el) {
    var i = picked.indexOf(el);
    if (i < 0) return;
    picked.splice(i, 1);
    io.unobserve(el);
    el.classList.add('in');
    var wait = 1000 + (parseInt(el.style.getPropertyValue('--rd'), 10) || 0);
    setTimeout(function () {
      el.classList.remove('rv', 'in');
      el.style.removeProperty('--rd');
    }, wait);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  picked.forEach(function (el) { io.observe(el); });

  // Safety net: anything that has reached (or passed) the screen is shown, even if the observer missed it
  var ticking = false;
  function sweep() {
    ticking = false;
    var line = window.innerHeight * 0.95;
    picked.slice().forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < line && (r.width || r.height)) show(el);
    });
    if (!picked.length) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.removeEventListener('click', onScroll); document.removeEventListener('change', onScroll); }
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(sweep); setTimeout(sweep, 400); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('click', onScroll);
  document.addEventListener('change', onScroll);
  setTimeout(sweep, 600);
})();
