# Golazo — FIFA World Cup 2026 Tracker · Product Spec

An installable, IST-first Progressive Web App for following the 2026 FIFA World Cup
(USA · Mexico · Canada, 11 June – 19 July 2026, 48 teams, 104 matches).

**Hard constraint: $0 to run.** Static hosting on GitHub Pages, no server, no paid APIs.

---

## 1. Audience & principles

- Built for a fan in India: every time shown is IST, with "tonight / tomorrow" labels
  relative to the IST calendar day.
- **Mobile-only.** Designed and tested for phones (portrait, installed as a PWA);
  no desktop layouts are built or supported.
- Glanceable first: the answer to "is there a match on right now, and what's the score?"
  must be on screen within one second of opening the app — even offline (last-known data).
- The device is the boundary: no accounts, no analytics, no tracking, no server of ours.
  All personal state (favorites, API key, caches) lives on-device only.

## 2. Features

### 2.1 Matches (home tab)
- **Hero**: live match with score and status, or countdown (HH:MM:SS) to the next kickoff.
- **Full schedule**: every one of the 104 matches, browsable day-by-day via a horizontal
  date strip (snaps to today). Live / Upcoming / Results sections for the selected day.
- **Favorites pinned**: matches involving favorite teams appear in a "Your teams" section
  on top and carry a highlight accent everywhere.
- **Daily AI digest** (needs Gemini key): one tap generates "last night's results +
  tonight's fixtures" in 150–250 words.
- Auto-refresh every 60 s while any match is live; paused when the app is backgrounded.

### 2.2 Match detail (`/match/:id`)
- Score, status, stage, venue, kickoff in IST.
- **Timeline**: goals, penalties, own goals, cards, substitutions with minutes.
- **Lineups**: formations, starters, bench for both teams.
- Match info: attendance, referee, venue.
- **Add to calendar**: downloads a `.ics` file (30-minute pre-kickoff alarm) — the free,
  serverless alternative to push notifications.
- **AI preview** (pre-match) / **AI recap** (post-match), grounded in real data.

### 2.3 Groups tab
- All 12 group tables (A–L) with P/W/D/L/GD/Pts; top-2 highlighted, dashed
  qualification line.
- **Third-place tracker**: live ranking of the twelve 3rd-placed teams — the best 8
  advance under the 48-team format. Ranked by points → goal difference → goals for →
  wins, with a footnote that fair-play/lots tiebreakers are approximated.

### 2.4 Knockout tab
- Phase timeline (Round of 32 on 28 June through the Final at MetLife on 19 July).
- **Live bracket**: horizontally scrollable R32 → Final tree. Before teams are known it
  shows the official slot map ("1A vs 3rd C/D/F"); slots fill in automatically as teams
  qualify and results land.

### 2.5 Teams tab
- All 48 teams by group, each with flag, group, and a hand-written trivia note.
- **Team page** (`/team/:code`): trivia, group standing, fixtures, favorite toggle, and an
  **AI deep-dive** (needs key): star players, head-to-head storylines, tournament outlook.

### 2.6 Stats
- **Top scorers (Golden Boot race)** from ESPN's free statistics feed, surfaced on the
  Groups tab (or its own card) with goals and assists.

### 2.7 Settings (gear icon, `/settings`)
- Gemini API key management (see §5), model picker (default `gemini-2.5-flash`).
- Favorite teams manager.
- "Clear cached data" (AI cache + schedule snapshots).
- About: data sources, privacy statement.

### 2.8 PWA behaviour
- Installable to the home screen (manifest + icons + service worker), standalone display,
  dark splash.
- **Offline**: app shell, fonts, and last-fetched scores/standings render with no network,
  with a "showing data from HH:MM IST" banner. Updates apply automatically with a
  "refresh for the latest version" toast.

## 3. Data architecture

| Layer | Source | Cost |
|---|---|---|
| Live scores, fixtures, standings, match details, top scorers | ESPN public JSON API (`site.api.espn.com`) — keyless, CORS-open | Free, no quota |
| Narrative (previews, recaps, digest, team deep-dives) | Gemini API, **user's own free-tier key**, grounded in injected ESPN facts | Free tier |
| Emergency fallback if ESPN breaks | Gemini with Google Search grounding answers "yesterday's results / today's fixtures" | User's free grounding quota |

