"use client";

import { useSyncExternalStore } from "react";

// Below Tailwind's `sm` breakpoint, or a phone turned on its side (wide, but short with a touch screen). The `desk:` variant in globals.css is the opposite.
export const PHONE_QUERY = "(max-width: 639.98px), (max-height: 499.98px) and (pointer: coarse)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True on a phone, either way up; it follows the screen as it rotates. False on the server. */
export default function usePhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_QUERY).matches, () => false);
}
