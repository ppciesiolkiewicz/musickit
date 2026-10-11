import { redirect } from "next/navigation";

/** The cheatsheet builder moved out of Theory to /cheatsheet; old links (with their ?key=) still land there. */
export default async function OldCheatsheetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") params.set(k, v);
  const qs = params.toString();
  redirect(`/cheatsheet${qs ? `?${qs}` : ""}`);
}
