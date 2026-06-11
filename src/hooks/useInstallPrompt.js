import { useSyncExternalStore } from "react";

/* beforeinstallprompt fires once, early — often before React mounts — so the
   event is captured at module scope and components subscribe to changes. */
let deferred = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f());

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // suppress the mini-infobar; we render our own button
  deferred = e;
  emit();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  emit();
});

const subscribe = (f) => {
  subs.add(f);
  return () => subs.delete(f);
};
const getSnapshot = () => !!deferred;

export function useInstallPrompt() {
  const hasPrompt = useSyncExternalStore(subscribe, getSnapshot);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS masquerades as a Mac

  const install = async () => {
    if (!deferred) return;
    const ev = deferred;
    ev.prompt();
    const choice = await ev.userChoice;
    if (choice.outcome === "accepted") {
      deferred = null;
      emit();
    }
  };

  return { canPrompt: hasPrompt && !standalone, standalone, isIos, install };
}
