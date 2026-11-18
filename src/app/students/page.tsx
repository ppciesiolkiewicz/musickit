import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import StudentsApp from "@/features/students/ui/StudentsApp";

export const metadata: Metadata = { title: "Students · attunr", robots: { index: false } };

/** A teacher's students: the list, a new link for one who hasn't opened theirs, and adding one. Needs a login (the proxy). */
export default function StudentsPage() {
  return (
    <PageShell active="/students" column title="Students" intro="Add your students here. attunr makes each one an account and a plan for their first week, and emails them a link to log in.">
      <StudentsApp />
    </PageShell>
  );
}
