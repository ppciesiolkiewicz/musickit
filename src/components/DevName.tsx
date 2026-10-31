/** In development only: the name of the component below (an autoplan tool, a course visual) and the params it got. */
export default function DevName({ name, params }: { name: string; params?: object }) {
  if (process.env.NODE_ENV === "production") return null;
  const text = params && Object.keys(params).length ? JSON.stringify(params) : "";
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-1.5 font-mono text-[10px]">
      <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-300">{name}</span>
      {text && <span className="min-w-0 break-all text-fuchsia-300/60">{text}</span>}
    </span>
  );
}
