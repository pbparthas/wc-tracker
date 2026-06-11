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
/* Qualification scenarios during groups; knockout path once seeded. */
export function roadPrompt(team, standings, third, fixtures, rounds) {
  const lines = [
    `Explain the road ahead for ${team.name} at the FIFA World Cup 2026 — exactly what fans checking qualification scenarios want to know.`,
    "Format rules (authoritative): 12 groups of 4; the top 2 of each group AND the 8 best third-placed teams advance to a Round of 32, then R16, QF, SF and the final.",
  ];
  const g = standings?.[team.group];
  if (g?.length) {
    lines.push(`Current Group ${team.group} table (authoritative):`);
    g.forEach((r, i) => lines.push(`${i + 1}. ${row(r)}`));
  }
  const left = fixtures.filter((m) => m.state !== "post");
  if (left.length) {
    lines.push("Their remaining fixtures (authoritative):");
    for (const m of left) {
      const p = istParts(m.kickoff);
      lines.push(`- ${m.home.name} vs ${m.away.name} (${m.stage})${p ? ` — ${p.day}, ${p.time} IST` : ""}`);
    }
  }
  if (third?.length) {
    lines.push("Third-place ranking across all groups (authoritative; top 8 advance):");
    for (const r of third) {
      lines.push(`${r.rank}. Group ${r.group} ${r.team.name}: ${row(r)}${r.qualified ? "" : " — currently OUT"}`);
    }
  }
  const ko = (rounds || []).flatMap((r) =>
    (r.matches || []).filter(Boolean).map((m) => `- ${r.label}: ${m.home.name} vs ${m.away.name}`)
  );
  if (ko.length) {
    lines.push("Knockout bracket so far (authoritative; TBD = not yet decided):");
    lines.push(...ko);
  }
  lines.push(
    "Spell out concretely what results they need: best case, worst case, and which other matches matter. " +
      "If their group is finished, describe their knockout path and likely opponents instead. " +
      "Be precise with the points math and never invent results that are not listed above."
  );
  return lines.join("\n");
}

export function playerPrompt(player, team) {
  return [
    `Write a short profile of ${player.name}, in the ${team.name} squad at the FIFA World Cup 2026.`,
    `Authoritative facts: position ${player.posName || player.pos || "unknown"}` +
      `${player.jersey ? `, shirt #${player.jersey}` : ""}${player.age ? `, age ${player.age}` : ""}.`,
    `Team context: ${team.trivia}`,
    "Cover their club career, playing style, strengths and what to expect from them this tournament. " +
      "If you are not certain about this specific player, stick to what is generally known and never invent statistics.",
  ].join("\n");
}

export function espnDownPrompt() {
  return (
    "Using Google Search, find the latest FIFA World Cup 2026 scores: yesterday's results and today's fixtures " +
    "with kickoff times converted to IST. List them compactly. If a match is live right now, give the current score. " +
    "Only report what you find from search results dated today or yesterday."
  );
}
