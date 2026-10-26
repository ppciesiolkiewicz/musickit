"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LabelSelect, useLabelSystem } from "@/features/theory/useLabelSystem";
import { LABEL_SYSTEMS, type LabelSystem } from "@/features/theory/labels";
import { FAMILIES, TONICS, modeAlias } from "@/features/theory/theory";
import { MODE_PAGES } from "@/features/theory/scales";
import { PENTATONICS, findPentatonic, pentatonicLabel } from "@/features/theory/pentatonics";
import { scaleHref, scalesIndexHref } from "@/features/theory/keySlug";
import { Chip, InfoBox, InfoButton, Select } from "@/components/ui";
import { DegreeLegend } from "@/components/theory/DegreeLegend";
import { PocketTools, type PocketStatus } from "@/features/instruments";
import { PHONE_QUERY } from "@/components/usePhone";

/** Room the sticky bar takes at the top, for `scroll-mt` on the sections linked to by #hash. */
export const UNDER_BAR = "scroll-mt-48";

/**
 * A scales page with its settings: on wide screens the bar is a column pinned to the right edge of the window,
 * beside the content; on narrow ones (and with `side` off, when embedded in another page) it floats over the top.
 * The bar is rendered once either way, so the pocket tools keep playing across a resize.
 */
export function WithSettings({ bar, side, children }: { bar: ReactNode; side: boolean; children: ReactNode }) {
  if (!side) return <div className="flex flex-col gap-5">{bar}{children}</div>;
  return (
    // reaches out over PageShell's right padding so the column sits flush with the window
    <div className="flex flex-col gap-5 lg:-mr-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-8">
      <div className="contents lg:col-start-2 lg:row-start-1 lg:block lg:sticky lg:top-0">{bar}</div>
      {/* necks that bleed past a centred page would run under the column, so they stay in it here */}
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:[&_.bleed]:mx-0">{children}</div>
    </div>
  );
}

/** One labelled row of the bar. The chips wrap rather than scroll sideways. */
export function BarRow({ label, info, children }: { label: string; info?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex w-20 shrink-0 items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
        {label}
        {info && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About ${label.toLowerCase()}`} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5">{children}</div>
      {open && info && <InfoBox>{info}</InfoBox>}
    </div>
  );
}

const KEY_INFO = "The home note of the music. Every note and chord below is worked out relative to it, and spelled to match (F♯ in G major, not G♭).";
const LABEL_INFO = "How notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees, or each note's job in the chord. One setting for the whole app; dot colours stay the same either way.";

/**
 * The settings that float over a scales page while it scrolls: key, labels and (on a mode page) which scale.
 * It starts open; on a phone it folds itself away to one line the first time the page is scrolled down, so it
 * does not sit over what is being read. After that (or once the header is tapped) only the header opens and closes it.
 * `scale` is the current mode page's slug; leave it out on the index.
 */
export function ScaleSettingsBar({
  tonicPc, onTonic, scale, onScale, omitLabels, labels: showLabels = true, children, side = false, clickAlways, onStatus,
}: {
  /** drawn as the right-hand column of `WithSettings` on wide screens */
  side?: boolean;
  tonicPc: number;
  onTonic: (pc: number) => void;
  scale?: string;
  /** pick the scale in place (the singing page) instead of going to its page */
  onScale?: (slug: string) => void;
  omitLabels?: LabelSystem[];
  /** the Labels row; off where the page writes its own labels */
  labels?: boolean;
  /** more rows of the host's own, under the key */
  children?: ReactNode;
  /** the pocket tools' status (tempo, its next beat) for the host as well; keep it stable (a state setter) */
  onStatus?: (s: PocketStatus) => void;
  /** the pocket tools' click runs, muted, from the first press on the page (the singing page keeps its bar on it) */
  clickAlways?: boolean;
}) {
  const [open, setOpen] = useState(true);
  // true until the bar has folded itself once or been toggled by hand
  const autoFold = useRef(true);
  useEffect(() => {
    // phones only (either way up): wider screens have room to keep it open
    if (!window.matchMedia(PHONE_QUERY).matches) return;
    const start = window.scrollY;
    const onScroll = () => {
      if (!autoFold.current) return;
      if (window.scrollY - start > 80) {
        autoFold.current = false;
        setOpen(false);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const toggle = () => {
    autoFold.current = false;
    setOpen((v) => !v);
  };
  const [status, setStatus] = useState<PocketStatus | null>(null);
  const onPocket = useCallback((s: PocketStatus) => {
    setStatus(s);
    onStatus?.(s);
  }, [onStatus]);
  const [labels] = useLabelSystem();
  const keyName = TONICS.find((t) => t.pc === tonicPc)?.name;
  const scaleName = scale ? (MODE_PAGES.find((m) => m.slug === scale) ?? findPentatonic(scale))?.name : undefined;
  const labelName = LABEL_SYSTEMS.find((l) => l.id === labels)?.label;
  return (
    // breaks out of the page column to span the window, less a small gutter each side; as a side column it fills the window's height
    <div className={`sticky top-2 z-20 mx-[calc(50%-50vw+0.5rem)] flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-2.5 shadow-lg sm:px-6 sm:py-3 shadow-black/30 backdrop-blur ${side ? SIDE : ""}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`group flex items-center gap-2 rounded-md text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${side ? "lg:pointer-events-none" : ""}`}
      >
        <span className="text-[11px] uppercase tracking-wider text-slate-500">Settings</span>
        <span className="shrink-0 truncate text-sm font-medium text-slate-100">{keyName}{scaleName ? ` ${scaleName}` : ""}</span>
        {/* the rest of the settings at a glance, as room allows */}
        <span className={`flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap text-slate-400 ${side ? "lg:invisible" : ""}`}>
          {showLabels && labelName && <Fact from="sm">{labelName}</Fact>}
          {status && <Fact from="md">{status.bpm} bpm</Fact>}
          {status && <Fact from="lg">Drone {status.drone}</Fact>}
          {status && status.playing.length > 0 && (
            <Fact className="!border-emerald-400/50 !text-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              <span className="capitalize">{status.playing.join(", ")}</span>
            </Fact>
          )}
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 transition group-hover:border-sky-400 group-hover:text-sky-200 ${side ? "lg:hidden" : ""}`}>
          {open ? "Hide" : "Show"}
          <svg viewBox="0 0 12 12" aria-hidden className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {/* hidden rather than unmounted, so the pocket tools keep playing while it is folded */}
      <div className={`${open ? "flex" : "hidden"} max-h-[70vh] flex-col gap-2 overflow-y-auto sm:max-h-none sm:overflow-visible ${side ? "lg:flex" : "xl:flex-row xl:items-center"}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* the scale and its key on one row */}
          <BarRow label={scale ? "Scale" : "Key"} info={KEY_INFO}>
            {scale && <ScalePicker slug={scale} tonicPc={tonicPc} onScale={onScale} />}
            {TONICS.map((t) => (
              <Chip key={t.pc} on={t.pc === tonicPc} onClick={() => onTonic(t.pc)}>{t.name}</Chip>
            ))}
            {scale && !onScale && <AllScalesLink slug={scale} tonicPc={tonicPc} />}
          </BarRow>
          {children}
          {showLabels && (
            <BarRow label="Labels" info={LABEL_INFO}>
              <LabelSelect showLabel={false} omit={omitLabels} />
            </BarRow>
          )}
        </div>
        {/* play-along tools: under the settings on narrow screens, on the right once there is room */}
        <PocketTools keyPc={tonicPc} onStatus={onPocket} clickAlways={clickAlways} stacked={side} className={`border-t border-slate-800 pt-2 ${side ? "" : "xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0"}`} />
      </div>
    </div>
  );
}

