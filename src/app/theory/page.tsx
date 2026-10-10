import { redirect } from "next/navigation";
import { THEORY_LINKS } from "@/components/SiteNav";

export default function TheoryPage() {
  redirect(THEORY_LINKS[0].href);
}
