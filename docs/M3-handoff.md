# SLAY BRAIDS website — complete build (Chapters 1–7): management handoff

27 Nov 2026 · branch `claude/cool-ramanujan-0ln9mf` · evidence in `docs/perf/` and `docs/review/m3/`

Private preview (same build, bundled for claude.ai): https://claude.ai/artifact/JzJ18xCxDRpcuqzUsRYoUy ·
Handoff page with screenshots: https://claude.ai/artifact/EHjBZeb7piYUoYyA4NhKfr

**Status: complete technical build, on automated evidence only. Real-device validation is
outstanding. Not approved for public release. Not deployed to Vercel (see §6).**

## 1. The seven chapters

One continuous scroll. One camera, one ivory page and one light carry the story. Nothing
resets at a chapter boundary.

| # | Chapter (working title) | What happens | Desktop / mobile |
|---|---|---|---|
| 1 | Arrival | The approved anchor (anchor_v1) and the positioning line, *Premium look. Affordable price.* | unchanged (approved) |
| 2 | The Craft | Close on the woven braids; three manifesto lines reveal in order | unchanged (approved) |
| 3 | The Unbraiding | The ivory page meets the loose hair along its edge, then closes over it | unchanged (approved) |
| 4 | FUTURA | The covering page carries *04 FUTURA* printed on it, lifts with a straight edge, and reveals FUTURA in pearl light beside the hair. Line: "FUTURA is a SLAY BRAIDS product line." | Desktop: the page rests beside the title, then draws back. Mobile: it lifts straight off. |
| 5 | The Collection | Pinned showcase over the hair. One product per scroll step, with Previous/Next controls, shade selector, price slot and "Enquire about this product" | Desktop: card on the left, hair on the right. Mobile: card in the lower screen. |
| 6 | Lookbook | The page meets the hair again at a new pose, closes, and becomes the printed lookbook spread (3 mounts) | Desktop: three-column spread. Mobile: one large and two small mounts. |
| 7 | The Promise | The last lift, a straight edge. The camera pulls back, the light returns to champagne and the positioning line returns with both calls to action | as desktop, stacked |
| — | Enquiry, footer | Enquiry form with validation (does not send), footer navigation | responsive |

## 2. Features

- **Navigation:**
  - Header menu (modal dialog) and the chapter index (7 ticks) list all seven chapters; the footer has chapter links.
  - In the live experience, each chapter link lands on that chapter at its settled state, with the camera snapped (no flight through the whole story), and focus moves to the chapter heading.
- **Keyboard:**
  - Focus follows into the fixed chapter frames: tabbing to a product or a call to action brings it on screen.
  - Swatches are radio buttons; all controls are at least 44 px.
- **Showcase:** scroll-driven. Previous/Next glide to the next product and announce "Product 2 of 3: …" through a polite live region. In the static spreads, all products are shown, and the controls step through them in place.
- **Enquiry:**
  - Name, email, topic and message are validated. Errors are tied to their fields; focus goes to the first invalid field.
  - On success the form states plainly that nothing was sent or stored. No network request is made (tested).
  - "Enquire about this product" preselects the FUTURA topic and notes the product and shade.
- **Loading and error states:**
  - Anchor still first (it is the LCP element); 3D only after.
  - If anything fails while starting the live experience, or if the WebGL context is lost, the visitor gets the static spreads (tested).
  - Without JavaScript, all seven chapters are readable as printed spreads (tested).
  - Branded 404 page.
- **Reduced motion, tier C and slow devices:** static spreads with stills rendered from the locked scene for Chapters 2, 3, 4, 5 and 7; Chapter 6 is printed on ivory.
- **Rotation:** the reader keeps their place (chapter, progress and product) when a phone rotates. This closes the M2 open risk in emulation; it is not confirmed on a device.
- **Rendering pause (I4):** rendering stops whenever a page or the enquiry covers the screen: the end of Chapter 3, the start of Chapter 4 and the Chapter 6 spread.

## 3. Technical implementation

- **Camera:** `cameraTimeline.ts` continues after K2 with rest stops K3 (FUTURA), K4 (one per product, slight drift), K5 (lookbook) and K6 (pull-back). Every Chapter 1–3 segment is the same curve as before: the unit test checks equality at every 0.5 vh.
- **Light:** `CascadeScene.setCameraTimeline(fn, pearl)` takes an optional pearl curve for the existing, locked `uPearl` uniform. It is 0 throughout Chapters 1–3 and pearl in Chapters 4–6. The uniforms block is unchanged (lock test 6/6).
- **Story layout and page states:**
  - `story.ts` holds pure functions shared by the live page, the static spreads and the tests: layout, page states, landing points and the rotation map.
  - The page uses one guide strand per pose (K2, K3, K5) and a straight edge for the lifts.
