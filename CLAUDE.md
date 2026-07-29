# CLAUDE.md — Studio Build Guide

**This file is read at the start of every session. Follow it before defaulting to generic habits.**

It is the distilled, hard-won playbook for building motion-forward marketing
websites for Philippine SMBs. Most rules here exist because ignoring them
already cost real time, tokens, and patience on past projects. Treat them as
defaults, not suggestions. If a rule genuinely doesn't fit the site in front of
you, say so out loud and confirm — don't silently override.

The current era: motion-heavy sites, built fast (Fable 5 can produce a full
comprehensive build in days). Speed is the opportunity. Discipline is what keeps
speed from shipping broken. This file is the discipline.

---

## 0. First 3 things every new session

1. **Confirm the folder.** Multiple projects live on this machine (web builds
   AND unrelated Roblox projects). Before running anything, verify you're in the
   correct project root. Cross-workspace confusion has happened for real.
2. **List the actual repo structure and read the key files in full** before
   editing — don't assume file names, line numbers, or "what's already done"
   from notes. The repo is the source of truth. If a handoff doc conflicts with
   the code, trust the code.
3. **Check git state** (`git log`, `git status`) so you know what's actually
   pushed/live before assuming anything is or isn't done.

---

## 1. Default stack & architecture (deliberate, not a limitation)

- **Vanilla HTML / CSS / JS. No framework.** This is a repeated, deliberate
  choice for marketing sites: fast on slow PH mobile connections, no build
  tooling, no dependency churn.
- **Only propose React/Vue/etc. on a real scope change** — cart state, live
  reservations/bookings, a CMS admin panel, real auth. Marketing polish and
  animation are NOT reasons to migrate. Don't suggest it otherwise.
- **Page model:** multi-page (`index.html`, `about.html`, ...) for content-rich
  marketing sites; single-page with anchor sections (`#work`, `#services`,
  `#contact`) when the content is one continuous pitch. Pick per project and
  don't assume routes/directories exist that don't — check.
- Keep one canonical `styles.css` / `main.js`. If pulling in a Claude Design
  export, **reuse the existing stylesheet — never let a second, drifting copy of
  the design system get bundled inline.**

---

## 2. Deployment & git discipline

- **Hosting: Vercel, static, auto-deploy from the main branch.**
  **Pushing = publishing live.** There is no separate deploy step. Be
  deliberate: only push when a change is genuinely ready.
- Local testing: `npx serve` / `python -m http.server`, tested at localhost.
- **Real-device testing uses the live Vercel URL directly.** Do not use
  localtunnel-style tunnels — they gave 503s and flakiness that misrepresented
  real performance.
- Vercel serves `folder/index.html` paths automatically (e.g. `/casestudy`), so
  no `vercel.json` rewrite is needed just for that. Only add `vercel.json`
  (e.g. `cleanUrls`) when there's a concrete reason, and verify internal links
  match the path style you chose.

---

## 3. Motion & animation — the section that earns its keep

Motion is the product differentiator. It is also where every expensive bug on
past projects lived. Build motion that survives real hardware, or don't ship it.

### The core split
- **Desktop can keep heavy scroll-pinned / scroll-scrubbed effects.**
- **Phone and tablet get a lighter pattern by default:** a one-shot reveal that
  plays once when scrolled into view (via `IntersectionObserver`), never replays
  on scroll-up, resets only on full reload. Continuous scroll-scrub repeatedly
  lost to real mobile/tablet hardware — after multiple rounds of legitimate perf
  work, the reliable answer was to change the behavior on mobile, not keep
  chasing the jitter.
- If you're going to reduce or swap a motion feature on a platform, **say so and
  confirm the tradeoff first.** Silently removing an effect someone asked for is
  the single worst move in this playbook.

### Non-negotiable animation rules
- **Gate every `requestAnimationFrame` loop with `IntersectionObserver`.** A loop
  with no visibility gating runs 60fps forever, burns CPU, and physically heats
  the phone. Confirm the stop-flag is actually set to false and any teardown is
  actually invoked — declaring cleanup that's never called is a real bug that
  already shipped once.
