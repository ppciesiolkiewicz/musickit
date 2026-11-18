"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, PRIMARY } from "@/features/account/ui/parts";
import { useAccount } from "@/features/account/useAccount";
import { usePlan } from "@/features/plan/store/usePlan";

/**
 * The welcome page drawn from who is looking: a teacher's student by name, with whether their teacher has made them a week
 * yet (`hasPlan`: the first week can fail to be made); anyone else, or not known yet, the loading line.
 */
export function WelcomeView({ name, hasPlan }: { name: string | null; hasPlan: boolean }) {
  if (name === null) return <p role="status" className="text-sm text-slate-500">Loading…</p>;
  return (
    <Card>
      <h2 className="text-lg text-slate-100">Hello, {name}</h2>
      <p className="text-sm leading-relaxed text-slate-300">
        {hasPlan
          ? "Your teacher made you a practice plan. It shows what to practise each day."
          : "Your teacher set up attunr for you. When your teacher makes your first plan, you'll find it on your practice plan page."}
      </p>
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
  const plan = usePlan();
  const router = useRouter();
  const taught = !!account?.taught;
  useEffect(() => {
    if (loaded && !taught) router.replace("/plan");
  }, [loaded, taught, router]);
  // a week the teacher made, running, coming or ended: the plan page draws one of them
  const hasPlan = plan.state.given.some((p) => !!p.teacher);
  return <WelcomeView name={loaded && taught && account && plan.loaded ? account.name : null} hasPlan={hasPlan} />;
}
