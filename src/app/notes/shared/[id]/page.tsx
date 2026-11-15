import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { PageHeading, PageHeadingRow, PageIntro, pageBar } from "@/components/PageHeading";
import { readable } from "@/features/plan/model/editBlock";
import { NoteReader } from "@/features/teachers/notes";
import { notePageParts } from "@/features/teachers/notes/model/note";
import UserDataProvider from "@/features/userData/client/UserDataProvider";
import { userData } from "@/features/userData/server/http";
import { readNoteShare } from "@/features/userData/server/shares";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shared note · attunr", robots: { index: false } };

/** where the note sits in the nav: with the notes creator */
const ACTIVE = "/teachers/studio?notes=1";
const EYEBROW = "Shared note";

const sharedOn = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * A note shared as a link: anyone may open it, with no login (`publicPaths`). It is the frozen copy made when it was shared,
 * read on the server and drawn as a demo note's page is: its title and opening line as the header, the rest in `NoteReader`.
 * Its tools run over memory stores, so a reader's changes save nothing. A stopped or unknown link is the 404 beside it.
 */
export default async function SharedNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = userData();
  const share = store ? await readNoteShare(store.repo, id) : null;
  if (!share) notFound();
  const { title, intro, body } = notePageParts(readable(share.note));
  const header = title ? (
    <>
      <PageHeadingRow heading={<PageHeading title={title} eyebrow={EYEBROW} bar={pageBar(ACTIVE)} />} corner={null} />
      {intro && <PageIntro>{intro}</PageIntro>}
    </>
  ) : (
    <>
      <PageHeadingRow heading={<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{EYEBROW}</p>} corner={null} />
      {intro && <PageIntro>{intro}</PageIntro>}
    </>
  );
  return (
    <PageShell active={ACTIVE} devices title={title ?? EYEBROW} header={header}>
      <UserDataProvider source="memory">
        <NoteReader block={body} body />
      </UserDataProvider>
      <p className="mt-6 text-center text-xs text-slate-500">Shared on {sharedOn(share.sharedAt)}.</p>
    </PageShell>
  );
}
