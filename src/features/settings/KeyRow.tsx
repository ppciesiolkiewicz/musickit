"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Chip, Select, SettingsRow } from "@/components/ui";
import { FAMILIES, TONICS, modeAlias } from "@/features/theory/theory";
import { MODE_PAGES } from "@/features/theory/scales";
import { PENTATONICS, findPentatonic, pentatonicLabel } from "@/features/theory/pentatonics";
import { scaleHref, scalesIndexHref } from "@/features/theory/keySlug";

const KEY_INFO = "The home note of the music. Every note and chord below is worked out relative to it, and spelled to match (F♯ in G major, not G♭).";

/** What a key row's scale picker does. */
export type ScaleChoice = {
  /** the current scale; none on the list of every scale (the picker shows "All scales") */
  slug?: string;
  /** pick the scale in place (the singing page) instead of going to its page */
  onPick?: (slug: string) => void;
  /** the page's own scale picker in place of the full list (CAGED: major or minor) */
  picker?: ReactNode;
};

/**
 * The key, and with `scale` the scale picker before it ("Scale" row then). `keys={false}` leaves the key chips out, for a
 * page that moves through the keys itself but still picks a scale.
 */
export function KeyRow({ tonicPc, onTonic, scale, keys = true }: { tonicPc: number; onTonic: (pc: number) => void; scale?: ScaleChoice; keys?: boolean }) {
  return (
    <SettingsRow label={scale ? "Scale" : "Key"} info={KEY_INFO}>
      {scale && (scale.picker ?? <ScalePicker slug={scale.slug} tonicPc={tonicPc} onScale={scale.onPick} />)}
      {keys && TONICS.map((t) => (
        <Chip key={t.pc} on={t.pc === tonicPc} onClick={() => onTonic(t.pc)}>{t.name}</Chip>
      ))}
    </SettingsRow>
  );
}

/** The key's name and the scale's, for the panel's `name`. */
export function keyAndScaleName(tonicPc: number | undefined, slug?: string, name?: string): string {
  const key = tonicPc === undefined ? "" : TONICS.find((t) => t.pc === tonicPc)?.name ?? "";
  const scale = name ?? (slug ? (MODE_PAGES.find((m) => m.slug === slug) ?? findPentatonic(slug))?.name : undefined);
  return [key, scale].filter(Boolean).join(" ");
}

/**
 * Go to another mode or pentatonic in the same key, or back to the list of every scale (at this one's family) with "All scales",
 * which is what it shows on the list itself (no `slug`). With `onScale` it just picks one, and has no "All scales".
 */
function ScalePicker({ slug, tonicPc, onScale }: { slug?: string; tonicPc: number; onScale?: (slug: string) => void }) {
  const router = useRouter();
  const toList = () => {
    const current = MODE_PAGES.find((m) => m.slug === slug);
    const pent = slug ? findPentatonic(slug) : undefined;
    const famId = current ? FAMILIES[current.familyIndex].id : pent ? (pent.basic ? "pent" : "pentMore") : "major";
    router.push(scalesIndexHref(tonicPc, slug ? `#part-${famId}` : ""));
  };
  return (
    <Select
      size="sm"
      className="mr-1"
      value={slug ?? ""}
      onChange={(s) => (onScale ? onScale(s) : s ? router.push(scaleHref(s, tonicPc)) : toList())}
      aria-label="Scale"
      options={onScale ? [] : [{ value: "", label: "All scales" }]}
      groups={[{ label: "Pentatonic scales", options: PENTATONICS.filter((p) => p.basic).map((p) => ({ value: p.slug, label: pentatonicLabel(p) })) }].concat(FAMILIES.map((f, fi) => ({
        label: f.label,
        options: MODE_PAGES.filter((m) => m.familyIndex === fi).map((m) => {
          const alias = modeAlias(m.familyIndex, m.modeIndex);
          return { value: m.slug, label: alias ? `${m.name} (${alias})` : m.name };
        }),
      }))).concat({ label: "More pentatonic scales", options: PENTATONICS.filter((p) => !p.basic).map((p) => ({ value: p.slug, label: pentatonicLabel(p) })) })}
    />
  );
}
