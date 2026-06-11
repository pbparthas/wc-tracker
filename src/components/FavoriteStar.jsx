import React from "react";
import { useFavorites } from "../hooks/useFavorites.js";

export default function FavoriteStar({ code, size }) {
  const { isFav, toggle } = useFavorites();
  const on = isFav(code);
  return (
    <button
      className={"iconbtn" + (on ? " on" : "")}
      style={size ? { fontSize: size } : undefined}
      aria-pressed={on}
      aria-label={on ? "Remove from favourites" : "Add to favourites"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(code);
      }}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
