// npm run brand
//
// Draws the attunr brand set into brand/ (the logo, the mark and favicon, Instagram, YouTube and TikTok pictures) and the app's own
// icons into src/app/ (icon.png, apple-icon.png, favicon.ico), all from brand.html next to this file, in
// Playwright's Chromium from the npx cache (as scripts/video does), with the site's fonts from src/app/_og.
// Change the look in the template, run this, commit what it wrote. brand/README.md says what each picture is for.
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const BRAND = join(ROOT, "brand");
const APP = join(ROOT, "src/app");
const FONTS = join(APP, "_og");

const DARK = "#0b0b0b";
const LIGHT = "#ffffff";
/* one dot per scale degree, 1 to 7, as in Wordmark.tsx (the template has its own copy) */
const DOTS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];
/** a rounded tile's corner, as a share of its side (the app icons) */
const CORNER = 0.1875;
/* the link preview's words (src/app/opengraph-image.tsx); change them there too */
const EYEBROW = "Music drills & theory";
const TAGLINE = "Scales in every key, chord shapes, CAGED, a tuner and a looper.";
const HOST = "attunr.app";

/** a square tile of the mark or the letter */
const tile = (kind, size, bg = DARK, rounded = true) => ({ kind, width: size, height: size, bg, radius: rounded ? size * CORNER : 0 });
/** the logo cut to its content with a margin, in light or dark ink */
const logo = (kind, ink, bg, fontSize = 400) => ({ kind, ink, bg, fontSize, pad: fontSize * 0.25 });
/** a post or a story: the wordmark with the site's line and address */
const card = (width, height) => ({ kind: "card", width, height, bg: DARK, eyebrow: EYEBROW, tagline: TAGLINE, host: HOST });

/** a YouTube channel banner: 2560×1440, the words inside the 1546×423 middle that phones and computers show */
const banner = () => ({ kind: "banner", width: 2560, height: 1440, bg: DARK, safe: [1546, 423], tagline: TAGLINE });

/** Every PNG: where it goes (under brand/, or an absolute path) and how the template draws it. */
const PICTURES = [
  // the logo: the word over its dots; light ink for dark grounds, dark ink for light ones
  { out: "logo/logo-on-dark.png", ...logo("wordmark", LIGHT, DARK) },
  { out: "logo/logo-on-light.png", ...logo("wordmark", DARK, LIGHT) },
  { out: "logo/logo-light.png", ...logo("wordmark", LIGHT, "transparent") },
  { out: "logo/logo-dark.png", ...logo("wordmark", DARK, "transparent") },
  { out: "logo/logo-wide-light.png", ...logo("side", LIGHT, "transparent") },
  { out: "logo/logo-wide-dark.png", ...logo("side", DARK, "transparent") },
  // the mark: the app icon; 1024 has square corners because iOS cuts its own
  { out: "mark/mark-1024.png", ...tile("mark", 1024, DARK, false) },
  { out: "mark/mark-512.png", ...tile("mark", 512) },
  { out: "mark/mark-192.png", ...tile("mark", 192) },
  { out: "mark/favicon-96.png", ...tile("letter", 96) },
  // instagram: the profile picture and highlight covers are cut to a circle by Instagram, so no corners here
  { out: "instagram/profile.png", ...tile("mark", 1080, DARK, false) },
  { out: "instagram/highlight.png", ...tile("letter", 1080, DARK, false) },
  { out: "instagram/post.png", ...card(1080, 1080) },
  { out: "instagram/story.png", ...card(1080, 1920) },
  // youtube: the channel picture is cut to a circle; the watermark sits in a corner of every video
  { out: "youtube/profile.png", ...tile("mark", 800, DARK, false) },
  { out: "youtube/banner.png", ...banner() },
  { out: "youtube/watermark.png", ...tile("letter", 150) },
  { out: "youtube/thumbnail.png", ...card(1280, 720) },
  // tiktok: the profile picture is cut to a circle; the cover is a 9:16 video's first frame
  { out: "tiktok/profile.png", ...tile("mark", 1080, DARK, false) },
  { out: "tiktok/cover.png", ...card(1080, 1920), textWidth: 680 }, // the tagline kept clear of the buttons on the right
  // the app's own icons, where Next picks them up
  { out: join(APP, "icon.png"), ...tile("letter", 96) },
  { out: join(APP, "apple-icon.png"), ...tile("mark", 180) },
];

/** The SVGs: the same drawings as vectors, the word as text with Outfit embedded. */
const VECTORS = [
  { out: "logo/logo-light.svg", ...logo("wordmark", LIGHT, "transparent", 100) },
  { out: "logo/logo-dark.svg", ...logo("wordmark", DARK, "transparent", 100) },
  { out: "mark/mark.svg", ...tile("mark", 512) },
  { out: "mark/favicon.svg", ...tile("letter", 96) },
];

