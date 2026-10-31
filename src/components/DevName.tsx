/** In development only: the name of the component below (an autoplan tool, a course visual), to tell them apart. */
export default function DevName({ name }: { name: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return <span className="w-fit rounded bg-fuchsia-500/15 px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-300">{name}</span>;
}
