"use client";

import { useEffect } from "react";
import { wireNam } from "./namWiring";

/** Plugs the NAM amp model into the shared effects for a page that has effects (the jam's loop inputs). Draws nothing. */
export default function WireNam() {
  useEffect(() => wireNam(), []);
  return null;
}
