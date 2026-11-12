import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { pageBar } from "@/components/PageHeading";
import Icon from "@/components/Icon";
import { NOTE_EYEBROW, NoteViewProvider, NotesCreatorHeader, PRESET_INFO, PresetHeader, PresetNote, StudioApp, presetInfo } from "@/features/teachers/studio";

type Params = { slug: string };
type Search = Record<string, string | string[] | undefined>;

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => Object.keys(PRESET_INFO).map((slug) => ({ slug }));

/** `?edit=true` opens the note in the notes creator. */
const editing = (search: Search) => search.edit === "true";

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }): Promise<Metadata> {
  const note = presetInfo((await params).slug);
  if (!note) return {};
  if (editing(await searchParams)) return { title: `Edit: ${note.title} · attunr`, robots: { index: false } };
  return { title: `${note.title} · attunr`, description: note.description };
}

/** where the note sits in the nav: with the notes creator */
const ACTIVE = "/teachers/studio?notes=1";
const ACTION = "inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800";

/** A note made ahead, at a plain address such as /note/minor-pentatonic; with `?edit=true` the same note opens in the notes creator. The page's header is the note's own opening, its title and the line about it (`PresetHeader`; kept equal to `presetInfo.ts` by a test), so changes made in the creator show in it. */
export default async function NotePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const note = presetInfo(slug);
  if (!note) notFound();
  if (editing(await searchParams)) {
    return (
      <NoteViewProvider>
        <PageShell active={ACTIVE} full title="Notes creator" header={
          <NotesCreatorHeader title="Notes creator" bar={pageBar(ACTIVE)} intro={`“${note.title}”, open to change: add, move or remove widgets. This is a demo page: your changes are kept as you make them, so View the note shows them, until you reload.`}
            action={<Link href={`/note/${slug}`} className={ACTION}><Icon name="eye" size={15} />View the note</Link>} />
        }>
          <StudioApp notes preset={slug} />
        </PageShell>
      </NoteViewProvider>
    );
  }
  return (
    <PageShell active={ACTIVE} devices title={note.title} header={
      <PresetHeader slug={slug} title={note.title} intro={note.description} eyebrow={NOTE_EYEBROW} bar={pageBar(ACTIVE)}
        action={<Link href={`/note/${slug}?edit=true`} className={ACTION}><Icon name="pencil" size={15} />Edit this note</Link>} />
    }>
      <PresetNote slug={slug} />
    </PageShell>
  );
}
