import { useEffect, useRef } from "react";

/* Fires when the app returns to the foreground: the tab becomes visible again,
   or the page is restored from the back/forward cache. Mobile browsers suspend
   timers while a PWA is backgrounded (and bfcache restores kill them outright),
   so interval-based polling alone leaves stale scores on screen at reopen. */
export function useResume(onResume) {
  const cb = useRef(onResume);
  cb.current = onResume;
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) cb.current();
    };
    const onShow = (e) => {
      if (e.persisted) cb.current();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);
}
