import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ReminderOff from "@/features/reminders/ui/ReminderOff";

export const metadata: Metadata = { title: "Reminder emails · attunr", robots: { index: false }, referrer: "no-referrer" };

/** The unsubscribe link in a reminder email (`/reminders/off?token=`). Public: one button, so a mail scanner opening it changes nothing. */
export default async function ReminderOffPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const q = await searchParams;
  return (
    <PageShell centered title="Reminder emails" active="/plan">
      <ReminderOff token={typeof q.token === "string" ? q.token : ""} />
    </PageShell>
  );
}
