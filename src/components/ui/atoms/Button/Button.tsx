import type { ButtonHTMLAttributes } from "react";
import { btn, btnSm, ibtn, sbtn, tbtn } from "./recipes";

const looks = { md: btn, sm: btnSm, "icon-lg": ibtn, "icon-md": sbtn, "icon-sm": tbtn } as const;

export type ButtonSize = keyof typeof looks;

/**
 * The neutral button. `size` picks the recipe: md / sm text buttons, icon-lg 32 px (toolbars), icon-md 28 px (panels), icon-sm 24 px (dense rows).
 * Pass `pressed` for a toggle (it sets aria-pressed, which the recipe colours). Extra `className` goes after the recipe, for layout or a special state.
 */
export function Button({ size = "md", pressed, className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { size?: ButtonSize; pressed?: boolean }) {
  return <button type={type} aria-pressed={pressed} className={`${looks[size]} ${className}`} {...rest} />;
}
