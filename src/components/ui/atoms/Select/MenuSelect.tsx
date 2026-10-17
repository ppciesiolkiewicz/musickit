"use client";

import * as RSelect from "@radix-ui/react-select";
import { Chevron } from "./Chevron";
import { allOptions, keyOf, valueOf, type SelectOption, type SelectValue } from "./options";
import { chevronSize, groupLabelClass, itemClass, menuClass, triggerClass } from "./styles";
import type { SelectProps } from "./Select";

function Item<V extends SelectValue>({ option }: { option: SelectOption<V> }) {
  return (
    <RSelect.Item value={keyOf(option.value)} disabled={option.disabled} className={itemClass}>
      <RSelect.ItemIndicator className="absolute left-2 inline-flex text-sky-300">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </RSelect.ItemIndicator>
      <RSelect.ItemText>{option.label}</RSelect.ItemText>
    </RSelect.Item>
  );
}

/**
 * The themed dropdown (Radix Select) used with a mouse.
 * Focus never comes back to the trigger after a pick (see NoControlFocus): the computer keyboard keeps playing notes.
 */
export function MenuSelect<V extends SelectValue>({ value, onChange, options, groups, size = "md", disabled, className = "", highlighted, title, "aria-label": ariaLabel }: SelectProps<V>) {
  const all = allOptions(options, groups);
  return (
    <RSelect.Root
      value={keyOf(value)}
      onValueChange={(k) => {
        const v = valueOf(k, all);
        if (v !== undefined) onChange(v);
      }}
      disabled={disabled}
    >
      <RSelect.Trigger aria-label={ariaLabel} title={title} tabIndex={-1} className={`${triggerClass(size, highlighted)} ${className}`}>
        <span className="truncate"><RSelect.Value /></span>
        <RSelect.Icon><Chevron size={chevronSize[size]} /></RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content position="popper" sideOffset={4} collisionPadding={8} className={menuClass} onCloseAutoFocus={(e) => e.preventDefault()}>
          <RSelect.ScrollUpButton className="flex h-5 items-center justify-center text-slate-400">▴</RSelect.ScrollUpButton>
          <RSelect.Viewport>
            {options?.map((o) => <Item key={keyOf(o.value)} option={o} />)}
            {groups?.map((g, i) => (
              <RSelect.Group key={g.label}>
                {(i > 0 || (options?.length ?? 0) > 0) && <RSelect.Separator className="mx-1 my-1 h-px bg-slate-800" />}
                <RSelect.Label className={groupLabelClass}>{g.label}</RSelect.Label>
                {g.options.map((o) => <Item key={keyOf(o.value)} option={o} />)}
              </RSelect.Group>
            ))}
          </RSelect.Viewport>
          <RSelect.ScrollDownButton className="flex h-5 items-center justify-center text-slate-400">▾</RSelect.ScrollDownButton>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
