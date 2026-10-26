"use client";

import { createContext } from "react";

/**
 * How a widget tells the frame around it the shape of its content (width over height, in pixels), so the frame can take that shape.
 * Without a provider (the editor's replay) nobody listens.
 */
export const ShapeReport = createContext<((aspect: number) => void) | null>(null);
