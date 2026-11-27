/**
 * DOM state for Chapters 4–7, from the same scroll value as the camera and the page (see
 * driver.ts for Chapters 1–3). Opacity and transforms only; chapter text stays in the
 * accessibility tree whether or not it is on screen (the M2 TalkBack rule).
 */
import type { Orientation } from "../cascade/geometry";
import { STORY, ch4State, ch5State, ch6State, ch7State } from "./story";

const pad = (n: number) => String(n).padStart(2, "0");

export class StoryDriver {
  private ch4Frame: HTMLElement | null;
  private ch4Printed: HTMLElement | null;
  private ch4Title: HTMLElement | null;
  private ch4Line: HTMLElement | null;
  private ch5Frame: HTMLElement | null;
  private productEls: HTMLElement[];
  private counter: HTMLElement | null;
  private ch6Frame: HTMLElement | null;
  private ch6Intro: HTMLElement | null;
  private ch6Spread: HTMLElement | null;
  private ch7Frame: HTMLElement | null;
  private ch7Content: HTMLElement | null;
  private lastProduct = -1;
  /** The product shown by the showcase (read by the showcase controls). */
  product = 0;

  constructor(root: HTMLElement) {
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    this.ch4Frame = q("[data-ch4-frame]");
    this.ch4Printed = q("[data-ch4-printed]");
    this.ch4Title = q("[data-ch4-title]");
    this.ch4Line = q("[data-ch4-line]");
    this.ch5Frame = q("[data-ch5-frame]");
    this.productEls = [...root.querySelectorAll<HTMLElement>("[data-product]")];
    this.counter = q("[data-counter]");
    this.ch6Frame = q("[data-ch6-frame]");
    this.ch6Intro = q("[data-ch6-intro]");
    this.ch6Spread = q("[data-ch6-spread]");
    this.ch7Frame = q("[data-ch7-frame]");
    this.ch7Content = q("[data-ch7-content]");
  }

  update(o: Orientation, vh: number) {
    const f = (x: number) => x.toFixed(3);
    const s4 = ch4State(o, vh);
    if (this.ch4Frame) {
      this.ch4Frame.dataset.visible = String(s4.visible);
      this.ch4Frame.style.setProperty("--field", f(Math.max(s4.title, s4.line)));
    }
    if (this.ch4Printed) this.ch4Printed.style.opacity = f(s4.printed);
    if (this.ch4Title) {
      this.ch4Title.style.opacity = f(s4.title);
      this.ch4Title.style.transform = `translate3d(0, ${((1 - s4.title) * 24).toFixed(1)}px, 0)`;
    }
    if (this.ch4Line) this.ch4Line.style.opacity = f(s4.line);

    const s5 = ch5State(o, vh);
    if (this.ch5Frame) {
      this.ch5Frame.dataset.visible = String(s5.visible);
      this.ch5Frame.style.setProperty("--ch5-shown", f(s5.shown));
    }
    this.product = s5.product;
    if (s5.product !== this.lastProduct) {
      this.productEls.forEach((p, i) => (p.dataset.active = String(i === s5.product)));
      if (this.counter) this.counter.textContent = pad(s5.product + 1);
      this.lastProduct = s5.product;
    }

    const s6 = ch6State(o, vh);
    if (this.ch6Frame) this.ch6Frame.dataset.visible = String(s6.visible);
    if (this.ch6Intro) this.ch6Intro.style.setProperty("--ch6-intro", f(s6.intro));
    if (this.ch6Spread) {
      this.ch6Spread.style.opacity = f(s6.spread);
      // `translate` (rise) composes with `transform` (riding the page, set by the live page).
      this.ch6Spread.style.translate = `0 ${((1 - s6.spread) * 28).toFixed(1)}px`;
      if (vh < STORY[o].ch7Lift[0]) this.ch6Spread.style.transform = "";
    }

    const s7 = ch7State(o, vh);
    if (this.ch7Frame) {
      this.ch7Frame.dataset.visible = String(s7.visible);
      this.ch7Frame.style.setProperty("--ch7-field", f(s7.line));
    }
    if (this.ch7Content) {
      this.ch7Content.style.opacity = f(s7.line);
      this.ch7Content.style.transform = `translate3d(0, ${((1 - s7.line) * 4).toFixed(2)}%, 0)`;
    }
  }
}
