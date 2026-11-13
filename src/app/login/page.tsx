import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { safeNext } from "@/features/account/server/auth";
import { googleConfig } from "@/features/account/server/google";
import { NO_ACCOUNTS } from "@/features/account/server/http";
import LinkForm from "@/features/account/ui/LinkForm";
import { databaseUrl } from "@/lib/db/client";

export const metadata: Metadata = { title: "Log in · attunr", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell centered title="Log in" intro="Log in with your email or with Google. If you're new, you'll set up your account next. Every tool also works without one." active="/login">
      {databaseUrl() ? <LinkForm google={!!googleConfig()} next={safeNext(q.next)} error={q.error} /> : <p className="text-sm text-slate-400">{NO_ACCOUNTS}</p>}
    </PageShell>
  );
}
