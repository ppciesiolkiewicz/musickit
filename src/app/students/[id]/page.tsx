import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import StudentPage from "@/features/students/ui/StudentPage";

export const metadata: Metadata = { title: "Student · attunr", robots: { index: false } };

/** One of a teacher's students: their week as they see it, and the next plan made with the sliders. Needs a login (the proxy). */
export default async function StudentRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell active="/students" column title="Students">
      <StudentPage id={id} />
    </PageShell>
  );
}
