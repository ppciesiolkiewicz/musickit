import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { btn } from "@/components/ui";

export const metadata: Metadata = { title: "Note not shared · attunr", robots: { index: false } };

/** A note link that was stopped, or never was one: what happened and what to do. Served with status 404. */
export default function SharedNoteNotFound() {
  return (
    <PageShell centered title="This note isn't shared any more" intro="The person who shared it stopped the link, or the link is wrong. Ask them to share the note again." active="/404">
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={btn}>
          <Icon name="chevron-left" size={14} /> Go to home
        </Link>
      </div>
    </PageShell>
  );
}