- **DOM:**
  - `storyDriver.ts` drives Chapters 4–7 from the same scroll clock as the camera.
  - `interactions.ts` handles navigation, focus, the showcase and the enquiry on every tier.
- **Content:** `products.ts` renders a price, swatch or photo only when it has an approval record (name and date). Claims pass through `publishableClaims`.
- **Hosting config:**
  - `vercel.json`: security headers, `noindex` while in preview, immutable caching for hashed assets.
  - `scripts/deploy-preview.mjs`: the deploy script.

### Changes to approved foundations (minimal, documented)

| Change | Why | Effect on Chapters 1–3 |
|---|---|---|
| `.ch3` section 350 → 250 vh (portrait 320 → 220) | Chapter 4 begins where the page has covered the screen; the M2 one-screen tail and end card are replaced by Chapter 4 | none: frames are fixed; pixel check below |
| Optional pearl curve argument in `CascadeScene` | Chapter 4 light | none: 0 in Chapters 1–3; uniforms block hash unchanged |
| Chapter index 3 → 7 ticks; menu lists 7 chapters | Navigation | index strip only |
| Hero "Discover FUTURA" → `#ch4` | Was the end card | none visual |
| `<html data-static>` by default, removed by the inline script | Page readable without JavaScript | none with JavaScript |
| `chapterIndex` replaces the 3-chapter tick logic (same switch points) | 7 chapters | none |

**Chapters 1–3 pixel check** (approved M2 build vs this build, live, deterministic wind, SwiftShader; chapter-index strip and preview banner masked):

- **Exact:** 22 of 27 frames are identical.
- **Differing:** 5 mobile frames at 100–260 vh differ by at most 1/255 in one channel, on 5–7 % of pixels, inside the Chapter 2 reading field.
- **Cause:** browser compositing of the added (invisible) Chapter 4–7 layers. Hiding them restores exact identity.
- **Verdict:** not visible.
- **Fixed along the way:** 2 regressions found by this check (a shared placeholder rule and extra compositor layers).

## 4. QA results (automated; SwiftShader / emulated devices, never a real GPU or phone)

| Area | Result |
|---|---|
| Locked foundation | anchor_v1 lock test 6/6; 18 anchor encodes and the 36 M2 stills match their manifests (sha256); masters unmodified since 26 Nov 12:03 |
| Unit tests | 49/49 (36 existing + 13 new story tests) |
| End-to-end | M1 suite 15 passed + 1 skipped by design (unchanged) · M2 suite 20/20 (unchanged) · new M3 suite 26/26 · total 61 passed, 1 skipped |
| Accessibility | axe: no WCAG 2.1 A/AA violations on static, reduced and live pages (live checked at Chapters 3, 5 and 7) · accessibility tree identical in live and reduced mode at 8 positions on each device across all seven chapters · Lighthouse accessibility 100 |
| Contrast, Chapters 4–7 | 448 samples, 0 below WCAG AA; worst 6.08:1 (ivory lookbook captions); all text over the hair ≥ 7:1 (§4a) |
| Loading (Lighthouse lab, gzip as on a host) | LCP mobile 0.75 s (approved build 0.76 s), desktop 0.24 s (0.21 s) · CLS 0 / 0 |
| Static-mode cost | mobile static Lighthouse performance 86 (approved build 96): TBT 559 ms vs 246 ms, from hydrating the larger page |
| Bundle | initial JS 138.4 KB gzip (approved 134.9) · lazy JS 338.2 KB (333.2) · CSS 8.6 KB (6.6) · HTML 51.8 KB raw / 8.2 KB gzip (23.6 KB raw) |
| Layout | no horizontal overflow on the static spreads (desktop and Pixel 7) |
| Rotation | portrait → landscape keeps the same chapter and product (emulated) |
| Frame sheets | `docs/review/m3/sequence-*.jpg` (live), `static-*.jpg` (reduced/static) |

### 4a. Contrast (Chapters 4–7, live)

