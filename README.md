# Golazo ⚽ — FIFA World Cup 2026 Tracker

**Live app: https://pbparthas.github.io/wc-tracker/** — open on your phone and
"Add to Home Screen" (or use the in-app install button).

An IST-first, mobile-only, installable PWA for following the 2026 World Cup
(48 teams · 104 matches · 11 June – 19 July). Live scores with match stats and
minute-by-minute commentary, full schedule, groups and the best-thirds race,
knockout bracket, tournament squads with player profiles, stadium guides,
kickoff weather, Golden Boot, calendar reminders — plus AI previews, recaps,
digests and qualification scenarios powered by **your own free Gemini key**.

**Runs on a shoestring**: static hosting on GitHub Pages, live data from API-Football
(via a tiny Cloudflare Worker proxy) with ESPN's public feed as automatic backup,
no accounts, no tracking. Each visitor's Gemini key lives only on their
own device.

Full product spec (features, design system, security model): [`docs/SPEC.md`](docs/SPEC.md)

> **Unofficial fan project** — not affiliated with or endorsed by FIFA, ESPN,
> Google or any team. Data comes from API-Football and ESPN's public feed; all
> trademarks belong to their owners.

## Develop

```bash
npm ci
npm run dev        # local dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons from public/icon.svg
```

## Deploy your own copy (GitHub Pages, free)

Anyone can run their own Golazo — there's no server to pay for:

1. **Fork** this repo (keep it public; Pages is free on public repos).
2. One-time: repo **Settings → Pages → Source = "GitHub Actions"**.
3. If your fork has a different name, change `base` in `vite.config.js` and the
   `og:url`/`og:image` URLs in `index.html` to match.
4. Push (or merge) to `main` — `.github/workflows/deploy.yml` lints, tests,
   builds and deploys to `https://<your-username>.github.io/<repo-name>/`.

Found a bug? [Open an issue](https://github.com/pbparthas/wc-tracker/issues).

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
