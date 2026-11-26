import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { shareCard } from "@/app/_og/card";
import { AUTHOR } from "@/features/articles/author";

/* /about's link preview (src/app/_og/card.tsx): Pio's own photo where the other pages have a drawing. */

export { contentType, size } from "@/app/_og/card";
export const alt = AUTHOR.alt;

export default async function Image() {
  const photo = await readFile(join(process.cwd(), "public", AUTHOR.photo));
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`;
  return shareCard({
    eyebrow: "About",
    title: `${AUTHOR.name}, the ${AUTHOR.role}`,
    path: AUTHOR.path,
    art: <img src={src} alt="" width={460} height={460} style={{ width: 460, height: 460, borderRadius: 32, objectFit: "cover" }} />,
  });
}
