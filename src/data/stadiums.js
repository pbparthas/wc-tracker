/* The 16 host stadiums, keyed by the city names ESPN reports (which are often
   the stadium suburb, not the metro). Facts are curated and static — capacity
   figures are tournament-configuration approximations. */
export const STADIUMS = {
  "mexico city": {
    name: "Estadio Azteca",
    city: "Mexico City",
    country: "Mexico",
    capacity: "≈ 83,000",
    opened: 1966,
    facts:
      "The cathedral of World Cup football: the only stadium to host two finals (1970 and 1986) — Pelé lifted the trophy here, and so did Maradona, days after the Hand of God in this same bowl. Now the first stadium ever to stage matches at three World Cups, it opened the 2026 tournament. Sits at 2,200 m altitude, which visiting teams feel in their lungs.",
  },
  zapopan: {
    name: "Estadio Akron",
    city: "Guadalajara",
    country: "Mexico",
    capacity: "≈ 48,000",
    opened: 2010,
    facts:
      "Home of Chivas, Mexico's most-supported club, and designed to look like a volcano rising from a cloud — the sloped grass berm around the bowl is part of the architecture. Guadalajara is Mexican football's heartland.",
  },
  guadalupe: {
    name: "Estadio BBVA",
    city: "Monterrey",
    country: "Mexico",
    capacity: "≈ 53,500",
    opened: 2015,
    facts:
      "Nicknamed 'El Gigante de Acero' — the Steel Giant. Its open south end perfectly frames the Cerro de la Silla mountain, one of the best backdrops in world football. Home of CF Monterrey.",
  },
  atlanta: {
    name: "Mercedes-Benz Stadium",
    city: "Atlanta",
    country: "United States",
    capacity: "≈ 71,000",
    opened: 2017,
    facts:
      "Famous for its eight-petal retractable roof that opens like a camera aperture, and a 360° halo video board. Hosts eight matches including a semi-final on 15 July. Atlanta United set MLS attendance records here.",
  },
  foxborough: {
    name: "Gillette Stadium",
    city: "Foxborough (Boston)",
    country: "United States",
    capacity: "≈ 65,000",
    opened: 2002,
    facts:
      "Home of the New England Patriots' six-Super-Bowl dynasty and the New England Revolution. A veteran of big football nights — it hosted matches at the 2003 Women's World Cup and multiple Copa América editions.",
  },
  arlington: {
    name: "AT&T Stadium",
    city: "Arlington (Dallas)",
    country: "United States",
    capacity: "≈ 80,000",
    opened: 2009,
    facts:
      "'Jerry World', the Dallas Cowboys' colossus, with a centre-hung video board so big early punters feared kickers would hit it. Hosts nine matches — more than any other 2026 venue — including a semi-final on 14 July. Expandable past 100,000 with standing room.",
  },
  houston: {
    name: "NRG Stadium",
    city: "Houston",
    country: "United States",
    capacity: "≈ 72,000",
    opened: 2002,
    facts:
      "The first NFL stadium built with a retractable roof — which will be welcome, because Houston in late June is a sauna. A regular for Mexico's national team and Gold Cup nights, so expect a green wave for El Tri's matches here.",
  },
  "kansas city": {
    name: "Arrowhead Stadium",
    city: "Kansas City",
    country: "United States",
    capacity: "≈ 76,000",
    opened: 1972,
    facts:
      "The oldest 2026 venue in the US and the loudest: Chiefs fans set the Guinness world record for crowd roar at 142.2 decibels. A proper old-school open bowl — no roof, all noise.",
  },
  inglewood: {
    name: "SoFi Stadium",
    city: "Inglewood (Los Angeles)",
    country: "United States",
    capacity: "≈ 70,000",
    opened: 2020,
    facts:
      "The most expensive stadium ever built (around $5.5 billion), with a translucent canopy and the double-sided 'Infinity Screen' hanging over the field. Indoor-outdoor design — open sides, covered roof. Hosted the 2022 Super Bowl in its second season.",
  },
  "miami gardens": {
    name: "Hard Rock Stadium",
    city: "Miami Gardens (Miami)",
    country: "United States",
    capacity: "≈ 65,000",
    opened: 1987,
    facts:
      "Miami's all-purpose mega-venue: six Super Bowls, the Miami Grand Prix circles it, and Messi's Copa América 2024 final was played here. Stages the third-place match on 18 July. The shade canopy covers the stands but not the pitch.",
  },
  "east rutherford": {
    name: "MetLife Stadium",
    city: "East Rutherford (New York/New Jersey)",
    country: "United States",
    capacity: "≈ 82,500",
    opened: 2010,
    facts:
      "The big one: hosts the World Cup final on 19 July 2026, the first men's final in the New York area since 1930's tournament didn't exist — this is the region's first ever. Shared home of the NFL's Giants and Jets, and the largest-capacity venue of the tournament.",
  },
  philadelphia: {
    name: "Lincoln Financial Field",
    city: "Philadelphia",
    country: "United States",
    capacity: "≈ 67,500",
    opened: 2003,
    facts:
      "'The Linc', home of the Eagles and one of the most hostile crowds in American sport. Philadelphia's soccer pedigree runs deep — the city hosted matches at Copa América 2016 and is a regular USMNT stop.",
  },
  "santa clara": {
    name: "Levi's Stadium",
    city: "Santa Clara (San Francisco Bay Area)",
    country: "United States",
    capacity: "≈ 68,500",
    opened: 2014,
    facts:
      "The 49ers' Silicon Valley home and one of the greenest stadiums in the world — LEED Gold certified with a living roof on its suite tower and solar panels that generate more power than its NFL games consume.",
  },
  seattle: {
    name: "Lumen Field",
    city: "Seattle",
    country: "United States",
    capacity: "≈ 69,000",
    opened: 2002,
    facts:
      "Engineered to trap noise — the roof covers 70% of seats and bounces the sound back down. Home of the Sounders, who regularly out-draw most of Europe, and the Seahawks' famous '12th man'. One of football's great atmospheres.",
  },
  toronto: {
    name: "BMO Field",
    city: "Toronto",
    country: "Canada",
    capacity: "≈ 45,000",
    opened: 2007,
    facts:
      "Canada's national soccer stadium, expanded from 30,000 with temporary stands for the tournament. Canada's first-ever home World Cup matches are played here and in Vancouver — Toronto got the host nation's opener.",
  },
  vancouver: {
    name: "BC Place",
    city: "Vancouver",
    country: "Canada",
    capacity: "≈ 54,000",
    opened: 1983,
    facts:
      "Crowned by the world's largest cable-supported retractable roof. Hosted the 2010 Winter Olympics ceremonies and the 2015 Women's World Cup final (USA 5-2 Japan, with Carli Lloyd's hat-trick inside 16 minutes — including that halfway-line goal).",
  },
};

/* ESPN sometimes reports the metro instead of the stadium suburb. */
const CITY_ALIASES = {
  guadalajara: "zapopan",
  monterrey: "guadalupe",
  boston: "foxborough",
  dallas: "arlington",
  "los angeles": "inglewood",
  miami: "miami gardens",
  "new york": "east rutherford",
  "san francisco": "santa clara",
};

export function stadiumFor(city) {
  const c = (city || "").toLowerCase().trim();
  if (!c) return null;
  if (STADIUMS[c]) return STADIUMS[c];
  if (CITY_ALIASES[c]) return STADIUMS[CITY_ALIASES[c]];
  const hit = Object.keys(STADIUMS).find((k) => c.includes(k)) ||
    Object.keys(CITY_ALIASES).find((k) => c.includes(k));
  return hit ? STADIUMS[hit] || STADIUMS[CITY_ALIASES[hit]] : null;
}
