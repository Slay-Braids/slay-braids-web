# SLAY BRAIDS website: production handoff (27 Nov 2026)

**Production URL:** https://slaybraids.vercel.app (also https://slay-braids-web.vercel.app)
Source: `main`, merged from `claude/cool-ramanujan-0ln9mf` via [Slay-Braids/slay-braids-web#1](https://github.com/Slay-Braids/slay-braids-web/pull/1).

## What changed for production
- **Identity:**
  - The site palette is red #C60D13, sampled from the original logo, plus black and white.
  - The page that meets the hair is white, with a red edge line.
  - Gold/champagne accents, ivory and the pearl light shift are removed.
- **Kept as approved:** the 3D braid scene (anchor_v1), its lighting and the seven-chapter scroll, all unchanged. The lock test passes.
- **Logo:** the original SLAY BRAIDS logo file appears in the header, on the Chapter 3 page and in the footer, and as the favicon. It is trimmed of its transparent margin only.
- **Footage:**
  - Original footage from the brand Drive, with no grading and no audio.
  - Where it appears: the Chapter 2 craft film, the Chapter 3 portrait, Chapter 5 "The Looks" (4 looks) and the Chapter 6 lookbook.
  - Inventory: `docs/production-assets.md`; per-file provenance: `public/media/manifest.json`.
- **Copy:**
  - Only verified wording: the positioning line and "FUTURA by SLAY BRAIDS / FUTURA is a SLAY BRAIDS product line".
  - Placeholder copy is removed. No names, prices, claims, contacts or testimonials are published.
- **Enquiries:** no form, because there is no verified destination. The section says online enquiries are not open yet. `src/content/site.ts` (`enquiry.destination`) is where a confirmed destination goes.
- **Footage behaviour:**
  - Plays only while on screen, and loads only when first needed.
  - A header control pauses and resumes it (WCAG 2.2.2), and the header reappears when focused.
  - In reduced motion, footage never plays by itself.

## Hosting (Vercel, team slay-braids, project slay-braids-web)
- **Builds:**
  - Production builds from `main` (Next.js static export, Node 22).
  - Branch pushes and pull requests build protected Previews.
- **Access:**
  - Deployment protection (Vercel Authentication) covers deployment URLs.
  - The production domains are public.
- **Headers:** security headers (nosniff, referrer policy, frame options, permissions policy) and long-lived caching for hashed assets.
  - `X-Robots-Tag: noindex` is still on, so search engines are asked not to index the site until model releases are confirmed.
  - To allow indexing, remove that header from `vercel.json` and `robots` from `src/app/layout.tsx`.
- **Rollback:** every deployment stays listed in Vercel. Promote an earlier one, or revert the merge commit on `main`.

## Deployment history
- 27 Nov 2026: three unintended production records were created while setting up the project. All were removed or cancelled; one was briefly public (about 3 minutes) with no custom domain involved.
- See `docs/M3-handoff.md` §6 for the full account.

## Verification (27 Nov 2026, production deployment dpl_57g7vYJJf9yPZrQ8LY4xubJgPyZW from main 5ed8134)
- **Public access:**
  - https://slaybraids.vercel.app and https://slay-braids-web.vercel.app return 200 with no login, cookie or share token.
  - Previews still redirect to Vercel login (302).
- **Full test suite against the live domain (desktop 1440×900 and Pixel 7):** 63 passed, 1 skipped (by design), 2 failed.
  - The 2 failures are this sandbox's Node request helper, which cannot resolve hosts without the network proxy.
  - The same checks run with curl: all 18 video and poster files, the stills, the logo and the favicon return 200 with the correct types.
- **Smoke test, desktop and mobile:** 0 console errors, 0 failed requests, every image loaded; 404 page and security headers confirmed. Screenshots: `docs/review/prod/`.
- **Local suite on the release build:** unit 49/49; end-to-end 65 passed, 1 skipped.
- **CI on the final PR commit 1d90736:** 64 passed, 1 skipped, 1 failed. The failure is a runner infrastructure error (the browser lost its context during test setup), not an assertion.
- **Lighthouse (lab, compressed), static mode:** accessibility 100; LCP 0.76 s mobile, 0.22 s desktop; CLS 0; performance 99.
- **Not done:** real-device testing (Galaxy A26, iPhone Safari, Samsung Internet).

## Update 2 (27 Nov 2026): copy, FUTURA features, colour, simple view
- **Write-ups:** a hero subline and a text for each chapter. Each look and lookbook image is named and described (descriptions of what is visible, not official style or shade names).
- **FUTURA:**
  - The affordability story ("Made to look expensive. Priced not to be.") and an intro.
  - Six futura fibre features paraphrased from Kaneka's page (https://www.kanekalon.com/en/futura.html), without its product list.
  - Kaneka's own caveat on the heat figure ("180 °C … not a guaranteed value") is kept, and Kaneka is credited as the source.
  - Chapter 4 is longer so this can be read.
- **Colour:**
  - anchor_v2 replaces the champagne key light on the 3D braids with a neutral white key, to fit red, black and white.
  - Geometry, shader, pose and framing are unchanged.
  - Anchor and chapter stills were re-rendered; anchor_v1 files are kept.
- **Phone fallback:**
  - A "Simple view / Immersive view" switch (menu and footer), remembered on the device; `?view=simple` also works.
  - Phones with 2 or fewer cores and 4 GB or less memory, or on 2G, start in the simple view.
  - The frame-rate monitor now watches the whole visit. A sustained slowdown (e.g. a phone heating up) steps down to the lighter 3D, then to the simple view, with a short notice.
- **Search:** indexing is on (model consent confirmed), with a canonical URL, Open Graph and Twitter card (original logo on black), robots.txt and sitemap.xml.

## Adding new photos and clips from the Drive
1. Put the originals in the Drive folder "Slay shoot footages" (any size).
2. Add an entry to `CLIPS` (video segment: file, Drive id, start, duration) or `STILLS` (file, Drive id, frame time; a photo can be used directly) in `scripts/encode-brand-media.mjs`, then run it.
3. Reference the new base name in `src/content/media.ts`, with a short description of what is shown.
4. Build, test, push. Previews build automatically; merging to `main` deploys production.

## Update 3 (27 Nov 2026): bright identity, studio photographs
- **White by default:** the braids now sit on white (anchor_v3: white anchor world; light, geometry, shader, pose and framing as anchor_v2). The world behind the braids changes under the pages, so each chapter lifts into a new colour:

  | Chapters | World | Page across the hair |
  |---|---|---|
  | 1–3 | white | |
  | 3 | | black |
  | 4, FUTURA | SLAY red | |
  | 5, The Looks | white | |
  | 6, Lookbook | | red |
  | 7, The Promise | black | |
  | Ribbon, "Find your look", studio edit, enquiries | red, white, black, white | |

- **Header:** each part takes its colour from what lies under it; the white logo is used on red.
- **New sections:** a red brand ribbon (motion off for reduced motion), "Find your look" (the four looks, linking into Chapter 5), and "Braids in full colour" (the studio photographs).
- **Inspiration:** Lush Hair Africa (bold section heads, ribbon, style tiles). darlinghair.com refused automated access. Nothing was copied.
- **Studio photographs:** 12 photos from the Drive upload of 27 Nov ("Braids in full colour"); one is also the Chapter 3 portrait, and the logo card is the share image. Their provenance still needs to be confirmed (see `docs/production-assets.md`).

### Verification (27 Nov 2026, production deployment dpl_BqCCZ1Rf26Lg2zsFkP4TvvhtXKkc from main 4eb07e0, merged via [Slay-Braids/slay-braids-web#2](https://github.com/Slay-Braids/slay-braids-web/pull/2))
- **Public access:** https://slaybraids.vercel.app returns 200 with no login, with indexing allowed. robots.txt, sitemap.xml, og.jpg, the studio photos and the anchor_v3 stills are served with the correct types. Previews still redirect to Vercel login (302).
- **Smoke test, desktop 1440×900 and mobile 412×915:** 0 console errors and 0 failed requests. Every image in view loaded; the studio photos further down load lazily as you scroll. The 404 page works and the security headers are present. Screenshots are in `docs/review/prod-v3/`.
- **Local suite on the release build:** unit 51/51; end-to-end 71 passed, 1 skipped (by design).
- **Not done:** real-device testing (Galaxy A26, iPhone Safari, Samsung Internet).

## Update 4 (27 Nov 2026): dark mode, colours on every ground, FUTURA as a product
- **What the owner saw:** on a Samsung phone in dark mode the text was white on white, the reds were darkened and mismatched, and type crossed the braids. The cause was the browser's own "dark mode for websites" recolouring the page: the site declared light colours only, so Samsung Internet (and Chrome's auto-dark) inverted the page's colours but not the 3D braids. It was reproduced in Chromium with its forced-dark setting (`scripts/dev/forced-dark.mjs`).
- **Dark mode:**
  - The site follows the device's light/dark setting by default. A switch in the header (half-moon icon), the menu and the footer picks a theme, and the device remembers it; picking the system's own theme goes back to following it. `?theme=light|dark` also works.
  - The page now declares both colour schemes ("only light"/"only dark" when a theme is picked), so browsers' forced dark mode leaves it alone. This is checked in the tests.
