"use client";

import { useEffect } from "react";

/** Starts the experience after hydration. Everything heavy is dynamically imported inside. */
export function ExperienceBoot() {
  useEffect(() => {
    const root = document.getElementById("experience");
    if (!root) return;
    void import("@/experience/reveal").then((m) => m.initReveals(root));
    void import("@/experience/controller").then((m) => m.initExperience(root));
  }, []);
  return null;
}
