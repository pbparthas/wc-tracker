import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/saira-condensed/600.css";
import "@fontsource/saira-condensed/800.css";
import "./styles/global.css";

import App from "./App.jsx";
import { getMode, applyMode } from "./lib/theme.js";
import HomePage from "./pages/HomePage.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";

/* The Matches tab is the app's front door and stays in the main bundle; every
   other page loads on first visit (and is precached by the service worker). */
const MatchDetailPage = React.lazy(() => import("./pages/MatchDetailPage.jsx"));
const GroupsPage = React.lazy(() => import("./pages/GroupsPage.jsx"));
const KnockoutPage = React.lazy(() => import("./pages/KnockoutPage.jsx"));
const TeamsPage = React.lazy(() => import("./pages/TeamsPage.jsx"));
const YourTeamsPage = React.lazy(() => import("./pages/YourTeamsPage.jsx"));
const TeamPage = React.lazy(() => import("./pages/TeamPage.jsx"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage.jsx"));
const GoldenBootPage = React.lazy(() => import("./pages/GoldenBootPage.jsx"));
const TransfersPage = React.lazy(() => import("./pages/league/TransfersPage.jsx"));
const LeagueMatchesPage = React.lazy(() => import("./pages/league/LeagueMatchesPage.jsx"));
const TablePage = React.lazy(() => import("./pages/league/TablePage.jsx"));
const ClubsPage = React.lazy(() => import("./pages/league/ClubsPage.jsx"));
const ClubPage = React.lazy(() => import("./pages/league/ClubPage.jsx"));
const LeagueMatchDetailPage = React.lazy(() => import("./pages/league/LeagueMatchDetailPage.jsx"));

/* Ask the browser to keep our storage. Without this, localStorage (where the
   Gemini key, favourites and cached data live) is "best-effort" and can be
   evicted whenever the app closes or the device is low on space — which on
   iOS home-screen PWAs happens constantly, so the key looks like it vanishes
   every launch. Granting persistence stops eviction until the user clears it
   themselves. Installed PWAs are usually granted silently; we re-check each
   load in case it wasn't granted the first time. */
async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch { /* unsupported or blocked — nothing we can do */ }
}
requestPersistentStorage();

/* Apply the saved appearance mode before first paint. */
applyMode(getMode());

/* autoUpdate: a new deploy installs, skips waiting and reloads the page on its
   own, so a plain refresh always lands on the latest build. We also re-check
   for updates hourly so long-lived sessions don't go stale. */
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    if (reg) setInterval(() => reg.update(), 60 * 60 * 1000);
  },
});

/* If a lazy chunk 404s because a deploy rotated the asset hashes mid-session,
   reload once to pick up the new index + chunk map instead of crashing. */
window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem("wc26:reloadedForChunk")) {
    sessionStorage.setItem("wc26:reloadedForChunk", "1");
    window.location.reload();
  }
});

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "matches", element: <MatchesPage /> },
      { path: "match/:id", element: <MatchDetailPage /> },
      { path: "groups", element: <GroupsPage /> },
      { path: "knockout", element: <KnockoutPage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "yourteams", element: <YourTeamsPage /> },
      { path: "team/:code", element: <TeamPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "goldenboot", element: <GoldenBootPage /> },
      { path: "league/:comp", element: <TransfersPage /> },
      { path: "league/:comp/matches", element: <LeagueMatchesPage /> },
      { path: "league/:comp/table", element: <TablePage /> },
      { path: "league/:comp/clubs", element: <ClubsPage /> },
      { path: "league/:comp/club/:id", element: <ClubPage /> },
      { path: "league/:comp/match/:id", element: <LeagueMatchDetailPage /> },
      /* Back-compat: old /epl links → the Premier League under the generic path. */
      { path: "epl", element: <Navigate to="/league/epl" replace /> },
      { path: "epl/*", element: <Navigate to="/league/epl" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
