/* Screen fit, part 2: when the page is scaled down to about 80%, small text (labels, captions, quick links)
   grows by up to 2px so it stays comfortable to read. Body text (16px) is not touched. */
(function () {
  var z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  if (z > 0.85) return;
  var target = 10.8 / z;
  var els = document.body.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.closest('svg')) continue;
    var fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs && fs < target) el.style.fontSize = Math.min(target, fs + 2).toFixed(1) + 'px';
  }
})();
