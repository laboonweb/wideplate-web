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
      var lastX = 0, lastT = 0, vel = 0, raf = 0, tracking = false, slop = 4;
      function stopInertia() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      g.addEventListener('pointerdown', function (e) {
        stopInertia();
        // Track EVERY pointer type for tap-vs-swipe, but only mouse gets the
        // JS drag — touch keeps the browser's native momentum scrolling.
        tracking = true; moved = false; startX = e.clientX;
        slop = e.pointerType === 'mouse' ? 4 : 10;
        if (e.pointerType !== 'mouse') return;
        down = true; startScroll = g.scrollLeft;
        lastX = e.clientX; lastT = performance.now(); vel = 0;
        g.style.cursor = 'grabbing'; g.style.scrollSnapType = 'none';
      });
      window.addEventListener('pointermove', function (e) {
        if (!tracking) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > slop) moved = true;
        if (!down) return;
        g.scrollLeft = startScroll - dx;
        var now = performance.now(), dt = now - lastT;
        if (dt > 0) { vel = (lastX - e.clientX) / dt; lastX = e.clientX; lastT = now; }
      });
      // Browser claimed the gesture as a scroll/swipe: it was never a tap.
      g.addEventListener('pointercancel', function () { moved = true; tracking = false; });
      window.addEventListener('pointerup', function () {
        tracking = false;
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
    var strip = $('[data-chips]');
    var filter = 'all', scrollCat = '', lastCentered = '';

    /* Keep the highlighted chip visible inside its own strip, tab-bar style.
       Scrolls ONLY the strip (never scrollIntoView, which would also move the
       page). Layout is read here on category change, not per frame. */
    function centerChip(chip) {
      if (!chip || !strip) return;
      var max = strip.scrollWidth - strip.clientWidth;
      if (max <= 0) return;
      var left = strip.scrollLeft + chip.getBoundingClientRect().left - strip.getBoundingClientRect().left;
      var target = Math.max(0, Math.min(max, left - (strip.clientWidth - chip.offsetWidth) / 2));
      if (Math.abs(target - strip.scrollLeft) < 2) return;
      strip.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' });
    }
    function updateActive() {
      var activeId = filter === 'all' ? (scrollCat || 'all') : filter;
      var active = null;
      chips.forEach(function (c) {
        var on = c.getAttribute('data-chip') === activeId;
        c.classList.toggle('is-active', on);
        if (on) active = c;
      });
      if (activeId !== lastCentered) { lastCentered = activeId; centerChip(active); }
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
        /* Filtering hides up to 13 of 14 categories, so the document can
           collapse by thousands of px while scrollY stays put — that is what
           dumped the visitor into Feast Combos. Re-anchor on the category that
           is now showing. Legacy scrollTo(x, y) so CSS scroll-behavior (and its
           reduced-motion override) decides smooth vs instant. */
        var land = $('.wl-cat[data-catsec="' + (filter === 'all' ? scrollCat : filter) + '"]') || cats[0];
        if (land) window.scrollTo(0, land.getBoundingClientRect().top + window.pageYOffset - 150);
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

  /* ---- Cookie consent card ----
     Card is BUILT HERE, not written into the HTML, so index.html and
     privacy-policy.html cannot drift apart (CLAUDE.md §6). Any page that
     loads app.js gets it. Choice persists in localStorage, so it shows once
     and stays gone across pages and future visits.
     Non-blocking on purpose: no overlay, no focus trap, page stays usable. */
  (function cookies() {
    var KEY = 'wp-cookie-consent';
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked: ask again */ }

    /* ===== ANALYTICS HOOK =====
       Nothing is tracked today. When a tracking/analytics script is added,
       load it from HERE (fires on later visits) and from choose('accepted')
       below (fires on the visit where consent is first given):
         if (saved === 'accepted') loadAnalytics();
       Never load it above this line. */

    if (saved === 'accepted' || saved === 'rejected') return;

    var css = document.createElement('style');
    css.textContent =
      ".wl-cookie{position:fixed;left:24px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:70;" +
      "width:min(380px,calc(100vw - 48px));box-sizing:border-box;padding:20px 22px 22px;border-radius:16px;" +
      "background:rgba(11,42,32,0.97);backdrop-filter:blur(10px);border:1px solid rgba(244,238,225,0.18);" +
      "box-shadow:0 20px 50px rgba(4,18,13,0.4);color:#F4EEE1;" +
      "font-family:'General Sans','Helvetica Neue',sans-serif;" +
      "opacity:0;transform:translateY(16px);will-change:transform,opacity;" +
      "transition:opacity .45s ease,transform .45s cubic-bezier(0.16,1,0.3,1)}" +
      ".wl-cookie.is-in{opacity:1;transform:none}" +
      ".wl-cookie h2{margin:0 0 8px;font-family:'Fraunces',Georgia,serif;font-weight:560;font-size:19px;letter-spacing:-0.01em}" +
      ".wl-cookie p{margin:0 0 16px;font-size:13.5px;line-height:1.6;color:rgba(244,238,225,0.82)}" +
      ".wl-cookie a{color:#D9A441;text-decoration:underline;text-underline-offset:3px}" +
      ".wl-cookie a:hover{color:#F4EEE1}" +
      ".wl-cookie-btns{display:flex;gap:10px;flex-wrap:wrap}" +
      ".wl-cookie button{font-family:inherit;font-size:11.5px;letter-spacing:0.14em;text-transform:uppercase;" +
      "padding:13px 24px;border-radius:999px;cursor:pointer;transition:background .25s ease,box-shadow .25s ease}" +
      ".wl-cookie-yes{background:#D9A441;color:#1B1305;border:0;font-weight:700}" +
      ".wl-cookie-yes:hover{box-shadow:0 14px 38px rgba(217,164,65,0.4)}" +
      ".wl-cookie-no{background:none;color:#F4EEE1;border:1px solid rgba(244,238,225,0.6);font-weight:600}" +
      ".wl-cookie-no:hover{background:rgba(244,238,225,0.12)}" +
      ".wl-cookie :focus-visible{outline:2px solid #D9A441;outline-offset:3px}" +
      /* On phones the hero's slide indicators are bottom-centre, i.e. exactly
         under the card. Lift them by the card's measured height while it's up.
         transform, not bottom, so it stays compositor-only. */
      ".wl-bars{transition:transform .45s cubic-bezier(0.16,1,0.3,1)}" +
      "@media (max-width:600px){.wl-cookie{left:16px;right:16px;width:auto;" +
      "bottom:calc(16px + env(safe-area-inset-bottom))}" +
      "html.wl-cookie-open .wl-bars{transform:translateY(calc(-1 * (var(--wl-cookie-h,200px) + 14px)))}}";
    document.head.appendChild(css);

    var card = document.createElement('div');
    card.className = 'wl-cookie';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-label', 'Cookie notice');
    card.innerHTML =
      '<h2>A quick note</h2>' +
      '<p>We use cookies to make this site work well for you. Read our ' +
      '<a href="privacy-policy.html">Privacy Policy</a> to learn more.</p>' +
      '<div class="wl-cookie-btns">' +
      '<button type="button" class="wl-cookie-yes">Accept</button>' +
      '<button type="button" class="wl-cookie-no">Reject</button>' +
      '</div>';
    document.body.appendChild(card);

    var root = document.documentElement;
    function show() {
      root.style.setProperty('--wl-cookie-h', card.offsetHeight + 'px');
      root.classList.add('wl-cookie-open');
      card.classList.add('is-in');
    }
    function choose(value) {
      return function () {
        try { localStorage.setItem(KEY, value); } catch (e) { /* nothing to persist to */ }
        /* ANALYTICS HOOK: if (value === 'accepted') loadAnalytics(); */
        root.classList.remove('wl-cookie-open');
        if (reduced) { card.remove(); return; }
        card.classList.remove('is-in');
        setTimeout(function () { card.remove(); }, 500);
      };
    }
    card.querySelector('.wl-cookie-yes').addEventListener('click', choose('accepted'));
    card.querySelector('.wl-cookie-no').addEventListener('click', choose('rejected'));

    /* Enter after the hero's load intro settles (last hero element finishes at
       ~1.75s: 0.85s delay + 0.9s fade) so the two don't compete. */
    if (reduced) { show(); return; }
    setTimeout(function () { requestAnimationFrame(show); }, 2200);
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
