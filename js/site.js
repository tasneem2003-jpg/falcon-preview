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
    var st = { type: 'all', grade: 'all', day: 'all' };

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
        var ok = (st.type === 'all' || it.getAttribute('data-type') === st.type) && inGrade(it) &&
          (st.day === 'all' || it.getAttribute('data-day') === st.day);
        it.hidden = !ok;
        if (ok) shown++;
      });
      var count = root.querySelector('[data-count]');
      if (count) count.textContent = shown === items.length ? 'Showing all ' + items.length + ' clubs' : 'Showing ' + shown + ' of ' + items.length + ' clubs';
      var all = st.type === 'all' && st.grade === 'all' && st.day === 'all';
      root.querySelectorAll('.reset[data-reset]').forEach(function (b) { b.hidden = all; });
      root.querySelectorAll('[data-empty]').forEach(function (e) { e.hidden = shown > 0; });

      root.querySelectorAll('[data-wrow]').forEach(function (row) {
        var any = false;
        row.querySelectorAll('[data-wgrp]').forEach(function (g) {
          var vis = 0;
          g.querySelectorAll('[data-wclub]').forEach(function (c) { c.hidden = !inGrade(c); if (!c.hidden) vis++; });
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
        st.type = st.grade = st.day = 'all';
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
