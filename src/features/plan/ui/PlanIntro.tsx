"use client";

import { useAccount } from "@/features/account/useAccount";

/** The `/plan` intro for a player: attunr makes a new plan each day. */
export const PLAYER_INTRO = "A daily plan for your practice, put together from attunr's library of exercises. Each day you open this page, attunr makes a new plan, and the stars you give each exercise shape the next one.";

/** The `/plan` intro for a teacher's student (`Account.taught`): their plans are their teacher's, never a daily one. */
export const TAUGHT_INTRO = "The practice plans your teacher makes for you, from attunr's library of exercises. Rate each exercise with the stars: they shape your next plan.";

/** Which intro, by who is reading: none until the account is known, so a teacher's student never reads the player's first. */
export const introFor = (loaded: boolean, taught: boolean): string | null => (!loaded ? null : taught ? TAUGHT_INTRO : PLAYER_INTRO);

/**
 * The `/plan` intro (`PageShell`'s `intro`), drawn in the browser, which knows the account. Until the account is read the
 * player's words hold the space, hidden, so a player's page doesn't move and a teacher's student never reads them.
 */
export default function PlanIntro() {
  const { account, loaded } = useAccount();
  const text = introFor(loaded, !!account?.taught);
  return text === null ? <span aria-hidden className="invisible">{PLAYER_INTRO}</span> : <>{text}</>;
}
