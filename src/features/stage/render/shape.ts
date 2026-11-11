"use client";

import { createContext } from "react";

/**
 * How a widget tells the frame around it the shape of its content (width over height, in pixels), so the frame can take that shape.
 * Without a provider (the editor's replay) nobody listens.
 */
export const ShapeReport = createContext<((aspect: number) => void) | null>(null);

/** The box is given and may be any shape (a page on the grid): the widget fits its width and scrolls inside it, whatever its kind does elsewhere. */
export const ScrollInBox = createContext(false);

/** The widget is in a flowing page (a shared note): it takes the height its content needs at the box's width and never scrolls inside. */
export const FlowInBox = createContext(false);

/** The widget is on the grid, which takes each widget's shape from its content, so a widget may be drawn at its true size there. */
export const InGrid = createContext(false);
