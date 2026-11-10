import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { safeNext } from "@/features/account/server/auth";
import { googleConfig } from "@/features/account/server/google";
import { NO_ACCOUNTS } from "@/features/account/server/http";
import LinkForm from "@/features/account/ui/LinkForm";
import { databaseUrl } from "@/lib/db/client";

export const metadata: Metadata = { title: "Create account · attunr", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell title="Create account" intro="An account for students and teachers. It is free, and every tool also works without one." active="/register">
      {databaseUrl() ? <LinkForm register google={!!googleConfig()} next={safeNext(q.next)} /> : <p className="text-sm text-slate-400">{NO_ACCOUNTS}</p>}
    </PageShell>
  );
}
