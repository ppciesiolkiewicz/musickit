import Link from "next/link";
import { LabelSelect } from "@/features/theory/useLabelSystem";

export const SITE_LINKS = [
  { href: "/", label: "Piano" },
  { href: "/chords", label: "Chords" },
  { href: "/triads", label: "Triads" },
  { href: "/scales", label: "Scales" },
  { href: "/caged", label: "CAGED" },
  { href: "/arpeggios", label: "Arpeggios" },
  { href: "/creator", label: "Creator" },
  { href: "/improv", label: "Improv" },
  { href: "/tuner", label: "Tuner" },
  { href: "/looper", label: "Looper" },
];

/** The Music Kit top navigation. Shared by every page; knows nothing about any feature. */
export default function SiteNav({ active }: { active: string }) {
  return (
    <nav aria-label="Music Kit" className="flex flex-wrap items-center gap-1">
      <span className="mr-3 text-sm font-light tracking-widest text-slate-400">MUSIC KIT</span>
      {SITE_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active === l.href ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${active === l.href ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
        >
          {l.label}
        </Link>
      ))}
      <LabelSelect className="ml-auto" />
    </nav>
  );
}
