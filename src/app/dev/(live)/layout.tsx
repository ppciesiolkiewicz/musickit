import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { peekSession } from "@/features/account/server/auth";
import { auth, SESSION_COOKIE } from "@/features/account/server/http";
import { devOnly } from "@/features/devtools/gate";

/**
 * Tools that are also on the live site (`live` in the registry), for anyone logged in; nothing links to them there.
 * Without a session they answer 404, so a stale cookie that got past the proxy learns nothing. Open in development.
 */
export default async function LiveDevLayout({ children }: { children: ReactNode }) {
  if (devOnly()) return children;
  const deps = auth();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!deps || !(await peekSession(deps, token))) notFound();
  return children;
}
