import { useEffect, useState } from "react";

// Tracks whether the viewport is below Tailwind's `lg` breakpoint (1024px), so
// the results view can swap its desktop split-pane for a single-screen
// drill-down (stats → filtered plays → replay). Initialised from matchMedia so
// the first paint already matches the device — no desktop-layout flash on phones.
export function useIsMobile(breakpoint = 1024): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return isMobile;
}
