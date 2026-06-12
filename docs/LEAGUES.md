# League mode — design

Agreed 13 June 2026. Phase 1 shipped for the Premier League; other competitions
follow this template with their own identity.

## Principle: one chassis, distinct identities

Shared **chassis**: data layer (ESPN league slugs), caching tiers, AI patterns
(user's Gemini key, grounded prompts, cache-first), home → competition → tabs
navigation, match-page anatomy.

Distinct **identity** per competition:
- **Accent palette** via CSS variables scoped by `[data-comp]` on the app root.
  Night Pitch dark base everywhere; WC keeps saffron; the EPL wears Premier
  League electric green (`#00E586`) on purple-tinted cards.
- **Tab set and order**: competition-appropriate. EPL: `⌂ · TRANSFERS · MATCHES
  · TABLE · CLUBS`, transfers-first while the window is open (config-driven),
  matches-first once the season starts.
- **Signature surface**: what the competition is about *right now*. WC = the
  live hero. EPL today = the transfer window. UCL = the draw (see below).

## Premier League (the template)

- **Transfers** (launch centerpiece): window status bar (days left, deadline in
  IST — no ticking clocks in league mode; matches/deadlines are days apart, so
  days/hours are the honest units, with urgency styling only inside the final
  24h) · confirmed-moves feed from ESPN's transactions endpoint (defensive
  parser, multi-shape) · "My clubs" filter from per-competition stars · daily
  AI window digest with search grounding — confirmed deals first, then a
  visually separated, explicitly labelled **RUMOR MILL**.
- **Clubs**: 20-crest grid → club page: star toggle, grounded AI club profile,
  this window's ins/outs, full squad with player sheets (shared SquadList).
- **Table**: flat 20-row table with zone dots (CL/EL/Conference/relegation,
  footnoted as approximate) and the season label ESPN reports; pre-season this
  is last season's final table — useful context during the window.
- **Matches** (phase 2, on fixture release): matchweek pager (MW1–38), IST
  kickoffs, live scores and the full WC match-page anatomy. **No countdown
  clocks** — the hero shows the next fixture's date and time instead.

## Favourites

Per-competition star lists (`favs` for WC nations, `favs:epl` for clubs, …).
Lists never mix; each competition's pages read only their own.

## Crossover

World Cup player profiles use search grounding and mention confirmed transfers
— tournament pages stay tournament-first, but a star's transfer isn't ignored.

## Champions League (future, different shape)

Not a clone of the league template:
1. **Draw tracker** first — pots, then the drawn league-phase opponents per club.
2. **Table + schedule generated after the draw**: the 36-team league-phase
   table and each club's eight fixtures appear once the draw is done.
3. Knockout bracket reuses the WC bracket machinery.

## Other leagues

La Liga / Serie A / Bundesliga / Ligue 1 = a `competitions.js` entry, a
homepage card, and an accent palette. The EPL pages parameterize by config.
