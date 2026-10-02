# Wideplate Restaurant

**A bespoke, mobile-first restaurant website for Wideplate in San Antonio, Zambales, Philippines.**

[Visit the site](https://wideplate-web.vercel.app) · [View the menu](https://wideplate-web.vercel.app/#menu) · [Get directions](https://www.google.com/maps/dir/?api=1&destination=Wideplate%20Restaurant%2C%20R.%20Concepcion%20St%2C%20San%20Antonio%2C%20Zambales)

Wideplate needed a website that made the practical decisions easy: see the food, browse a broad menu without getting lost, understand group-friendly options, and get directions or call without friction. The result is a handcrafted restaurant experience that carries the warmth of Filipino feasts while staying intentionally light, direct, and usable on mobile connections.

This is a real client project and portfolio case study, not a starter template.

## What the site delivers

- A cinematic, responsive hero that introduces Wideplate through real food photography, clear calls to action, and a progressive five-slide sequence.
- An extensive, filterable menu with category chips that keep the active category in view, plus expandable feast-combo details.
- Best-seller storytelling, customer-review rotation, and an owners' story that give the restaurant a human dimension beyond a list of dishes.
- Direct visitor paths for calling, email, Google Maps directions, dine-in, curbside pickup, and delivery.
- Dedicated FAQ, gallery, privacy, and accessibility pages rather than burying important information in the homepage.
- Responsive layouts and art direction from small phones through desktop, with phone-specific food imagery where it makes a difference.

## Built around real visitor behavior

The site treats a restaurant visit as a series of small, practical decisions. The menu is easy to browse, the action to get directions is always available, and interactions work with touch, keyboard, or a mouse.

| Visitor need | Implementation |
| --- | --- |
| Choose a dish quickly | A full menu with category filtering, scroll-aware active chips, and prominent best sellers |
| Understand a group order | Expandable feast-combo panels expose what is included without overwhelming the page |
| Find the restaurant | Address, hours, contact links, and a direct Google Maps route are written into the experience |
| View a larger food or venue photo | A keyboard-accessible native `<dialog>` lightbox handles gallery images |
| Revisit a long page | Scroll position is restored after a reload, while direct section links still land at the requested section |
| Avoid unnecessary third-party requests | The Google Map is a user-initiated facade, so its embed is created only after the visitor asks to view it |

## Stack

- **Vanilla HTML, CSS, and JavaScript**. No framework, package manager, or build step is required.
- **Vercel** for static hosting and production response headers.
- **Responsive WebP photography** with separate mobile variants for the hero and key dishes.
- **Local General Sans font files** with `font-display: swap`, paired with editorial serif type for the restaurant identity.
- **Native browser features** including `IntersectionObserver`, `dialog`, `matchMedia`, `sessionStorage`, and `localStorage` instead of unnecessary libraries.

The project is deliberately simple to deploy and maintain. The browser receives static files, while JavaScript adds only the interactions that make the menu, gallery, navigation, map, and page state more useful.

## Interaction and performance decisions

- The initial hero image is prioritized. Later slides are promoted only after the opening sequence, so off-screen photography does not compete with the first meaningful view.
- Scroll reveals use `IntersectionObserver`, play once per page load, and fall back to fully visible content if JavaScript is unavailable.
- Motion respects `prefers-reduced-motion`. Autoplay intervals stop, transitions shorten to a minimal fallback, and touch devices retain native momentum for horizontal scrolling.
- The hero uses stable `100lvh` sizing to avoid the layout shift that mobile browser toolbars can cause during a scroll.
- The map stays out of the initial page load and out of the privacy path until the visitor explicitly requests it.
- JavaScript-disabled visitors can still read the page, browse the menu, and see FAQ answers. JavaScript enhances rather than gates the core information.

## Accessibility and privacy

Accessibility and privacy are implemented as product requirements, not decorative checklist items.

- Every page begins with a visible-on-focus skip link that takes keyboard users to the page heading.
- Interactive elements use semantic buttons and links, maintain visible focus styles, and keep `aria-expanded` in sync for disclosures.
- Gallery images use descriptive alternative text, while decorative details are hidden from assistive technology.
- The lightbox uses the native HTML dialog element for Escape-to-close and focus return.
- The site ships a public accessibility statement and accurately describes **partial WCAG 2.2 AA conformance**. It does not claim a completed screen-reader or real-Android pass where one has not been performed.
- There is no contact form, user account, advertising cookie, or analytics tracker in this codebase. Local browser storage remembers the consent choice, opening sequence, and scroll position only on the visitor's device.
- `vercel.json` supplies a Content Security Policy, frame protection, MIME sniffing protection, referrer policy, and a restrictive permissions policy.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Main restaurant story, menu, food highlights, combos, reviews, contact, and directions |
| `/faq.html` | Service, hours, location, parking, delivery, dietary, and group-dining questions, with FAQ structured data |
| `/gallery.html` | A responsive, accessible photo gallery with a native dialog viewer |
| `/privacy-policy.html` | Plain-language explanation of the site's actual data and browser-storage behavior |
| `/accessibility.html` | Accessibility features, measured work, and honest known limitations |

## Local development

There are no dependencies to install. Serve the repository as static files from the project root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

Before publishing a website change, check the actual visitor result at desktop and phone widths, including reduced-motion mode. At minimum, exercise the menu filtering, combo disclosures, mobile navigation, gallery dialog, map activation, FAQ controls, and keyboard skip link.

## Project structure

```text
.
├── index.html                 # Main restaurant experience
├── faq.html                   # FAQs and FAQPage structured data
├── gallery.html               # Photo gallery and lightbox
├── privacy-policy.html        # Privacy policy
├── accessibility.html         # Accessibility statement
├── css/
│   ├── site.css               # Shared type, footer, focus, and subpage styles
│   ├── home.css               # Homepage layout, art direction, and motion
│   ├── faq.css                # FAQ page styles
│   ├── gallery.css            # Gallery and dialog styles
│   └── privacy.css            # Privacy and accessibility page styles
├── js/app.js                  # Progressive enhancements and interactions
├── fonts/                     # Local General Sans webfonts
├── uploads/                   # Responsive restaurant photography
└── vercel.json                # Production security headers
```

## Content note

The gallery route is intentionally prepared for real restaurant photography and currently contains labeled placeholders. The replacement pattern is documented in `gallery.html` so a new image can be added without changing the gallery interaction or accessibility behavior.

## Usage

This project is published publicly for portfolio and code-review purposes.

© 2026 Briann Arcala / Arc Web Works. All rights reserved.

The design, visual system, branding implementation, and source code may not
be redistributed, resold, rebranded, or presented as original work without
written permission.

## Credits and use

Designed and developed by [Arc Web Works](https://arcwebworks.com). Wideplate's name, business content, imagery, and customer-review content belong to Wideplate Restaurant and are included here as part of a portfolio project. They are not licensed as reusable template assets.
