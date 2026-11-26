# M1 real-device test protocol

Headless browsers render WebGL on the CPU (SwiftShader), so lab numbers cannot tell us how the
cascade runs on real phones and laptops. Please run these checks on real devices.

## Devices (minimum set)

| #   | Device class           | Example                                                                |
| --- | ---------------------- | ---------------------------------------------------------------------- |
| 1   | Recent iPhone          | iPhone 13 or newer, Safari                                             |
| 2   | Mid-range Android      | Pixel 6a / Galaxy A54 class, Chrome                                    |
| 3   | Low-end Android        | Any 2019–2021 budget phone, Chrome                                     |
| 4   | Laptop, integrated GPU | MacBook Air M1/M2 or Windows laptop with Intel/AMD integrated graphics |
| 5   | Desktop, dedicated GPU | Any desktop with a discrete GPU                                        |

## Steps (≈5 minutes per device)

1. Open the preview with **`#perf`** added to the address (e.g. `…/artifact/<id>#perf`).
   Wait 10 seconds without touching the screen.
2. Watch the first second: the still image should turn "alive" without any visible jump.
   Note: _seamless / slight change / visible jump_.
3. Move the mouse (or drag a finger) across the loose strands. Note: _responsive / laggy_.
4. Scroll slowly to the bottom and back to the top. Note: _smooth / stutters / jumps_.
5. Tap **Copy results** in the performance box and paste the text into the results sheet.
   (If copying is blocked, take a screenshot of the box.)
6. Repeat once with **`#perf-tier-b`** (lighter cascade) on devices 1–3.
7. Turn on the device's _Reduce motion_ setting and reload: you should see a still image only,
   with all text readable. Turn the setting off afterwards.

## Pass criteria for M1

| Measure                       | Desktop / laptop    | Phones                                                          |
| ----------------------------- | ------------------- | --------------------------------------------------------------- |
| Median frame rate (HUD `fps`) | ≥ 55 fps            | ≥ 45 fps on device 1–2 (tier B)                                 |
| Frame time p95                | ≤ 25 ms             | ≤ 34 ms                                                         |
| LCP (HUD)                     | ≤ 1.5 s on Wi-Fi    | ≤ 2.0 s on 4G                                                   |
| Handoff                       | seamless            | seamless or slight softening                                    |
| Downgrades                    | none on devices 4–5 | device 3 may drop to the still — that is the intended behaviour |

---

## M2 addendum: Chapters 1–3 preview (≈8 minutes per device)

Use the same devices. Open the M2 preview link.

1. **`#perf`**: wait 10 s at the top. In the box, note the **handoff Δ** line (raw / perceptual).
   Then scroll slowly from the top through Chapter 3 until the ivory end card fills the screen,
   and back. Tap **Copy results**. The results now include frame times per chapter, the
   **Chapter 3 transition** alone (P50/P95/P99), long tasks and CLS.
2. Look at the Chapter 3 page while it rests against the hair: _does the page edge sit along the
   hair and stay with it when the hair moves (touch / move the pointer over the strands)?_
   Note: _attached / slight lag / visibly detached_.
3. **`#lab-transition`**: tap **Run accuracy test (30 s)** and keep the screen still (the test
   scrolls and moves a virtual pointer itself). Tap **Copy results**. This measures the page edge
   against this device's own GPU; pass = P99 ≤ 2 px and max ≤ 3 px, for points and edge.
4. Phones only (devices 1–3): open **`#perf-still-matched`** and note the handoff Δ again (I6,
   density-matched still, experimental). We adopt it only if it lowers Δ on real phones.
5. With _Reduce motion_ on: Chapters 2 and 3 should appear as still spreads (braids close-up, then
   the hair with the ivory page), all text readable, nothing moving.

| Measure (Chapters 1–3)           | Desktop / laptop | Phones                         |
| -------------------------------- | ---------------- | ------------------------------ |
| Chapter 3 transition frame P95   | ≤ 25 ms          | ≤ 34 ms                        |
| Page edge accuracy (lab)         | P99 ≤ 2 px, max ≤ 3 px | P99 ≤ 2 px, max ≤ 3 px   |
| Long tasks while scrolling       | none > 100 ms    | none > 200 ms                  |
| CLS                              | ≤ 0.05           | ≤ 0.05                         |