- **Add `will-change: transform, opacity`** to elements you animate. Without it,
  transform/opacity writes aren't guaranteed compositor-only, so repaint cost
  scales with screen size — larger screens (big phones, tablets) struggle where
  small ones look fine, independent of refresh rate.
- **Animate `transform` (e.g. `scaleX()`), never layout properties like `width`
  / `height` / `top` / `left`** in a loop — those force reflow every frame.
- **Cache layout reads.** Don't query DOM geometry (`getBoundingClientRect`,
  offsets) every frame. Read once, reuse; re-read only on resize.
- **Use `visualViewport.height`, not `innerHeight`,** for viewport height during
  scroll — mobile browser toolbars collapse/expand and change `innerHeight`
  *live* while scrolling. BUT keep cheap viewport-height tracking separate from
  expensive DOM geometry reads; conflating them reintroduces the reflow you were
  fixing.
- **Never write a style unconditionally every frame** (e.g. `el.style.color = x`
  regardless of whether it changed). Diff first, write only on change. Add an
  epsilon check to skip work when scroll position barely moved.

### Carousels / Coverflow-style showcases
- If the design is a horizontal Coverflow (active item centered/large, neighbors
  scaled/faded at the sides, elastic snap): **keep it horizontal at every
  viewport, including mobile.** Do not let it flip vertical on narrow screens.
  Orientation-switching on scroll components is exactly the mess that ate days.
- **Decide tap-vs-drag at `pointerup` using the pointerdown-time target.**
  `setPointerCapture()` (needed for drag/swipe) retargets the synthesized
  `click` event to the capturing element — so a `click` handler on something
  else can *structurally never fire*. Don't wait for `click`; resolve intent at
  `pointerup`.

### 3D / heavy libraries (Three.js etc.)
- **Load from CDN and a local `vendor/` fallback simultaneously from time zero,
  race them, first to resolve wins, cancel the loser.** A CDN can *stall* — no
  `onload`, no `onerror` — for 30–120s+ on a bad mobile connection, so a fallback
  wired only to `onerror` never fires and strands first-time visitors. The race
  is the fix. Guard against double-init with a single `loaded` flag.
- Move heavy libs off blocking `<script>` tags; load async.
- **Always ship a real reduced-motion / no-WebGL fallback** (CSS-only where
  possible) that is a complete experience, not a sad placeholder — some visitors
  only ever see it (`prefers-reduced-motion`, no-WebGL devices).
- Respect `prefers-reduced-motion` everywhere motion exists (curtains, petals,
  reveals): swap to a simple fade, don't just disable.

---

## 4. Testing discipline — trust real devices over green checkmarks

This is not paranoia. Emulated/headless results have diverged from real-device
behavior multiple times on past projects, for a *different* underlying reason
each time (toolbar simulation, GPU paint cost, sustained CPU load).

- **Treat "all tests pass" from emulated/headless testing as unconfirmed until
  verified on real hardware.** When it matters, ask for real-device confirmation
  rather than declaring victory.
- **Test toolbar-reduced viewport heights, not just full-height.** Mobile
  Safari/Chrome show the address bar on initial load, shrinking real usable
  height by ~100–120px vs. a full-height emulator screenshot. That gap is where
  clipping/overlap bugs hide (nav overlap, hero overflow).
- **Real-device width matrix** to cover: 360, 375, 390, 412, 428, 480, 768,
  1024, 1440, plus landscape. Re-check the tightest widths (iPhone SE-class,
  375px portrait) before adding anything to a hero — margins there can be ~3px.
- **Android is not "tested" until tested on an actual Android device.** iPhone +
  emulation passing is not Android confirmation. Say so honestly.
- **Before calling something a code bug, rule out the cheap explanations:**
  stale cache, wrong browser, viewing an old deployed version.
- **When you see a device-specific pattern, verify the hardware fact before
  theorizing.** ("The jittery ones must be ProMotion" was wrong — one of them was
  a 60Hz iPad.) Confirm the device actually has the feature you're blaming.