/** The bar as a side column: flush to the window's right edge and as tall as the window, scrolling on its own. */
const SIDE = "lg:static lg:mx-0 lg:h-dvh lg:overflow-y-auto lg:rounded-none lg:border-y-0 lg:border-r-0 lg:px-5 lg:py-4 lg:shadow-none";

const FROM = { sm: "hidden sm:inline-flex", md: "hidden md:inline-flex", lg: "hidden lg:inline-flex" };

/** A small rounded tag in the bar's header; `from` hides it below that width. */
function Fact({ from, className = "", children }: { from?: keyof typeof FROM; className?: string; children: ReactNode }) {
  return <span className={`${from ? FROM[from] : "inline-flex"} shrink-0 items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] ${className}`}>{children}</span>;
}

/** Switch to another mode or pentatonic in the same key (or, with `onScale`, just pick one). */
function ScalePicker({ slug, tonicPc, onScale }: { slug: string; tonicPc: number; onScale?: (slug: string) => void }) {
  const router = useRouter();
  return (
    <Select
      size="sm"
      className="mr-1"
      value={slug}
      onChange={(s) => (onScale ? onScale(s) : router.push(scaleHref(s, tonicPc)))}
      aria-label="Scale"
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

/** Back to the list of every scale, at this one's family. */
function AllScalesLink({ slug, tonicPc }: { slug: string; tonicPc: number }) {
  const current = MODE_PAGES.find((m) => m.slug === slug);
  const famId = current ? FAMILIES[current.familyIndex].id : findPentatonic(slug) ? (findPentatonic(slug)!.basic ? "pent" : "pentMore") : "major";
  return (
    <Link href={scalesIndexHref(tonicPc, `#part-${famId}`)} className="ml-1 shrink-0 rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-sky-300 transition hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
      ← All scales
    </Link>
  );
}

/** "Major" or "Minor" next to Ionian and Aeolian; nothing for the other modes. */
export function ModeAlias({ familyIndex, modeIndex }: { familyIndex: number; modeIndex: number }) {
  const alias = modeAlias(familyIndex, modeIndex);
  if (!alias) return null;
  return <span> ({alias})</span>;
}

/** The degree colours with a heading and a short reading guide; `children` is the longer explanation behind the (i). */
export function ColourKey({ title = "Colour key", children }: { title?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={title} className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
      <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
        {children && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About the ${title.toLowerCase()}`} />}
      </h2>
      <DegreeLegend />
      <p className="text-xs text-slate-500">Each colour is a scale degree, counted from the key. A ♭ or ♯ note keeps its degree&apos;s colour: ♭3 is still amber.</p>
      {open && children && <InfoBox>{children}</InfoBox>}
    </section>
  );
}
