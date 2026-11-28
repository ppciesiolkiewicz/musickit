/**
 * Each article's picture, drawn by `scripts/learn-art.mjs` into `public/images/learn/art/<slug>.svg` (1200 × 480): a banner on its
 * /learn card and over its body. Decoration only, so it has no alt text. Drawn twice: `<slug>.svg` for the dark styles and
 * `<slug>-light.svg` for the bright ones; `ui/ArticleArt.tsx` puts both on the page and CSS shows the one for `data-tone`.
 */
export const articleArt = (slug: string, tone: "light" | "dark" = "dark"): string => `/images/learn/art/${slug}${tone === "light" ? "-light" : ""}.svg`;
