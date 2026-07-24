/* Wideplate — vanilla interactions (no framework). */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Gate for pre-reveal hidden states: without this class (no JS), every
     section renders fully visible with no reveal styling. */
  document.documentElement.classList.add('js');

  /* ---- Live --nav-height for anchor scroll offsets ----
     The fixed nav condenses (padding 18->8, i.e. -20px total) after scrolling
     past the hero. Anchor jumps happen when the visitor is already scrolled, so
     we want the CONDENSED height. Measure the real navbar; subtract the condense
     delta only while near the top (where it's still expanded).
     NOTE: hero/Visit viewport-fill is pure CSS (100lvh) on purpose — do NOT
     reintroduce a JS-measured viewport height here; a height that changes with
     the collapsing mobile toolbar resizes the hero mid-scroll (image "zoom",
     text shift, cream peek). That bug already shipped once. */
  (function navHeight() {
    var bar = $('header > div');
    if (!bar) return;
    function set() {
      var h = bar.offsetHeight;
      var condensed = window.scrollY > 170 ? h : Math.max(44, h - 20);
      document.documentElement.style.setProperty('--nav-height', condensed + 'px');
    }
    set();
    window.addEventListener('resize', set);
    window.addEventListener('load', set);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
  })();

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

  /* ---- One-time scroll reveals ----
     Each [data-reveal] section gets .is-in on FIRST entry and is unobserved
     immediately, so reveals play exactly once per page load and never replay
     on scroll-up (hard refresh resets). All visuals live in CSS; this only
     flips the class. Count-up numbers ([data-countup]) start when their
     section fires. */
  (function reveals() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    function countUp(el) {
      var target = parseFloat(el.getAttribute('data-target'));
      var dec = +(el.getAttribute('data-decimals') || 0);
      if (reduced) { el.textContent = target.toFixed(dec); return; }
      var t0 = performance.now(), dur = 1300;
      el.textContent = (0).toFixed(dec);
      requestAnimationFrame(function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = (target * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick); // finite: ends at p=1
      });
    }
    function fire(el) {
      el.classList.add('is-in');
      $$('[data-countup]', el).forEach(countUp);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(fire); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { io.unobserve(en.target); fire(en.target); }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---- Reviews: 3 groups of 3, hero-carousel pattern retargeted ----
     Same mechanics as hero(): timed auto-advance + 1.2s opacity crossfade
     (CSS transition on .wl-revgroup) + clickable indicator bars + no
     auto-advance under prefers-reduced-motion (bars still allow manual
     access to all 9 reviews). 7s cadence vs the hero's 6s. Rotation starts
     when the block first becomes visible, then runs forever. */
  (function reviews() {
    var stack = $('.wl-revstack');
    var groups = $$('.wl-revgroup');
    var bars = $$('.wl-revbar');
    if (!stack || groups.length < 2) return;
    var n = groups.length, cur = 0, timer = null;
    function paint(i) {
      cur = i;
      groups.forEach(function (g, k) {
        g.style.opacity = k === i ? '1' : '0';
        g.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      });
      bars.forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    }
    function next() { paint((cur + 1) % n); }
    function start() { if (timer) clearInterval(timer); if (!reduced) timer = setInterval(next, 7000); }
    bars.forEach(function (b) {
      b.addEventListener('click', function () { paint(+b.getAttribute('data-revbar')); start(); });
    });
    paint(0);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          if (es[i].isIntersecting) { io.disconnect(); start(); return; }
        }
      }, { threshold: 0.15 });
      io.observe(stack);
    } else { start(); }
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
