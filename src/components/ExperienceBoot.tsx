"use client";

import { useEffect } from "react";

/** Starts the experience after hydration. Everything heavy is dynamically imported inside. */
export function ExperienceBoot() {
  useEffect(() => {
    const root = document.getElementById("experience");
    if (!root) return;
    void import("@/experience/reveal").then((m) => m.initReveals(root));
    void import("@/experience/interactions").then((m) => m.initInteractions(root));
    void import("@/experience/media").then((m) => m.initMedia(root));
    void import("@/experience/controller").then((m) => m.initExperience(root));
  }, []);
  return null;
}
