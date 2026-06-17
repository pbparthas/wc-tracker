import { useRef, useCallback } from "react";

export function useSwipeTabs(tabs, activeTab, setTab) {
  const touchRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (idx < 0) return;
    if (dx < 0 && idx < tabs.length - 1) setTab(tabs[idx + 1].id);
    if (dx > 0 && idx > 0) setTab(tabs[idx - 1].id);
  }, [tabs, activeTab, setTab]);

  return { onTouchStart, onTouchEnd };
}
