/**
 * Review / test flags for the chapters (query or hash, like the M1 flags):
 *  - windt-<s> / ?windt=s   hold wind at full strength and time at s seconds (deterministic)
 *  - vh-<n> / ?vh=n         start at scroll position n vh (lab, frame sheets)
 *  - nodamp                 camera follows scroll without damping (contrast check, frame sheets)
 *  - lab-transition         open the Chapter 3 transition lab
 *  - still-matched          compare the live first frame with the density-matched still (I6)
 */
export interface ChapterFlags {
  windT?: number;
  vh?: number;
  noDamp: boolean;
  lab: boolean;
  stillMatched: boolean;
}

export function parseChapterFlags(search: string, hash: string): ChapterFlags {
  const q = new URLSearchParams(search);
  const h = hash.replace(/^#/, "").toLowerCase();
  const num = (qs: string | null, re: RegExp) => {
    const v = qs ?? re.exec(h)?.[1];
    return v != null && v !== "" && Number.isFinite(+v) ? +v : undefined;
  };
  return {
    windT: num(q.get("windt"), /windt-([\d.]+)/),
    vh: num(q.get("vh"), /(?:^|-)vh-([\d.]+)/),
    noDamp: q.get("nodamp") === "1" || /(^|-)nodamp($|-)/.test(h),
    lab: q.get("lab") === "transition" || /(^|-)lab-transition($|-)/.test(h),
    stillMatched: q.get("stillmatched") === "1" || /(^|-)still-matched($|-)/.test(h),
  };
}
