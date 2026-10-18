import Image from "next/image";
import { STYLES, photoFor, type PhotoKey, type PhotoRef } from "@/features/styles/styles";

export type { PhotoKey };

/**
 * Stock photos for the landing page: free Unsplash photos served from their CDN, each with its photographer credited.
 * `id` is the part after "photo-" in the images.unsplash.com address. These are the defaults (and Plain's); a music style
 * can swap any slot for its own photo in src/features/styles/styles.ts.
 */
export const PHOTOS: Record<PhotoKey, PhotoRef> = {
  teacherTablet: { id: "1758525863561-b33f7d5d97ff", alt: "A young woman shows a teenage girl a chord on the guitar, a tablet open beside them", by: "Vitaly Gariev", page: "https://unsplash.com/photos/TQIBrPIU9k8" },
  teacher: { id: "1758524944402-1903b38f848f", alt: "A teacher reaches over to place a student's fingers on the fretboard", by: "Vitaly Gariev", page: "https://unsplash.com/photos/S-vWVfbGr28" },
  teacherSmile: { id: "1780291119320-9a58e78f8181", alt: "A guitar teacher laughing as he explains, acoustic guitar in hand", by: "Brooke Balentine", page: "https://unsplash.com/photos/iDlleXuzQlI" },
  practising: { id: "1791564880578-fcec59853756", alt: "A guitarist in headphones practising alone in a sunlit room", by: "Brooke Balentine", page: "https://unsplash.com/photos/77xfQCFI2xI" },
  couch: { id: "1758874574013-04d489138825", alt: "A man playing an acoustic guitar on his sofa at home", by: "Vitaly Gariev", page: "https://unsplash.com/photos/5Kq8ilz_uuk" },
};

function Credit({ p }: { p: PhotoRef }) {
  return (
    <figcaption className="absolute bottom-1.5 right-2 text-[10px] text-white/70 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
      Photo:{" "}
      <a href={p.page ?? "https://unsplash.com"} className="underline decoration-white/30 underline-offset-2 hover:text-white" target="_blank" rel="noopener">
        {p.by ? `${p.by} / Unsplash` : "Unsplash"}
      </a>
    </figcaption>
  );
}

/**
 * A landing photo. The default and every style's swap are all rendered; CSS (landing-styles.css) shows the one for the
 * current style, so the right photo is there from the first paint. Hidden ones are lazy and never download.
 */
export default function Photo({ name, className = "", sizes = "(min-width: 1024px) 40vw, 100vw", width = 1200, focus, priority = false, credit = true, fixed = false }: { name: PhotoKey; className?: string; sizes?: string; width?: number; /** object-position, to frame a face in a small crop */ focus?: string; priority?: boolean; credit?: boolean; /** always the default photo, whatever the style (a crop framed on a face, say) */ fixed?: boolean }) {
  const swaps = fixed ? [] : STYLES.flatMap((s) => {
    const p = photoFor(name, s.id);
    return p ? [{ style: s.id, p }] : [];
  });
  const img = (p: PhotoRef, eager: boolean) => (
    // Unsplash's CDN sizes and compresses the photo itself, so Next's optimiser is skipped
    <Image src={`https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&q=70&w=${width}`} alt={p.alt} fill sizes={sizes} priority={eager} loading={eager ? undefined : "lazy"} unoptimized className="object-cover" style={focus ? { objectPosition: focus } : undefined} />
  );
  if (!swaps.length) {
    return (
      <figure className={`relative overflow-hidden ${className}`}>
        {img(PHOTOS[name], priority)}
        {credit && <Credit p={PHOTOS[name]} />}
      </figure>
    );
  }
  return (
    <figure className={`relative overflow-hidden ${className}`} data-overrides={swaps.map((x) => x.style).join(" ")}>
      <div data-style-default className="absolute inset-0">
        {img(PHOTOS[name], false)}
        {credit && <Credit p={PHOTOS[name]} />}
      </div>
      {swaps.map(({ style, p }) => (
        <div key={style} data-style-only={style} className="absolute inset-0">
          {img(p, false)}
          {credit && <Credit p={p} />}
        </div>
      ))}
    </figure>
  );
}
