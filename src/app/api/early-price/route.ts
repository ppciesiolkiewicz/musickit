import { EARLY_OFFER, earlyOpen } from "@/features/account/pricing";
import { earlyTaken } from "@/features/account/server/earlyTaken";

export const dynamic = "force-dynamic";

/**
 * The early price's places, for schools and students in one answer:
 * { schools: { taken, places }, students: { taken, places }, open: { individual, teachers } }. Public: no account needed.
 */
export async function GET() {
  const taken = await earlyTaken();
  return Response.json({
    schools: { taken: taken.schools, places: EARLY_OFFER.schools },
    students: { taken: taken.students, places: EARLY_OFFER.students },
    open: earlyOpen(taken),
  });
}
