import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import CourseIndex from "@/components/course/CourseIndex";

export const metadata: Metadata = {
  title: "Course: learn the neck one position at a time · Music Kit",
  description: "A guitar course that stays in one position until it makes sense: chords, triads, arpeggios, scales and the paths between them, then out across the neck.",
};

export default function CoursePage() {
  return (
    <PageShell
      active="/course"
      title="Course"
      intro="Stay in one place on the neck until it makes sense: chords, triads, arpeggios and the scale in position 1, then outward. Each note named three ways: degree, solfège, and where it sits on piano and guitar."
    >
      <CourseIndex />
    </PageShell>
  );
}
