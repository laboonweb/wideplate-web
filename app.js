/* Wideplate — vanilla interactions (no framework). */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Hero slideshow ---- */
  (function hero() {
    var slides = $$('.wl-slide');
    var bars = $$('.wl-bar');
    if (!slides.length) return;
    var n = slides.length, cur = 0, timer = null;

    function paint(i) {
      cur = i;
      slides.forEach(function (s, k) { s.style.opacity = k === i ? '1' : '0'; });
      bars.forEach(function (b, k) {
        var fill = $('.wl-bar-fill', b);
        if (!fill) return;
        fill.style.animation = 'none';
        // force reflow so the animation restarts on the active bar
        void fill.offsetWidth;
        if (k === i) {
          fill.style.transform = 'scaleX(0)';
          fill.style.animation = reduced ? 'wpfill 0.01s linear both' : 'wpfill 6s linear both';
        } else {
          fill.style.transform = 'scaleX(0)';
        }
      });
    }
    function next() { paint((cur + 1) % n); }
    function start() { if (timer) clearInterval(timer); if (!reduced) timer = setInterval(next, 6000); }

    bars.forEach(function (b) {
      b.addEventListener('click', function () { paint(+b.getAttribute('data-bar')); start(); });
    });
    paint(0);
    start();
  })();

  /* ---- Drag-to-scroll (mouse) for gallery + chips, with inertia ---- */
  (function drag() {
    $$('[data-gallery], [data-chips]').forEach(function (g) {
      var down = false, startX = 0, startScroll = 0, moved = false;
      var lastX = 0, lastT = 0, vel = 0, raf = 0;
      function stopInertia() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      g.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') return;
        stopInertia();
        down = true; moved = false; startX = e.clientX; startScroll = g.scrollLeft;
        lastX = e.clientX; lastT = performance.now(); vel = 0;
        g.style.cursor = 'grabbing'; g.style.scrollSnapType = 'none';
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        g.scrollLeft = startScroll - dx;
        var now = performance.now(), dt = now - lastT;
        if (dt > 0) { vel = (lastX - e.clientX) / dt; lastX = e.clientX; lastT = now; }
      });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false; g.style.cursor = 'grab';
        var v = vel * 16;
        function glide() {
          if (Math.abs(v) < 0.4) { g.style.scrollSnapType = ''; raf = 0; return; }
          g.scrollLeft += v; v *= 0.94;
          raf = requestAnimationFrame(glide);
        }
        if (Math.abs(v) > 1) { raf = requestAnimationFrame(glide); } else { g.style.scrollSnapType = ''; }
      });
      // suppress the click that ends a drag
      g.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
      }, true);
      if (g.hasAttribute('data-chips')) {
        g.addEventListener('wheel', function (e) {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { g.scrollLeft += e.deltaY; e.preventDefault(); }
        }, { passive: false });
      }
    });
  })();

  /* ---- Menu chips: filter + scroll-spy ---- */
  (function menu() {
    var chips = $$('.wl-chip');
    var cats = $$('.wl-cat');
    if (!chips.length) return;
    var filter = 'all', scrollCat = '';

    function updateActive() {
      var activeId = filter === 'all' ? (scrollCat || 'all') : filter;
      chips.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-chip') === activeId); });
    }
    function apply() {
      cats.forEach(function (c) {
        c.style.display = (filter === 'all' || c.getAttribute('data-catsec') === filter) ? '' : 'none';
      });
      updateActive();
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        filter = c.getAttribute('data-chip');
        if (filter !== 'all') scrollCat = filter;
        apply();
      });
    });
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var id = e.target.getAttribute('data-catsec');
            if (id && id !== scrollCat) { scrollCat = id; if (filter === 'all') updateActive(); }
          }
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      cats.forEach(function (c) { obs.observe(c); });
    }
  })();

  /* ---- Combo accordions ---- */
  (function combos() {
    $$('.wl-combo-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = btn.getAttribute('data-combo');
        var ul = $('[data-combo-items="' + i + '"]');
        var chev = $('.wl-combo-chev', btn);
        var label = $('.wl-combo-label', btn);
        var open = ul && ul.style.display !== 'none';
        if (!ul) return;
        ul.style.display = open ? 'none' : 'flex';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(45deg)';
        if (label) label.textContent = open ? 'See what’s inside' : 'Hide what’s inside';
      });
    });
  })();

  /* ---- Mobile nav ---- */
  (function nav() {
    var toggle = $('[data-navtoggle]');
    var panel = $('.wl-mobpanel');
    if (!toggle || !panel) return;
    function close() { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('.wl-navclose').forEach(function (a) { a.addEventListener('click', close); });
  })();

  /* ---- Magnetic buttons (desktop pointer only) ---- */
  (function magnets() {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;
    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.16).toFixed(1) + 'px,' + (y * 0.22).toFixed(1) + 'px) scale(1.03)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = 'translate(0,0) scale(1)'; });
    });
  })();
})();
