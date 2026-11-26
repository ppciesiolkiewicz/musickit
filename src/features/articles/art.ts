/**
 * Each article's picture, drawn by `scripts/learn-art.mjs` into `public/images/learn/art/<slug>.svg` (1200 × 480): a banner on its
 * /learn card and over its body. Decoration only, so it has no alt text.
 */
export const articleArt = (slug: string): string => `/images/learn/art/${slug}.svg`;
