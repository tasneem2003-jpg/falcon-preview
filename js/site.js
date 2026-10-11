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
