export type SelectValue = string | number;

export interface SelectOption<V extends SelectValue> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup<V extends SelectValue> {
  label: string;
  options: readonly SelectOption<V>[];
}

/** Every option, flattened out of its groups. */
export const allOptions = <V extends SelectValue>(options: readonly SelectOption<V>[] = [], groups: readonly SelectGroup<V>[] = []): SelectOption<V>[] =>
  [...options, ...groups.flatMap((g) => g.options)];

/**
 * A DOM-safe key for a value: numbers and strings stay apart ("n:1" vs "s:1") and the empty string gets a key too,
 * which Radix needs (an item cannot have the value "").
 */
export const keyOf = (v: SelectValue): string => (typeof v === "number" ? `n:${v}` : `s:${v}`);

export const valueOf = <V extends SelectValue>(key: string, all: readonly SelectOption<V>[]): V | undefined => all.find((o) => keyOf(o.value) === key)?.value;
