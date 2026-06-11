/* Every prompt injects authoritative ESPN facts so the model never has to
   rely on (stale) training data for results. */
import { istParts } from "./time.js";

export const SYSTEM =
  'You are a football writer for "Golazo", an India-based FIFA World Cup 2026 tracker. ' +
  "The match facts provided in each request are authoritative and current — trust them over your training data, " +
  "and never invent scores, scorers or events. Write 150-250 words, vivid but factual. All kickoff times you mention " +
  "are already in IST. Use light markdown only: short paragraphs and **bold** for emphasis. No headings, no bullet lists.";

const row = (r) => `${r.team.name}: P${r.p} W${r.w} D${r.d} L${r.l} GD${r.gf - r.ga} Pts${r.pts}`;

export function previewPrompt(match, standings) {
  const p = istParts(match.kickoff);
  const lines = [
    `Write a pre-match preview for this FIFA World Cup 2026 match:`,
    `${match.home.name} vs ${match.away.name} — ${match.stage}${match.city ? ", " + match.city : ""}.`,
    `Kickoff: ${p ? `${p.day} at ${p.time} IST` : "TBC"}.`,
  ];
  for (const t of [match.home, match.away]) {
    if (t.trivia) lines.push(`${t.name} background: ${t.trivia}`);
    const g = t.group && standings?.[t.group];
    const r = g?.find((x) => x.team.code === t.code);
    if (r) lines.push(`${t.name} current group ${t.group} record: ${row(r)}.`);
  }
  lines.push("Cover the storylines, what is at stake, and players to watch.");
  return lines.join("\n");
}

export function recapPrompt(match, summary) {
  const lines = [
    `Write a post-match recap of this FIFA World Cup 2026 result:`,
    `${match.home.name} ${match.hg} - ${match.ag} ${match.away.name} (${match.stage}${match.city ? ", " + match.city : ""}).`,
  ];
  const evs = (summary?.events || []).filter((e) => ["goal", "og", "pen", "red"].includes(e.kind));
  if (evs.length) {
    lines.push("Key events (authoritative):");
    for (const e of evs) lines.push(`- ${e.minute} ${e.label}: ${e.player || e.text}${e.team ? ` (${e.team.name})` : ""}`);
  }
  if (summary?.info?.attendance) lines.push(`Attendance: ${summary.info.attendance}.`);
  lines.push("Tell the story of the match and what the result means.");
  return lines.join("\n");
}

export function digestPrompt(dayLabel, finished, upcoming) {
  const lines = [`Write a daily digest for Indian fans for ${dayLabel}.`];
  if (finished.length) {
    lines.push("Results so far (authoritative):");
    for (const m of finished) lines.push(`- ${m.home.name} ${m.hg}-${m.ag} ${m.away.name} (${m.stage})`);
  } else {
    lines.push("No completed matches yet today.");
  }
  if (upcoming.length) {
    lines.push("Coming up tonight IST (authoritative):");
    for (const m of upcoming) {
      const p = istParts(m.kickoff);
      lines.push(`- ${m.home.name} vs ${m.away.name} (${m.stage}) at ${p ? p.time : "TBC"} IST`);
    }
  }
  lines.push("Summarise the action and tell fans what to stay up for tonight.");
  return lines.join("\n");
}

export function teamPrompt(team, standings, fixtures) {
  const lines = [
    `Write a team deep-dive on ${team.name} at the FIFA World Cup 2026 (Group ${team.group}).`,
    `Background: ${team.trivia}`,
  ];
  const g = standings?.[team.group];
  if (g?.length) {
    lines.push(`Current Group ${team.group} table (authoritative):`);
    g.forEach((r, i) => lines.push(`${i + 1}. ${row(r)}`));
  }
  const played = fixtures.filter((m) => m.state === "post");
  if (played.length) {
    lines.push("Their results so far (authoritative):");
    for (const m of played) lines.push(`- ${m.home.name} ${m.hg}-${m.ag} ${m.away.name}`);
  }
  lines.push("Cover their star players, style of play, key storylines and realistic outlook in this tournament.");
  return lines.join("\n");
}

/* Emergency fallback when ESPN is unreachable — uses Google Search grounding,
   so the answer is clearly labelled as approximate in the UI. */
export function espnDownPrompt() {
  return (
    "Using Google Search, find the latest FIFA World Cup 2026 scores: yesterday's results and today's fixtures " +
    "with kickoff times converted to IST. List them compactly. If a match is live right now, give the current score. " +
    "Only report what you find from search results dated today or yesterday."
  );
}
