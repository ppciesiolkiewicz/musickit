import Link from "next/link";
import { btn } from "@/components/ui";
import { FEEDBACK_HREF } from "@/features/messages/ui/FeedbackPage";

/** The two ways on when a teacher's active students are at or past their plan's limit: Change your plan, Send feedback. */
export default function PlanWays() {
  return (
    <span className="flex flex-wrap gap-2">
      <Link href="/account" className={btn}>Change your plan</Link>
      <Link href={FEEDBACK_HREF} className={btn}>Send feedback</Link>
    </span>
  );
}