---

## 5. Loading & performance for PH mobile

Slow connections are the target environment. Weight and load behavior matter.

- Compress images hard (a hero PNG going 85KB → 25KB is normal); serve them at
  roughly display size, not oversized.
- Lazy-load below-the-fold images and audio.
- Async font loading with `font-display: swap`.
- Keep a loading screen honest — a small minimum display time on light subpages
  (~500ms) reads as an intentional beat instead of a flicker; don't fake a long
  load.
- Re-measure page weight after adding features — old numbers go stale fast. Don't
  quote a weight you haven't re-checked.

---

## 6. Browser storage

- **`sessionStorage` / `localStorage` work fine on deployed real sites.** The
  "don't use browser storage" rule applies ONLY to the Claude.ai in-chat artifact
  preview sandbox — never to a live Vercel site. Do not strip working storage
  because of that misremembered rule.
- **Persist state continuously (throttled, e.g. every 2s), not only on
  `pagehide`** — `pagehide` doesn't reliably fire. For cross-page resume blocked
  by iOS autoplay policy, add a "first tap anywhere resumes from saved position"
  fallback.
- If a data list (playlist, config) must be duplicated across files for load-order
  reasons, **document every duplication point and update all of them on any
  edit** — silent drift between copies is a nasty maintenance bug.

---

## 7. Brand assets & licensing — this is for real clients

- **Check the license before using any asset.** Fonts especially: a
  "personal use only" font needs a commercial license or a substitute for a
  paying client's site. Confirm, don't assume.
- **Never AI-redraw a client's real logo or mascot.** AI redraws repeatedly
  failed to match real pose/proportions. Extract the real asset instead (crop /
  background-remove the client's actual file, e.g. via Python/PIL).
- **Prefer styled live text over a flat raster for wordmarks** where the brand
  font is available — live text with proper outline/shadow reads sharper than a
  flattened PNG of the whole logo.
- **No raw Unicode emoji in production UI.** Build a custom SVG icon matching the
  site's existing illustrated style (outline weight, flat fill). Emoji look
  inconsistent next to hand-drawn iconography.
- **Keep functional brand colors even when off-palette.** A Messenger-blue
  "Order via Messenger" button or Facebook-blue (`#1877F2`) hover is a *signal*,
  not a palette violation — don't recolor it to the site's theme.
- **Once a brand decision is made, it's locked** (accent colors, type, motif).
  Don't re-litigate or offer "alternatives" to settled brand choices; check the
  current CSS variables rather than assuming values. If a brand rule has a
  specific reason behind it, respect the reason even if the rule looks arbitrary.

---

## 8. Copy & positioning rules

- **Never imply a business is "invisible online" or has no presence.** Many
  clients have real Facebook followings — that framing insults them. The real
  argument is **platform risk and ownership**: a following can vanish with an
  algorithm or policy change; a website is something the business actually owns.
- **Don't overpromise outcomes.** Never guarantee search rankings, traffic, or
  sales. Describe capability (fast to load, easy to find, made to stay), not
  guaranteed results.
- Plain, confident, specific language. No filler, no AI-sounding phrasing.
- **House style: no em dashes in visible site copy.** (Adjust per brand, but this
  is the default.)
- Let visitors self-identify their pain point (a "not sure where to start?"
  self-select list) rather than telling them what their problem is — you can't
  know in advance which one applies.
- Verify content against the real source of truth (the client's actual menu,
  Facebook page, hours). Watch for naming traps — the same item at two prices in
  two contexts must be labeled distinctly, not deduplicated.

---

## 9. Pre-pitch content checklist (spec builds)

Before a spec site is pitch-ready, these are the usual real gaps — flag them,
don't ship placeholder as if it's final:

- [ ] **Real photos** of the actual business/product (not Unsplash stock) —
      usually the single highest-priority gap.
- [ ] **Real reviews/testimonials** (or an explicit internal note that they're
      examples).
- [ ] **Final client-specific copy** on About/FAQ/secondary pages (not generic
      placeholder).
- [ ] **Real Android device pass.**
- [ ] **Domain** decided, and ownership resolved (does the dev buy it, or the
      client once signed, so they own it outright?).
- [ ] Contact path actually works (form endpoint verified, or a working deep
      link / mailto).

---

## 10. How to work with me (collaboration contract)

- **Give me ready-to-paste prompts** for Claude Code / Claude Design when I ask
  for a fix or build — not vague "you could try..." suggestions.
- **Be explicit about confidence.** Say clearly when a diagnosis is *speculative*
  vs. *confirmed by actually reading the code.* Don't blur that line. The best
  fixes here came from reading the real code, not pattern-matching symptoms.
- **When something's ambiguous, give me 2–3 concrete options,** not an open-ended
  question.
- **When I ask "thoughts?", give real itemized critique** — catch fabricated-
  sounding names, inconsistent dates, unresolved placeholders. Don't just
  validate.
- **Don't make silent scope-reducing decisions.** Removing or changing a feature
  I asked for, even with sound technical reasoning, must be confirmed with me
  first.
- I'm cost-conscious about tokens and have hit limits — batch multiple bugs into
  one prompt, and don't burn a build redoing something that already exists (ask
  if I still have the earlier version first).
