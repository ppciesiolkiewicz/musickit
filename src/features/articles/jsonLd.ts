import { authorJsonLd } from "./author";
import type { Article } from "./model";

/**
 * The structured data for an article at /learn/<slug>: an Article (written by Pio, a Person whose page is /about, published by the site's Organization, from the root
 * layout's JSON-LD) and its breadcrumb, Home › Learn › the article, which Google shows in place of the bare address.
 * `site` is the site's address with no trailing slash (`SITE_URL`).
 */
export function articleJsonLd(a: Article, site: string) {
  const url = `${site}/learn/${a.slug}`;
  const org = { "@id": `${site}/#organization` };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: a.title,
        description: a.description,
        url,
        mainEntityOfPage: url,
        image: `${url}/opengraph-image`,
        dateModified: a.updated,
        inLanguage: "en",
        author: authorJsonLd(site),
        publisher: org,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "Learn", item: `${site}/learn` },
          { "@type": "ListItem", position: 3, name: a.title, item: url },
        ],
      },
    ],
  };
}

/**
 * The structured data for a topic's page at /learn/<topic>: a CollectionPage listing its articles, published by the site's
 * Organization, and its breadcrumb, Home › Learn › the topic.
 */
export function topicJsonLd(t: { topic: string; title: string; description: string }, articles: Pick<Article, "slug" | "title">[], site: string) {
  const url = `${site}/learn/${t.topic}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        name: t.title,
        description: t.description,
        url,
        inLanguage: "en",
        publisher: { "@id": `${site}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: articles.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${site}/learn/${a.slug}`, name: a.title })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "Learn", item: `${site}/learn` },
          { "@type": "ListItem", position: 3, name: t.title, item: url },
        ],
      },
    ],
  };
}
