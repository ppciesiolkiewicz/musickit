import { logoImage } from "../_og/logo-image";

/* /logo.png: the attunr logo on black. Prerendered at build time. */

export const dynamic = "force-static";

export const GET = () => logoImage("#000000");
