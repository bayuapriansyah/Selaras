"use client";

import { useEffect, useState } from "react";

export function useActiveSection(hrefs: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || hrefs.length === 0) return;

    const ids = hrefs.map((h) => h.replace("#", ""));

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // Track the topmost visible section
    const observer = new IntersectionObserver(
      () => {
        // Find which section's top edge is closest to (but above) the center of the viewport
        const mid = window.innerHeight * 0.45;

        let closest: HTMLElement | null = null;
        let closestDist = Infinity;

        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          // Section must have started (top < mid) and not ended far above viewport
          if (rect.top <= mid && rect.bottom > 0) {
            const dist = Math.abs(rect.top - mid);
            if (dist < closestDist) {
              closestDist = dist;
              closest = el;
            }
          }
        }

        if (closest) {
          setActive(`#${closest.id}`);
        }
      },
      {
        // Fire whenever any part of a section crosses multiple thresholds
        rootMargin: "0px 0px -30% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [hrefs]);

  return active;
}
