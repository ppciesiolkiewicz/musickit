import posthog from "posthog-js";
import { countingNow, maskEmails, scrubUrl } from "@/lib/analyticsChoice";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

/*
 * PostHog starts only for a visitor who may be counted (lib/analyticsChoice.ts: asked first in the EU, a no on /privacy
 * or Global Privacy Control stops it). A new answer reloads the page, so this runs again. /privacy promises each line below.
 */
if (posthogKey && posthogHost) {
  if (countingNow()) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2026-01-30",
      // No cookie and nothing in the browser's storage.
      // The PostHog project must have cookieless mode on (Settings -> Web analytics), or PostHog drops every event.
      cookieless_mode: "always",
      // nothing is tied to a person: no profiles, and the app never calls identify()
      person_profiles: "never",
      // an invite, a shared note's id or a log-in token in an address never leaves the browser
      before_send: (event) => {
        if (!event?.properties) return event;
        for (const [k, v] of Object.entries(event.properties)) {
          if (typeof v === "string" && (k.includes("url") || k.includes("pathname") || k.includes("referrer") || k === "$href")) event.properties[k] = scrubUrl(v);
        }
        return event;
      },
      capture_exceptions: true,
      // Session recording is off here, whatever the PostHog project's switch says. Before turning it on, /privacy
      // ("How we count use") must say so, with PRIVACY_UPDATED raised.
      disable_session_recording: true,
      // What a recording would keep, once on: no typed value (every input masked) and no email address anywhere on the
      // page (every text node goes through maskEmails; other text is left as it is), and no request headers or bodies.
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        maskTextFn: maskEmails,
        recordHeaders: false,
        recordBody: false,
      },
      // no surveys are used; skipping them saves loading surveys.js (~36 KiB) on every page
      disable_surveys: true,
      debug: process.env.NODE_ENV === "development",
    });
  }
} else if (process.env.NODE_ENV === "development") {
  console.warn("PostHog: NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST is not set, so analytics events are skipped.");
}
