import type { SVGProps } from "react";

/** The text inside a neck dot, swapped for `hover` while the mouse is over the enclosing `group`. `size` picks the font size for each text. */
export function DotLabel({ label, hover, size, ...props }: { label: string; hover: string; size: (text: string) => number } & Omit<SVGProps<SVGTextElement>, "fontSize">) {
  return (
    <>
      <text {...props} fontSize={size(label)} pointerEvents="none" className="group-hover:hidden">{label}</text>
      <text {...props} fontSize={size(hover)} pointerEvents="none" className="hidden group-hover:inline">{hover}</text>
    </>
  );
}
