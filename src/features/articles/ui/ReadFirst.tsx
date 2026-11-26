import Link from "next/link";
import { Fragment } from "react";
import { articleOf } from "../index";

/** The guides an article leans on (`Article.requires`), linked by title above its first block. */
export default function ReadFirst({ slugs }: { slugs?: string[] }) {
  const guides = (slugs ?? []).map(articleOf).filter((a) => a !== undefined);
  if (!guides.length) return null;
  return (
    <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
      {guides.length === 1 ? "Read this first: " : "Read these first: "}
      {guides.map((a, i) => (
        <Fragment key={a.slug}>
          {i > 0 && (i === guides.length - 1 ? " and " : ", ")}
          <Link href={`/learn/${a.slug}`} className="text-sky-300 underline-offset-2 hover:underline">{a.title}</Link>
        </Fragment>
      ))}
      .
    </p>
  );
}
