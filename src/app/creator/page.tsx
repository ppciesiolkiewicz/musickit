import { redirect } from "next/navigation";

/** The creator moved under Theory as the cheatsheet builder; old links (with their ?key=) still land there. */
export default async function CreatorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") params.set(k, v);
  const qs = params.toString();
  redirect(`/theory/cheatsheet${qs ? `?${qs}` : ""}`);
}
