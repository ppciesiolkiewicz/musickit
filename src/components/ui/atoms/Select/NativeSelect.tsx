import { Chevron } from "./Chevron";
import { allOptions, keyOf, valueOf, type SelectValue } from "./options";
import { chevronSize, triggerClass } from "./styles";
import type { SelectProps } from "./Select";

/** The browser's own select, styled like the menu trigger: used on touch screens, where the system picker is the better one. */
export function NativeSelect<V extends SelectValue>({ value, onChange, options, groups, size = "md", disabled, className = "", highlighted, pill, title, "aria-label": ariaLabel }: SelectProps<V>) {
  const all = allOptions(options, groups);
  const item = (o: { value: V; label: string; disabled?: boolean }) => <option key={keyOf(o.value)} value={keyOf(o.value)} disabled={o.disabled}>{o.label}</option>;
  return (
    <span className={`relative inline-flex min-w-0 ${className}`}>
      <select
        value={keyOf(value)}
        onChange={(e) => {
          const v = valueOf(e.target.value, all);
          if (v !== undefined) onChange(v);
        }}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        className={`${triggerClass(size, highlighted, pill)} w-full appearance-none truncate !pr-6`}
      >
        {options?.map(item)}
        {groups?.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map(item)}</optgroup>)}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center"><Chevron size={chevronSize[size]} /></span>
    </span>
  );
}
