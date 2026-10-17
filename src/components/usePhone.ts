"use client";

import { useSyncExternalStore } from "react";

// Tailwind's `sm` breakpoint: below it the screen is a phone.
const QUERY = "(max-width: 639.98px)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True on a phone-width screen (under Tailwind's `sm`). False on the server. */
export default function usePhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
