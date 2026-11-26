import Image from "next/image";
import { articleArt } from "../art";

/**
 * The article's picture (`art.ts`) under its title and intro: no frame, wider than the text column, pulled up so its faded
 * top runs behind the intro, its edges melting into the page. Decoration only: no alt text, under the text, takes no clicks.
 */
export default function ArticleHero({ slug }: { slug: string }) {
  return (
    <div aria-hidden className="article-hero pointer-events-none relative -z-10 -mx-3 -mt-8 -mb-2 sm:-mx-24 sm:-mt-16 sm:-mb-4">
      <Image src={articleArt(slug)} width={1200} height={480} alt="" unoptimized priority className="aspect-2/1 w-full object-cover sm:aspect-5/2" />
    </div>
  );
}
