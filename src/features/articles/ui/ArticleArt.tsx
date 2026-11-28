import Image from "next/image";
import { articleArt } from "../art";

/**
 * An article's picture in the page's tone: both drawings are on the page, `.tone-dark` and `.tone-light` (decor.css) show the one
 * that matches `data-tone` on <html>, so switching style swaps it with no re-render. The hidden one is lazy, so it is not fetched.
 */
export default function ArticleArt({ slug, className, priority = false }: { slug: string; className: string; priority?: boolean }) {
  return (
    <>
      <Image src={articleArt(slug)} width={1200} height={480} alt="" unoptimized priority={priority} className={`tone-dark ${className}`} />
      <Image src={articleArt(slug, "light")} width={1200} height={480} alt="" unoptimized className={`tone-light ${className}`} />
    </>
  );
}
