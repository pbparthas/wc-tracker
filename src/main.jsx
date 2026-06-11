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
import MatchesPage from "./pages/MatchesPage.jsx";
import MatchDetailPage from "./pages/MatchDetailPage.jsx";
import GroupsPage from "./pages/GroupsPage.jsx";
import KnockoutPage from "./pages/KnockoutPage.jsx";
import TeamsPage from "./pages/TeamsPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

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
      { index: true, element: <MatchesPage /> },
      { path: "match/:id", element: <MatchDetailPage /> },
      { path: "groups", element: <GroupsPage /> },
      { path: "knockout", element: <KnockoutPage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "team/:code", element: <TeamPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
