/**
 * Who writes the articles: Pio, in Pio's own words (2026-11-26). The card at the end of every article and /about both show
 * this, and the articles' structured data names Pio as their author with /about as the page about them.
 */
export const AUTHOR = {
  name: "Pio",
  role: "founder of attunr",
  path: "/about",
  photo: "/images/founder.jpg",
  alt: "Pio, founder of attunr, playing bass on stage",
  note: [
    "I'm Pio. I sing, play guitar and love music. I didn't finish music school, but I've always loved learning. It runs through my work as a software engineer, my yoga teaching, and circus, dance and flow arts on stage.",
    "I see singing and music practice as part of looking after myself. Making your body vibrate with a note brings me back into my body, the way yoga does.",
    "I know how hard it can be to sit down and practice when there's too much to choose from. That's why I made attunr. It gives you new guitar and singing exercises every day, so you don't get stuck on what you already know.",
  ],
} as const;

/** Pio as a schema.org Person, the `author` of every article and the main subject of /about. `site` has no trailing slash. */
export function authorJsonLd(site: string) {
  return { "@type": "Person", "@id": `${site}${AUTHOR.path}#person`, name: AUTHOR.name, url: `${site}${AUTHOR.path}`, image: `${site}${AUTHOR.photo}`, jobTitle: "Founder", worksFor: { "@id": `${site}/#organization` } };
}
