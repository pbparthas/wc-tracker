/* In-play win probability.

   API-Football's /predictions only gives a PRE-MATCH number, so a static meter
   is misleading once the game is underway (a side can be losing while its
   pre-match figure still says it's favourite). This derives a live estimate
   from the current score and minutes elapsed, anchored to the pre-match lean:
   at kickoff it ~matches the prediction; as time runs out it shifts toward the
   scoreline (a trailing side's chances fall, a leader's rise); at full time the
   played result is certain. It's a light Poisson model — approximate, and
   labelled "live" in the UI, not presented as bookmaker-grade. */

function poissonPmf(lambda, kMax) {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= kMax; k++) out.push((out[k - 1] * lambda) / k);
  return out;
}

function toPct(home, draw, away) {
  const t = home + draw + away || 1;
  const H = Math.round((home / t) * 100);
  const D = Math.round((draw / t) * 100);
  return { home: H, draw: D, away: Math.max(0, 100 - H - D) };
}

const numPct = (s) => {
  const n = parseFloat(String(s ?? ""));
  return isNaN(n) ? 0 : n;
};

/* Elapsed minute from a live status string ("LIVE 67'", "HT", "LIVE 90+2"). */
export function parseMatchMinute(status) {
  if (!status) return null;
  if (/^HT/i.test(status) || /halftime/i.test(status)) return 45;
  const m = String(status).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function liveWinProbability(percent, hg, ag, minute) {
  const ph0 = numPct(percent?.home);
  const pd0 = numPct(percent?.draw);
  const pa0 = numPct(percent?.away);
  const priorTotal = ph0 + pd0 + pa0 || 1;
  const prior = { home: ph0 / priorTotal, draw: pd0 / priorTotal, away: pa0 / priorTotal };

  const m = Math.max(0, Math.min(95, Number(minute) || 0));
  const f = Math.max(0, Math.min(1, (90 - m) / 90)); // fraction of the match left

  // Per-team remaining expected goals, tilted by the pre-match lean.
  const ratio = ph0 > 0 && pa0 > 0 ? ph0 / pa0 : 1;
  const r = Math.sqrt(Math.min(Math.max(ratio, 0.25), 4));
  const BASE = 1.35; // ~per-team goals across a full match
  const lamH = BASE * r * f;
  const lamA = (BASE / r) * f;

  const d = (Number(hg) || 0) - (Number(ag) || 0);
  const K = 12;
  const ph = poissonPmf(lamH, K);
  const pa = poissonPmf(lamA, K);
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let i = 0; i <= K; i++) {
    for (let j = 0; j <= K; j++) {
      const prob = ph[i] * pa[j];
      const diff = d + i - j;
      if (diff > 0) home += prob;
      else if (diff === 0) draw += prob;
      else away += prob;
    }
  }
  // Blend toward the pre-match prior early (f≈1), toward the live model late.
  const blend = (model, p) => f * p + (1 - f) * model;
  return toPct(blend(home, prior.home), blend(draw, prior.draw), blend(away, prior.away));
}
