import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { safeNext } from "@/features/account/server/auth";
import { googleConfig } from "@/features/account/server/google";
import { NO_ACCOUNTS } from "@/features/account/server/http";
import LinkForm from "@/features/account/ui/LinkForm";
import TourCard from "@/features/intro/TourCard";
import { placeFor } from "@/lib/appPlaces";
import { databaseUrl } from "@/lib/db/client";

export const metadata: Metadata = { title: "Log in · attunr", robots: { index: false } };

/** What the visitor was on the way to, in the intro's words: "your AI autoplan", "Interactive notes", "Practice". */
function goingTo(next: string | null): string {
  const place = next ? placeFor(next) : null;
  if (!place) return "your practice plan";
  return place.href === "/plan" ? "your AI autoplan" : place.label;
}

/** The form, and the quick tour beside it on a wide screen (under it on a phone), so a visitor sees what logging in opens. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  return (
    <PageShell centered title="Log in" intro={`Log in with your email or with Google to open ${goingTo(next)}. If you're new, this also creates your account.`} active="/login">
      {databaseUrl() ? (
        <div className="grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          {/* side by side, the card's top lines up with the player's, under the tour's "Quick tour" row (30px and its 12px gap) */}
          <div className="flex justify-center lg:pt-[2.625rem]">
            <LinkForm google={!!googleConfig()} next={next} error={q.error} />
          </div>
          <TourCard />
        </div>
      ) : (
        <p className="text-sm text-slate-400">{NO_ACCOUNTS}</p>
      )}
    </PageShell>
  );
}
