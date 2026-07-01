/* One-time social preview rasterization → public/og.png (committed).
   Run with: npm run og */
import sharp from "sharp";

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#e2d6ba"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8caa4"/>
      <stop offset="1" stop-color="#e2d6ba"/>
    </linearGradient>
  </defs>
  <!-- pitch markings, faint, like the in-app hero -->
  <circle cx="600" cy="850" r="430" fill="none" stroke="#23281f" stroke-width="4" opacity="0.16"/>
  <circle cx="600" cy="850" r="10" fill="#23281f" opacity="0.16"/>
  <line x1="0" y1="566" x2="1200" y2="566" stroke="#23281f" stroke-width="4" opacity="0.16"/>
  <!-- wordmark -->
  <text x="600" y="265" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="150" letter-spacing="4">
    <tspan fill="#23281f">GOLA</tspan><tspan fill="#a83226">ZO</tspan>
  </text>
  <text x="600" y="350" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="44" fill="#23281f">
    FIFA World Cup 2026 · live scores in IST
  </text>
  <text x="600" y="425" text-anchor="middle" font-family="sans-serif" font-weight="500" font-size="30" fill="#6d7261">
    Groups · bracket · squads · stats · AI match stories
  </text>
  <text x="600" y="490" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="28" fill="#a83226">
    Free · no ads · no account · works offline
  </text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(new URL("../public/og.png", import.meta.url).pathname);
console.log("Social preview written to public/og.png");
