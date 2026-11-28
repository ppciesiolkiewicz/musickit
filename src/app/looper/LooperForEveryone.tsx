"use client";

import LooperApp from "@/components/looper/LooperApp";
import { SignUpCorner, SignUpEnd, useVisitor } from "@/features/explore";

/**
 * The looper is an open tool (OPEN_TOOLS in src/lib/publicPaths.ts): a visitor uses it without an account. For them the
 * top bar has the sign-up offer, the close button goes back to Explore (Practice needs a login), and the page ends with
 * the larger offer. A signed-in player sees none of it.
 */
export default function LooperForEveryone() {
  const visitor = useVisitor();
  return (
    <>
      <LooperApp action={<SignUpCorner />} exit={visitor ? { href: "/explore", label: "Back to Explore" } : undefined} />
      <div className="mt-6"><SignUpEnd /></div>
    </>
  );
}
