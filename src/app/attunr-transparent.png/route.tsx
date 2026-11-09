import { logoImage } from "../_og/logo-image";

/* /attunr-transparent.png: the attunr logo, light on a transparent ground. Prerendered at build time. */

export const dynamic = "force-static";

export const GET = () => logoImage("transparent");
