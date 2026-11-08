"use client";

import { createContext } from "react";
import type { Level } from "./levels";

/** The id of the page a GuideProvider wraps; undefined when there is none. */
export const PageIdContext = createContext<string | undefined>(undefined);

/** A level fixed for everything under a `LevelPin`, whatever the stored level; undefined when there is none. */
export const LevelPinContext = createContext<Level | undefined>(undefined);
