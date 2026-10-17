"use client";

import { MenuSelect } from "./MenuSelect";
import { NativeSelect } from "./NativeSelect";
import type { SelectGroup, SelectOption, SelectValue } from "./options";
import type { SelectSize } from "./styles";
import { useCoarsePointer } from "./useCoarsePointer";

export interface SelectProps<V extends SelectValue> {
  value: V;
  onChange: (value: V) => void;
  /** flat options; may be combined with `groups`, which come after them */
  options?: readonly SelectOption<V>[];
  groups?: readonly SelectGroup<V>[];
  "aria-label": string;
  /** 2xs 16 px (inline badges), xs 24 px (dense rows), sm 28 px (panels), md 32 px (default), lg 36 px */
  size?: SelectSize;
  disabled?: boolean;
  /** layout only (width, flex); the look comes from `size` */
  className?: string;
  /** accent border: the selected one of a row of selects */
  highlighted?: boolean;
  title?: string;
}

/**
 * The app's dropdown. A themed menu with a mouse, the system picker on touch screens.
 * Values keep their type: pass numbers and get numbers back, no `Number(e.target.value)`.
 */
export function Select<V extends SelectValue>(props: SelectProps<V> & { /** force one rendering; "auto" picks by pointer */ mode?: "auto" | "native" | "menu" }) {
  const { mode = "auto", ...rest } = props;
  const coarse = useCoarsePointer();
  const native = mode === "native" || (mode === "auto" && coarse);
  return native ? <NativeSelect {...rest} /> : <MenuSelect {...rest} />;
}
