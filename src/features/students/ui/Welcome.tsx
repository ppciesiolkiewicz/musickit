"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, PRIMARY } from "@/features/account/ui/parts";
import { useAccount } from "@/features/account/useAccount";

/** The welcome page drawn from who is looking: a teacher's student by name; anyone else, or not known yet, the loading line. */
export function WelcomeView({ name }: { name: string | null }) {
  if (name === null) return <p role="status" className="text-sm text-slate-500">Loading…</p>;
  return (
    <Card>
      <h2 className="text-lg text-slate-100">Hello, {name}</h2>
      <p className="text-sm leading-relaxed text-slate-300">Your teacher made you a practice plan. It shows what to practise each day.</p>
      <Link href="/plan" className={PRIMARY}>Open your practice plan</Link>
    </Card>
  );
}

/**
 * `/welcome`, where a teacher's student lands after the claim link (a stub for now: a greeting and the way to their plan).
 * For a logged-in taught account only (`Account.taught`); anyone else is sent to `/plan`. Logged out, the proxy sends
 * them to log in first.
 */
export default function Welcome() {
  const { account, loaded } = useAccount();
  const router = useRouter();
  const taught = !!account?.taught;
  useEffect(() => {
    if (loaded && !taught) router.replace("/plan");
  }, [loaded, taught, router]);
  return <WelcomeView name={loaded && taught && account ? account.name : null} />;
}
