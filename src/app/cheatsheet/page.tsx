import { redirect } from "next/navigation";

/** The cheatsheet builder became the Notes creator (the studio without video); old links land there. */
export default function CheatsheetPage() {
  redirect("/teachers/studio?notes=1");
}
