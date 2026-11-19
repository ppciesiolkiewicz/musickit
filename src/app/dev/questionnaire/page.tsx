import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import QuestionnaireLab from "@/features/devtools/questionnaire/QuestionnaireLab";

export const metadata: Metadata = { title: devTitle("/dev/questionnaire") };

export default function QuestionnairePage() {
  return <DevShell wide><QuestionnaireLab /></DevShell>;
}
