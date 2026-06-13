import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/saira-condensed/600.css";
import "@fontsource/saira-condensed/800.css";
import "./styles/global.css";

import App from "./App.jsx";
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
const TransfersPage = React.lazy(() => import("./pages/epl/TransfersPage.jsx"));
const EplMatchesPage = React.lazy(() => import("./pages/epl/EplMatchesPage.jsx"));
const TablePage = React.lazy(() => import("./pages/epl/TablePage.jsx"));
const ClubsPage = React.lazy(() => import("./pages/epl/ClubsPage.jsx"));
const ClubPage = React.lazy(() => import("./pages/epl/ClubPage.jsx"));
const EplMatchDetailPage = React.lazy(() => import("./pages/epl/EplMatchDetailPage.jsx"));

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("wc26:sw-update", { detail: updateSW }));
  },
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
      { path: "epl", element: <TransfersPage /> },
      { path: "epl/matches", element: <EplMatchesPage /> },
      { path: "epl/table", element: <TablePage /> },
      { path: "epl/clubs", element: <ClubsPage /> },
      { path: "epl/club/:id", element: <ClubPage /> },
      { path: "epl/match/:id", element: <EplMatchDetailPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
