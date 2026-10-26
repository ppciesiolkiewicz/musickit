import Wordmark from "@/components/Wordmark";
import { SITE_URL } from "@/lib/site";

/** the site's address as a viewer would type it: no scheme, no trailing slash */
const HOST = SITE_URL.replace(/^https?:\/\//, "");

/** The logo or the site's address, on a dark pill so it reads over the camera or a screen share. */
export default function BrandWidget({ kind }: { kind: "logo" | "url" }) {
  return (
    <div className="flex items-center justify-center rounded-xl bg-slate-950/80 px-5 py-3">
      {kind === "logo" ? <Wordmark className="text-5xl" /> : <span className="font-mono text-3xl font-medium tracking-tight text-slate-100">{HOST}</span>}
    </div>
  );
}