- Client-facing address convention: **Ma'am/Sir**, optionally with first name
  ("Sir Mark," "Ma'am Liza") once known, following their lead if they go casual.

---

## 11. Per-project block — FILL THIS IN for each new site

> Copy this into a project-specific note or keep it at the bottom of the
> project's own CLAUDE.md. Don't leave it blank and don't assume defaults.

- **Business name / real details:** (name, address, phone, hours, socials —
  verified against source of truth)
- **Live URL / repo / local path:**
- **Deploy branch:**
- **Brand:** colors (current CSS vars), fonts (+ license status), motif
- **Locked decisions** (don't re-litigate):
- **Open / unresolved items:**
- **Known device gotchas / tight-margin widths:**
- **Content still needed before pitch:**

---

## 12. Wideplate — project block

- **Business:** Wideplate Restaurant. Ground Floor, Balay Grace, R. Concepcion
  St, Barangay Santiago, San Antonio, Zambales. 0966 965 9995 / 0966 965 9998.
  WideplateRestaurant@gmail.com. facebook.com/wideplaterestaurant.
  **Hours: open 11AM until 9PM** — this string appears in the footer of all
  four pages, the hero badge, the Visit pill, the FAQ answer AND the FAQPage
  JSON-LD. Change one, change all six.
- **Live / repo:** https://wideplate-web.vercel.app · github.com/laboonweb/wideplate-web
- **Deploy branch:** `master`. Push = publish. No separate deploy step.

### Type system — CONFIRMED LIVE 2026-07-28, do not re-litigate

Audited by reading `getComputedStyle` on the deployed site, not by assumption.
Three roles, three faces. They are **not** meant to match:

| Role | Stack | Confirmed |
|---|---|---|
| Wordmark / logotype | `'New Baskerville FS','New Baskerville','Libre Baskerville',Baskerville,Georgia,serif` | Nav, footer, preloader, and the `.wl-pp-mark` on all subpages |
| Display headlines | `'Fraunces',Georgia,serif` | 102 elements: hero H1, every section H2, `.wl-squote`, combo prices, the 4.8 stat |
| Body / UI | `'General Sans','Helvetica Neue',sans-serif` | Everything else |

- **Fraunces is genuinely in use.** It is NOT dead weight and must not be
  removed. ~204KB across 3 files is the price of the editorial headline face.
- **General Sans is self-hosted** from `fonts/general-sans-{400,500,600,700}.woff2`
  (90KB total, `@font-face` at the top of `css/site.css`), NOT from
  api.fontshare.com. That host resolves to two IPs and one is a blackhole:
  curl timed out 3/3 at 20s, Chrome took 285ms to 4235ms across five cold
  loads against 40-105ms for Google Fonts on the same connection. Do not put
  the CDN link back. Licence is the ITF Free Font License: free commercially,
  self-hosting explicitly supported, no reselling or redistributing the files.
  Rendering is byte-identical to what the CDN served — all four weights
  measured to 0.00px difference.
- **Fraunces and Libre Baskerville still come from Google Fonts** and are
  healthy (40-105ms). Self-hosting them is the remaining perf lever, not a
  reliability one.
- **What visitors actually see for the wordmark is Libre Baskerville.**
  `'New Baskerville FS'` and `'New Baskerville'` are not installed on ordinary
  machines — measured by canvas text width, the full stack renders identically
  to Libre Baskerville alone and 44px wider than the default serif. The stack
  is correct as written; just know the webfont is what ships.
- **`<button>` does not inherit `font-family`** and Chrome's UA default for it
  is Arial. This silently put the six Feast Combos "See what's inside" toggles
  in Arial. Fixed with a single `button { font-family: inherit; }` in
  `index.html`. Re-check this whenever a new `<button>` gains visible text.

### Wordmark lockup — measured off the official logo 2026-07-29

Reference: `uploads/wideplatewordmarkfb.png` (the Facebook profile logo).
Measured by pixel analysis, not by eye:

| Property | Reference |
|---|---|
| WIDEPLATE cap height | 60px (x 109-639, width 531) |
| RESTAURANT cap height | 21px (x 201-537, width 337) |
| **Font-size ratio** | **0.35** (cap heights, and cap-height-per-em is identical for both weights) |
| RESTAURANT ink width / WIDEPLATE ink width | 0.635 |
| Gap, WIDEPLATE baseline to RESTAURANT top | 20px = 0.257em of the WIDEPLATE size |
| Hairline rules | start and end flush with WIDEPLATE's own width |

**The logo's face is narrower than ours.** Solving for the tracking that would
reproduce the reference's WIDEPLATE width returned 0 — Libre Baskerville is
already wider at zero tracking. So the lockup cannot be matched glyph for
glyph; what is matched is the ratio (0.35) and the width proportion (0.635),
which are font-independent. RESTAURANT's tracking of `0.785em` is the value
that hits 0.635 with our stack; it is not the logo's own tracking.

**The ratio is 0.35 everywhere — there is no optical exception.** An earlier
pass gave the nav and subpage marks 0.395 to keep RESTAURANT legible at a 19px
WIDEPLATE; that was reverted because the client will read the lockup against
the real logo and a 13% discrepancy is exactly the kind of thing that gets
noticed. Instead the nav/subpage WIDEPLATE is **21.5px**, chosen so that
0.35 lands RESTAURANT on 7.53px — the same size it rendered at before, so
nothing became less legible in the process of becoming accurate.

**Nav breakpoints — remeasured in a browser 2026-07-30, seven items.** FAQ was
added to the nav, and iPad landscape (1024) must keep the desktop nav, so the
handover is now a three-step ladder rather than one number: **>1240** full
spacing · **≤1240** link gap 14 / bar gap 24 · **≤1130** the nav phone number
drops out (the action bar's Call takes over at exactly the same width — they
are a pair) · **≤1023** hamburger. Measured parts at 21.5px, fonts loaded:
wordmark 175.55, seven links 442.43 of text, tel 93.52, Get Directions pill
164.3. At default spacing seven items need 1213px before they fit at all,
which is why an intermediate 1130 handover was wrong. Re-measure with
`b=document.querySelector('.wl-nav-bar'); b.scrollWidth - b.clientWidth` at
1024, 1131 and 1241 after any nav item, wordmark or pill-label change.
Nav bar height is unchanged at 72px desktop / 80px mobile, so `--nav-height`,
the hero and Visit fill math, the anchor offsets and the mobile panel's
max-height are all untouched.

**Never size RESTAURANT with its own `clamp()`.** Each lockup carries ONE size
(the WIDEPLATE size) on the shared parent, and RESTAURANT, the gaps and the
rule spacing all derive from it in `em`. Parallel clamps with different `vw`
coefficients is what made the ratio drift from 0.169 to 0.395 across the site
depending on viewport width.

### Locked decisions (don't re-litigate)

- Wordmark is Baskerville, headlines are Fraunces. Settled. See above.
- Hero height is **pure CSS `100lvh`**. Do NOT swap for `dvh`/`svh`, a JS
  measurement, or a height-based media query — every one of those resizes the
  hero mid-scroll as the mobile toolbar collapses, which was the original bug.
- Reveal triggers live in three isolated configs at the top of `app.js`
  (`REVEAL_TRIGGER`, `BEST_SELLERS_TRIGGER`, `RATING_TRIGGER`). Tune one
  without touching the others. Read the comments before raising a `threshold`:
  these sections are taller than the viewport, so a high threshold can be
  mathematically unreachable and the section then never reveals at all.
- The preloader block (CSS + controller + markup) is **duplicated in all four
  pages**. No build step exists. Edit one, edit all four.
- `repeat(auto-fit, minmax(Npx, 1fr))` is always written as
  `minmax(min(Npx, 100%), 1fr)` here. The bare form overflowed the gutter on
  320px phones.
- Marquee has **four** content copies and translates `-25%`. The count and the
  percentage are a pair — with two copies it ran out of content past ~2535px
  and left dead space on ultra-wide.

### Known gotchas / tight widths

- **320px** is the tightest supported width and where things break first.
- **`a:hover` is a TEXT-link rule and is scoped away from buttons.** Both
  `site.css` and `home.css` carry
  `a:not([class*="wl-btn"]):not([class*="-dir"]):hover { color: #C9862B }`.
  The pills are `<a>` elements, so the unscoped version repainted a gold
  button's label amber on gold (~1.6:1, effectively invisible). Any new filled
  button should still declare its own `:hover` colour. On gold, the label stays
  `#1B1305` (~10:1) — white on gold is under 2:1 and is not an option.
- **Chrome's auto-dark-mode is ON in the test browser and rewrites the
  buttons' computed colours**, so colour work cannot be verified there — even
  `color-scheme: light` did not opt out. Check colour on a real browser.
- **Phone landscape (e.g. 667x375): the hero is ~566px of content in a 375px
  viewport, so it scrolls instead of filling.** Nothing clips or overlaps.
  Left alone deliberately: the fix wants a `max-height` media query, which is
  exactly the height-dependent pattern that caused the mid-scroll resize bug.
- Nav hands over to the hamburger at **≤1023px**, so 1024 tablet landscape
  keeps the desktop nav. Tightest measured clearance between the links and the
  actions is 27.5px, at 1131 where the phone number comes back. See the nav
  breakpoint ladder above.
- **The nav's phone number is hidden from 1130px down**, because seven links
  plus the number need 1131px. It is still in the footer, Visit and FAQ, and
  the nav keeps its Get Directions pill at every width.
- **A persistent Call / Get Directions bar was built and then removed** on the
  client's call: let a visitor explore without being pushed to call. Do not
  re-propose it. `--wl-bottom-safe` survives it and is now just
  `env(safe-area-inset-bottom)`.
- **The hero's bottom padding is derived, never typed:**
  `--wl-bars-band` = the slide indicators' 32px height + their 30px offset +
  `--wl-bottom-safe`, and the padding is that band + 20px. The indicators are
  pushed up by the home-indicator inset, so a hard-coded padding that looks
  fine in a desktop browser (inset 0) overlaps the CTA buttons by 14px on an
  iPhone 14 Pro Max (inset 34px). **Simulate the inset when testing:**
  `document.documentElement.style.setProperty('--wl-bottom-safe','34px')`.
- Story sticky pin is `static` ≤900px, `sticky` ≥1000px.

### Still needed before pitch

Real gallery photos (all 12 tiles are placeholders), real Our Story owners
photo, a real Android device pass, and a domain decision.

---

*This guide is a living document. When a new build teaches an expensive lesson,
add it here so it's never re-learned the hard way.*