async function loadPlaywright() {
  let path = process.env.PLAYWRIGHT_PATH;
  if (!path) {
    const npx = join(homedir(), ".npm/_npx");
    const dir = existsSync(npx) ? readdirSync(npx).find((d) => existsSync(join(npx, d, "node_modules/playwright/index.mjs"))) : undefined;
    if (!dir) throw new Error("no Playwright in ~/.npm/_npx (set PLAYWRIGHT_PATH to its index.mjs)");
    path = join(npx, dir, "node_modules/playwright/index.mjs");
  }
  return import(pathToFileURL(resolve(path)).href);
}

const base64 = async (file) => (await readFile(join(FONTS, file))).toString("base64");

/** @font-face rules for the template, the TTFs inlined so no network is needed. */
async function fontFaces(outfit) {
  const face = (family, weight, data) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/ttf;base64,${data}) format("truetype")}`;
  return [face("Outfit", 600, outfit), face("Geist", 400, await base64("geist-400.ttf")), face("Geist", 600, await base64("geist-600.ttf"))].join("\n");
}

const r = (n) => Math.round(n * 100) / 100;

/** The drawing on the page as an SVG, from where the word and the dots landed. */
function svgOf(spec, m, outfit) {
  const { w, h } = m.frame;
  const ink = spec.ink ?? LIGHT;
  const ground = spec.bg && spec.bg !== "transparent" ? `  <rect width="${r(w)}" height="${r(h)}" rx="${r(spec.radius ?? 0)}" fill="${spec.bg}"/>\n` : "";
  const text = spec.kind === "letter" ? "a" : "attunr";
  const circles = m.dots.map((d, i) => `  <circle cx="${r(d.cx)}" cy="${r(d.cy)}" r="${r(d.r)}" fill="${DOTS[i]}"/>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" width="${r(w)}" height="${r(h)}">
  <style>@font-face{font-family:"Outfit";font-weight:600;src:url(data:font/ttf;base64,${outfit}) format("truetype")}</style>
${ground}  <text x="${r(m.word.x)}" y="${r(m.word.baseline)}" font-family="Outfit, sans-serif" font-weight="600" font-size="${r(m.word.fontSize)}" letter-spacing="${r(m.word.letterSpacing)}" fill="${ink}">${text}</text>
${circles}
</svg>
`;
}

/** An ICO holding the given PNGs (32-bit BMP entries, as attunr's generator built it). */
async function buildIco(pngs) {
  const images = await Promise.all(
    pngs.map(async (png) => {
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { size: info.width, data };
    }),
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // ICO
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  const bodies = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const bmp = Buffer.alloc(40);
    bmp.writeUInt32LE(40, 0);
    bmp.writeInt32LE(size, 4);
    bmp.writeInt32LE(size * 2, 8); // height is doubled in an ICO (colour + mask)
    bmp.writeUInt16LE(1, 12);
    bmp.writeUInt16LE(32, 14);
    const pixels = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const src = (y * size + x) * 4;
        const dst = ((size - 1 - y) * size + x) * 4; // bottom-up, BGRA
        pixels[dst] = data[src + 2];
        pixels[dst + 1] = data[src + 1];
        pixels[dst + 2] = data[src];
        pixels[dst + 3] = data[src + 3];
      }
    }
    const body = Buffer.concat([bmp, pixels]);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size < 256 ? size : 0, 0);
    entry.writeUInt8(size < 256 ? size : 0, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(body.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += body.length;
    entries.push(entry);
    bodies.push(body);
  }
  return Buffer.concat([header, ...entries, ...bodies]);
}

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2400, height: 2000 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(HERE, "brand.html")).href);
  const outfit = await base64("outfit-wordmark.ttf");
  await page.addStyleTag({ content: await fontFaces(outfit) });
  await page.evaluate(() => Promise.all([document.fonts.load('600 20px "Outfit"'), document.fonts.load('400 20px "Geist"'), document.fonts.load('600 20px "Geist"')]));

  const out = (spec) => (isAbsolute(spec.out) ? spec.out : join(BRAND, spec.out));
  const save = async (spec, data) => {
    await mkdir(dirname(out(spec)), { recursive: true });
    await writeFile(out(spec), data);
    console.log(`wrote ${relative(ROOT, out(spec))}`);
  };
  const draw = async (spec) => {
    await page.evaluate((s) => window.render(s), spec);
    return page.locator("#frame").screenshot({ omitBackground: true, type: "png" });
  };

  for (const spec of PICTURES) await save(spec, await draw(spec));

  for (const spec of VECTORS) {
    await page.evaluate((s) => window.render(s), spec);
    await save(spec, svgOf(spec, await page.evaluate(() => window.measure()), outfit));
  }

  const ico = await buildIco([await draw(tile("letter", 48)), await draw(tile("letter", 32))]);
  await save({ out: "mark/favicon.ico" }, ico);
  await save({ out: join(APP, "favicon.ico") }, ico);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