- **Method:** 448 text samples at the settled state of each chapter and each product, on 4 viewports (1440×900, 1920×1080, 412×915, 390×844), 2 wind phases. Each text's colour is composited over the brightest 5 % (light text) or darkest 5 % (dark text) of the pixels behind it.
- **Result:** no sample below WCAG AA. The worst is 6.08:1: the 11 px placeholder captions on the ivory lookbook mounts.
- **Over the hair:** every text sample over the hair (FUTURA, the Collection, the Promise) is at or above 7:1.
- **Below AAA:** the 64 samples under 7:1 are all secondary text on the ivory lookbook page.

## 5. Known limitations and content still required

Every gap is shown on the page as a marked placeholder. Nothing is invented.

**Content and assets (from SLAY BRAIDS management):**

1. SLAY BRAIDS logo file and FUTURA logo file (never recreated; text placeholders today).
2. The FUTURA range: product names, shades (approved swatch colours from photographed samples), prices, product photography, and any approved claims. Today: 3 structural placeholders, "Price to be confirmed".
3. Lookbook photography and film loop, with **signed model releases** (hard requirement).
4. Chapter 3 portrait photography (with release).
5. Approved wording:
   - Manifesto lines (Chapter 2), the Chapter 3 line and the lookbook line.
   - Chapter titles (working titles today).
   - FUTURA line confirmation; CTA wording.
6. Business model: products, braiding services or both (decides the enquiry topics).
7. Enquiry routing (where messages go) and a privacy notice. The form does not send.
8. Contact details, legal pages (privacy, terms, cookies), social links.
9. Recolour variant (D4): not adoptable until shades are approved; photography-only is the fallback.

**Technical:**

- No real-device evidence for any chapter: frame rate, thermal, page-edge accuracy on a real GPU, touch feel, TalkBack and VoiceOver speech.
- iOS Safari and Samsung Internet: not tested in any form.
- The runtime monitor judges only the first 1–3 s, so a slowdown later in a session (thermal throttling) does not downgrade.
- Static-mode TBT rose (see §4).
- The preview banner and `noindex` must be removed for launch.

## 6. Deployment: what happened, and the blocker

- **Before:**
  - Vercel team `slay-braids` had 0 projects, 0 deployments, 0 domains.
  - The API is reachable through this session's saved credential (vercel.com itself is blocked here).
- **27 Nov, 12:19 UTC:**
  - I created project `slay-braids-web` and deployed through the API without a target, expecting a preview.
  - **Vercel makes a project's first deployment a production deployment.** It was promoted to `slay-braids-web.vercel.app`, which was publicly reachable (HTTP 200).
  - I deleted the deployment at about 12:22 UTC: the URLs then returned 404. Public for about 3 minutes.
  - Content: this build, with the preview banner and `noindex`. No custom domain existed, so none was overwritten.
- **Second attempt:** with `target: "preview"`, the API again returned a production deployment. The script's guard deleted it immediately, while it was still initialising; both aliases returned 404 afterwards.
- **Now:**
  - Project `slay-braids-web` exists with 0 deployments.
  - Its default domain `slay-braids-web.vercel.app` serves nothing (404).
  - Deployment Protection (Vercel Authentication) is on for deployment URLs.
- **Blocker:** a true *preview* deployment on this new project needs one of these:
  - **(a) A staged production deployment.** `autoAssignCustomDomains: false`, equivalent to `vercel deploy --prod --skip-domain`. It is built and reachable only at its own protected URL, with nothing promoted; launch is then one "Promote" click. The script is ready for this; the action was stopped by this session's permission check and needs your explicit go-ahead.
  - **(b) Connect the GitHub repository to the project.** Branch pushes then create preview deployments; pushes to `main` would deploy production.
  - **(c) You run** `vercel deploy` from your own machine, with the knowledge above.
- **Rollback:** every Vercel deployment is immutable and stays listed, so rolling back is promoting or aliasing an earlier one. Locally, every step is a git commit on this branch.

## 7. Launch recommendations

1. **Before any public URL:**
   - Supply the logo files, range data and approved copy.
   - Signed model releases before any identifiable footage.
2. **Device smoke test (about 12 minutes):** the A26 subset from `docs/M2-ch1-3-assessment.md`, plus one pass through Chapters 4–7 on the A26 and on an iPhone (Safari).
3. **Decide the deployment route** (§6), then deploy a protected preview for management review and share it with a Vercel share link.
4. **For launch:**
   - Remove the preview banner and `noindex`.
   - Add legal pages, analytics consent if any, and the custom domain.
   - Re-run Lighthouse and axe on the deployed URL, then promote.
