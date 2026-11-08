// One-off: trims logo margins and builds icons and the Open Graph image from public/brand originals.
import sharp from "sharp";

const PAPER = { r: 0xfe, g: 0xf8, b: 0xf3, alpha: 1 };
const trim = (f, out) =>
  sharp(`public/brand/${f}`).trim({ background: PAPER, threshold: 12 }).toFile(`public/brand/${out}`);

await trim("goldleaf-wordmark.webp", "goldleaf-wordmark-trim.webp");
await trim("goldleaf-stacked.webp", "goldleaf-stacked-trim.webp");
await trim("goldleaf-mark.png", "goldleaf-mark-trim.png");

const square = async (size, out, pad) => {
  const mark = await sharp("public/brand/goldleaf-mark-trim.png").resize({ width: size - pad * 2, height: size - pad * 2, fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toFile(out);
};
await square(512, "app/icon.png", 56);
await square(180, "app/apple-icon.png", 20);

const stacked = await sharp("public/brand/goldleaf-stacked-trim.webp").resize({ height: 470, fit: "inside" }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: PAPER } })
  .composite([{ input: stacked, gravity: "centre" }])
  .png()
  .toFile("app/opengraph-image.png");

for (const f of ["goldleaf-wordmark-trim.webp", "goldleaf-stacked-trim.webp", "goldleaf-mark-trim.png"]) {
  const m = await sharp(`public/brand/${f}`).metadata();
  console.log(f, m.width, m.height);
}

// High-resolution crop of the G-and-pot mark from the trimmed stacked logo, for the hero.
await sharp("public/brand/goldleaf-stacked-trim.webp")
  .extract({ left: 200, top: 0, width: 660, height: 528 })
  .trim({ background: PAPER, threshold: 12 })
  .toFile("public/brand/goldleaf-hero-mark.webp");
const hm = await sharp("public/brand/goldleaf-hero-mark.webp").metadata();
console.log("hero mark", hm.width, hm.height);