Why not Gemini for live data? An LLM has no real-time knowledge; ungrounded answers
would be invented, and grounded ones are slow, quota-capped, and unstructured. ESPN
supplies facts; Gemini supplies stories. The fallback path exists only for resilience
(ESPN's API is unofficial) and is clearly labelled "AI-sourced, may be imprecise" when
active.

Caching: schedule is fetched in 7-day chunks; finished chunks are immutable and never
refetched; today's chunk refreshes every 60 s during live play; future chunks every 12 h.
AI responses cache on-device (immutable content cached forever) to protect the free quota.

## 4. Design system

Identity: **Golazo**, in the **"Night Pitch"** theme — a night-football aesthetic for IST
viewers watching at midnight. Dark pitch-green surfaces, chalk-line text, saffron accents.

### Colors
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B1512` | App background (near-black green) |
| `--card` | `#13211A` | Cards/surfaces |
| `--line` | `rgba(232,239,230,.09)` | Hairline borders |
| `--chalk` | `#EDF3EA` | Primary text (chalk white) |
| `--muted` | `#8FA396` | Secondary text |
| `--saffron` | `#FF9D3C` | Accent: times, highlights, active tab, favorites |
| `--gold` | `#D9B64A` | Trophy/final accents |
| `--live` | `#FF5A5A` | Live indicators |
| `--pitch` | `#1E4633` | Buttons / pitch green |

### Typography & layout
- Display: **Saira Condensed** (600/800), tight tracking, uppercase — scoreboard voice.
- Body/UI: **Inter** (400/500/600), 14 px base. Tabular numerals for scores and tables.
- Fonts self-hosted via `@fontsource` (bundled, offline-capable, no Google Fonts request).
- Single column, phone-first and phone-only (portrait-locked in the manifest); fixed
  bottom tab bar (Matches / Groups / Knockout / Teams) with safe-area padding and
  thumb-sized (≥44 px) touch targets; Settings via header gear.
- Motion: a single pulse animation for live dots/loading; honors `prefers-reduced-motion`.
- Flags: ESPN logo images preferred (emoji flags break on Windows and for England/
  Scotland), emoji as fallback.
- Accessibility: visible focus rings (saffron), `aria-current` on tabs, semantic tables,
  ≥4.5:1 contrast for text tokens on `--bg`/`--card`.

## 5. Security & privacy (infosec)

### Threat model
Static single-origin PWA, no backend. Assets worth protecting: (1) the user's Gemini API
key, (2) integrity of what the app renders. Main risks: key leakage (repo, URLs, logs,
third-party code) and XSS via external content (ESPN fields, AI-generated text).

### Gemini key handling
- Entered only by the user in Settings (password-type input, masked).
- **Never** in the repository, build output, or any URL. Requests use the
  `x-goog-api-key` **header** (not the `?key=` query param) so the key cannot leak into
  proxy/server logs or browser history.
- Sent to exactly one host: `generativelanguage.googleapis.com`, over HTTPS.
- Storage: **"Remember on this device" toggle** — on = `localStorage` (survives
  restarts), off = `sessionStorage` (wiped when the tab/app closes). A **"Forget key"**
  button wipes it immediately either way.
- The service worker never caches Gemini requests or responses (NetworkOnly).
- Settings page shows a plain-language note: the key is stored only on this device; usage
  is governed by the user's own Google AI Studio quota; revoke any time at
  aistudio.google.com.

### Application hardening
- **Zero third-party scripts**: no analytics, no CDN script tags, no ads, no trackers.
  Only first-party bundles + two data hosts (ESPN, Google).
- **Content Security Policy** (via `<meta>`, since GitHub Pages can't set headers):
  `default-src 'self'; script-src 'self'; connect-src 'self' https://site.api.espn.com
  https://generativelanguage.googleapis.com; img-src 'self' data: https://a.espncdn.com;
  style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'none'`.
- **Output encoding**: React escaping everywhere; `dangerouslySetInnerHTML` is banned.
  AI markdown is rendered by a minimal in-house formatter (bold + paragraphs only) that
  treats input as text, never HTML. ESPN fields are rendered as text nodes.
- All external fetches validated/normalized behind a defensive parsing layer; malformed
  responses degrade to "not available", never to script execution or a crash.
- HTTPS everywhere (GitHub Pages enforces it); service worker requires HTTPS by design.

### Repository & supply-chain hygiene
- No secrets exist anywhere in the repo or CI — the deploy workflow needs no secrets at
  all (it builds public code). `.gitignore` covers `.env*` regardless, as a guard rail.
- **npm supply-chain defenses** (recent npm attacks are the threat model here):
  - `.npmrc` sets **`ignore-scripts=true`** — no package can run install/postinstall
    scripts, the payload vector in most real-world npm compromises.
  - **Exact version pinning** (`save-exact`) + committed `package-lock.json` + `npm ci`
    in CI: only byte-exact, reviewed versions ever install; a hijacked new release of a
    dependency cannot drift in automatically. Upgrades are deliberate, reviewable diffs.
  - Minimal dependency surface (~110 packages total): react, react-dom,
    react-router-dom, vite, vite-plugin-pwa, @fontsource packages, sharp (dev-only).
  - Even if a dependency were compromised, the runtime CSP blocks exfiltration:
    `connect-src` allows only ESPN and Google's Gemini host.
- GitHub's secret scanning + Dependabot alerts enabled on the repo (free).

### Privacy
- No data collection, no cookies, no fingerprinting. The only outbound traffic is the
  user's own device fetching ESPN scores and (optionally) calling Gemini with their key.

## 6. Backlog (discussed, not in v1)

- Live commentary ticker on match detail (ESPN summary feed)
- News feed (ESPN news endpoint)
- AI daily quiz game (Gemini-generated, scored locally)
- Predictions game, share cards, timezone toggle (declined for v1)

## 7. Non-goals

- Push notifications (requires a push server — calendar reminders are the free substitute)
- Accounts / cross-device sync (device-local by design)
- Video, highlights, or betting odds

## 8. Delivery

- Stack: Vite + React PWA; hash-based routing (offline-safe deep links on GitHub Pages).
- Hosting: GitHub Pages via GitHub Actions, deployed from `main`
  (one-time repo setting: Pages → Source → "GitHub Actions").
- URL: `https://pbparthas.github.io/wc-tracker/`.
- Key dates: live from day one; bracket view must be complete before the Round of 32
  begins on 28 June 2026.
