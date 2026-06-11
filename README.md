# Golazo ⚽ — FIFA World Cup 2026 Tracker

An IST-first, mobile-only, installable PWA for following the 2026 World Cup
(48 teams · 104 matches · 11 June – 19 July). Live scores, full schedule, groups,
third-place race, knockout bracket, Golden Boot, calendar reminders — plus AI match
previews, recaps and digests powered by **your own free Gemini key**.

**Costs $0 to run**: static hosting on GitHub Pages, ESPN's free public feed for data,
no server, no accounts, no tracking.

Full product spec (features, design system, security model): [`docs/SPEC.md`](docs/SPEC.md)

## Develop

```bash
npm ci
npm run dev        # local dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons from public/icon.svg
```

## Deploy (GitHub Pages, free)

1. One-time: repo **Settings → Pages → Source = "GitHub Actions"**.
2. Push (or merge) to `main` — `.github/workflows/deploy.yml` builds and deploys.
3. App lives at **https://pbparthas.github.io/wc-tracker/** — open on your phone and
   "Add to Home Screen".

Recommended free repo settings: enable **Dependabot alerts** and **secret scanning**
(Settings → Code security).

## Security notes

- No secrets in the repo, CI, or bundle — the deploy workflow needs none.
- Your Gemini key is entered in the app's Settings, stays on your device
  (localStorage/sessionStorage, your choice), and is sent only to
  `generativelanguage.googleapis.com` in a header — never in a URL.
- `.npmrc` pins exact dependency versions and disables npm install scripts
  (supply-chain hardening); CI installs from the committed lockfile only.
- A strict Content-Security-Policy is injected at build time: only first-party
  scripts run, and the app can talk only to ESPN and Google's Gemini endpoint.

## Data sources

- **ESPN public JSON API** (keyless): scores, fixtures, standings, match details,
  scorers. Unofficial — all parsing is defensive and the app degrades to last-saved
  data if the feed changes or goes down.
- **Gemini** (user-supplied key): previews, recaps, daily digest, team deep-dives —
  always grounded in ESPN facts; plus an emergency search-grounded scores fallback
  if ESPN is unreachable.
