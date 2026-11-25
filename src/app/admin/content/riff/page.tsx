import type { Metadata } from "next";
import { contentTitle } from "@/features/devtools/registry";
import ContentShell from "@/features/devtools/ContentShell";
import RiffLab from "@/features/devtools/riff/RiffLab";

export const metadata: Metadata = { title: contentTitle("/admin/content/riff") };

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The riff maker. `?riff=<block id>` opens that block's riff (the record page sends a riff block's cell here). */
export default async function RiffPage({ searchParams }: Search) {
  const { riff } = await searchParams;
  const open = Array.isArray(riff) ? riff[0] ?? "" : riff ?? "";
  return <ContentShell wide><RiffLab open={open} /></ContentShell>;
}
