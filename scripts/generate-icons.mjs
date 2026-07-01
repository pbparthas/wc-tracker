/* One-time icon rasterization: public/icon.svg → PWA PNGs (committed).
   Run with: npm run icons */
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/icon.svg", import.meta.url));

const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out("pwa-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("pwa-512.png"));
await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));

/* Maskable: same art shrunk to ~78% on a solid background so the safe zone
   survives any launcher mask shape. */
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#e2d6ba" } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(out("pwa-512-maskable.png"));

console.log("Icons written to public/: pwa-192, pwa-512, pwa-512-maskable, apple-touch-icon");
