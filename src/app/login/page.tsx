import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { safeNext } from "@/features/account/server/auth";
import { googleConfig } from "@/features/account/server/google";
import { NO_ACCOUNTS } from "@/features/account/server/http";
import { loginWords } from "@/features/account/loginGuard";
import LinkForm from "@/features/account/ui/LinkForm";
import { placeFor } from "@/lib/appPlaces";
import { databaseUrl } from "@/lib/db/client";

export const metadata: Metadata = { title: "Log in · attunr", robots: { index: false } };

/** What the visitor was on the way to, in the intro's words: "your Practice plan", "Interactive notes", "Practice". */
function goingTo(next: string | null): string {
  const place = next ? placeFor(next) : null;
  if (!place) return "your practice plan";
  return place.href === "/plan" ? "your Practice plan" : place.label;
}

/** The log-in form. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  // an invite has its own words; otherwise the intro names where the visitor was going
  const { title, intro } = loginWords(next, goingTo(next));
  return (
    <PageShell centered title={title} intro={intro} active="/login">
      {databaseUrl() ? (
        <div className="flex w-full justify-center">
          <LinkForm google={!!googleConfig()} next={next} error={q.error} />
        </div>
      ) : (
        <p className="text-sm text-slate-400">{NO_ACCOUNTS}</p>
      )}
    </PageShell>
  );
}