- **Colours by tone:** every world, page and type colour now comes from a tone that each theme maps to a colour:

  | Tone | Light theme | Dark theme | Where |
  |---|---|---|---|
  | paper | white | black | Chapters 1–3 and 5, Find your look, Enquiries |
  | inverse | black | white | Chapter 3 and 4 pages, Chapter 7 |
  | red | SLAY red | SLAY red | Chapter 4 world, Chapter 6 page, ribbon |

  The studio gallery and the footer are black in both themes. Small red type on black uses a lighter red (#FF5A5F, 6.1:1); display-size red stays SLAY red.
- **Dark stills:** the same locked scene rendered on the black world. They are the anchor (`anchor_v3-dark-*`) and the Chapter 2, 3, 5 and 7 stills (`*-dark-*`); Chapter 4 is red in both themes, so it has one still. The light theme is unchanged from Update 3. The lock test still passes.
- **Legibility:**
  - Header controls sit on a soft blurred pill of their ground colour.
  - Phones get a taller reading field behind the hero headline, and the desktop hero and Chapter 7 fields are wider, so braids no longer cross the type.
  - On phones, the FUTURA intro sits right under its title, and the feature list then replaces both, so there is no empty band of red.
- **FUTURA:** presented as one of SLAY BRAIDS' products, not a brand: no wordmark treatment (spaced letters on the page). It is set as a chapter title under "A SLAY BRAIDS product". The intro reads "FUTURA is one of our products…", the source note says other hair brands use futura fibre too, and the footer reads "FUTURA is a SLAY BRAIDS product." A FUTURA logo is no longer on the list of missing items.

## Update 5 (27 Nov 2026): WhatsApp, photos confirmed
- **WhatsApp:** the owner confirmed the SLAY BRAIDS WhatsApp number, +234 903 685 7758, and it is now the enquiry channel.
  - Where it appears: a floating chat button (bottom right on every page; a green circle on phones, a "WhatsApp" pill on larger screens), "Chat on WhatsApp" in Enquiries with the number, a link in the menu and the number in the footer.
  - Every link opens `https://wa.me/2349036857758` with a short greeting filled in. The site itself has no form and sends nothing.
  - The number lives in `src/content/site.ts` (`contact.whatsapp`).
- **Studio photographs:** the owner confirmed they are real photographs.
- **Contact details (owner, 27 Nov 2026):**
  - Address: 11 Udeco Medical Road, Chevy View Estate, Chevron Drive.
  - Instagram @slayy_braids and @futurabyslaybraids; TikTok @slay.braids4 and @futura.by.slay.
  - Shown in Enquiries ("Visit us", "Follow us") and in the footer, as text links (no platform logos). Orders are taken on WhatsApp for now; full online ordering comes later.
- **Privacy policy:** a plain-language draft for management to review (with a lawyer) is in Claude Docs. It is not on the site yet.
- **Samsung Internet:** it still darkened the page after Update 4. The dark tokens are now also set under `@media (prefers-color-scheme: dark)` in the stylesheet, which Samsung Internet is believed to look for before forcing its own dark mode. Chrome's forced dark was already handled; Samsung Internet itself cannot be tested here and needs a check on a real phone.
- **FUTURA features on phones:** shown in two pages (01–03, then 04–06) as you scroll, so the list fits the screen even with large text settings.
