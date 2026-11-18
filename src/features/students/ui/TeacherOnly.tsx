"use client";

import type { ReactNode } from "react";
import { useAccount } from "@/features/account/useAccount";

/**
 * Its children only for a signed-in account that can have students (`can("students")`): the nav's Students link. Nothing
 * until the account is known, and nothing with no account (a site without accounts lets the null account do everything,
 * but it has no students to show).
 */
export default function TeacherOnly({ children }: { children: ReactNode }) {
  const { account, loaded, can } = useAccount();
  return loaded && account && can("students") ? <>{children}</> : null;
}
