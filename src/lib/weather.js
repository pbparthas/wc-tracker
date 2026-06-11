/* Kickoff weather via Open-Meteo — free, keyless, CORS-open, no tracking.
   City-level coordinates are plenty for a forecast; keys cover both the host
   metro names and the stadium suburbs ESPN sometimes reports instead. */
const CITY_COORDS = {
  "mexico city": [19.43, -99.13],
  guadalajara: [20.67, -103.35],
  zapopan: [20.72, -103.39],
  monterrey: [25.67, -100.31],
  guadalupe: [25.68, -100.26],
  atlanta: [33.75, -84.39],
  boston: [42.36, -71.06],
  foxborough: [42.07, -71.25],
  dallas: [32.78, -96.8],
  arlington: [32.74, -97.11],
  houston: [29.76, -95.37],
  "kansas city": [39.1, -94.58],
  "los angeles": [34.05, -118.24],
  inglewood: [33.96, -118.35],
  miami: [25.76, -80.19],
  "miami gardens": [25.94, -80.24],
  "new york": [40.71, -74.01],
  "east rutherford": [40.81, -74.07],
  philadelphia: [39.95, -75.17],
  "san francisco": [37.77, -122.42],
  "santa clara": [37.35, -121.95],
  seattle: [47.61, -122.33],
  toronto: [43.65, -79.38],
  vancouver: [49.28, -123.12],
};

export function cityCoords(city) {
  const c = (city || "").toLowerCase().trim();
  if (!c) return null;
  if (CITY_COORDS[c]) return CITY_COORDS[c];
  const hit = Object.keys(CITY_COORDS).find((k) => c.includes(k));
  return hit ? CITY_COORDS[hit] : null;
}

/* WMO weather codes → a short label and glyph. */
export function wmoInfo(code) {
  if (code === 0) return { label: "Clear", emoji: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", emoji: "⛅" };
  if (code === 3) return { label: "Overcast", emoji: "☁️" };
  if (code <= 48) return { label: "Fog", emoji: "🌫️" };
  if (code <= 57) return { label: "Drizzle", emoji: "🌦️" };
  if (code <= 67) return { label: "Rain", emoji: "🌧️" };
  if (code <= 77) return { label: "Snow", emoji: "🌨️" };
  if (code <= 82) return { label: "Showers", emoji: "🌧️" };
  if (code <= 86) return { label: "Snow showers", emoji: "🌨️" };
  return { label: "Thunderstorm", emoji: "⛈️" };
}

export function parseKickoffWeather(data, kickoffIso) {
  const hourly = data?.hourly;
  if (!hourly?.time) return null;
  const key = new Date(kickoffIso).toISOString().slice(0, 13) + ":00";
  const i = hourly.time.indexOf(key);
  if (i === -1) return null;
  const temp = hourly.temperature_2m?.[i];
  if (temp === undefined || temp === null) return null;
  return {
    tempC: Math.round(temp),
    rainPct: hourly.precipitation_probability?.[i] ?? null,
    ...wmoInfo(Number(hourly.weather_code?.[i] ?? 0)),
  };
}

export async function fetchKickoffWeather(city, kickoffIso) {
  const co = cityCoords(city);
  const d = new Date(kickoffIso);
  if (!co || isNaN(d)) return null;
  const daysAway = (d.getTime() - Date.now()) / 86400000;
  if (daysAway < -0.5 || daysAway > 15) return null; // outside Open-Meteo's window
  const day = d.toISOString().slice(0, 10);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${co[0]}&longitude=${co[1]}` +
    `&hourly=temperature_2m,precipitation_probability,weather_code&timezone=UTC` +
    `&start_date=${day}&end_date=${day}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return parseKickoffWeather(await res.json(), kickoffIso);
}
