import { degreeColour } from "../theory/scales";
import { TOPICS, type CourseSection, type CourseStage, type TopicId } from "./model";
import { STAGES_0 } from "./stages/s0";
import { STAGE_1 } from "./stages/s1";
import { STAGE_2 } from "./stages/s2";
import { STAGE_3 } from "./stages/s3";
import { STAGE_4 } from "./stages/s4";
import { STAGE_5 } from "./stages/s5";
import { STAGE_6 } from "./stages/s6";

export const COURSE: CourseStage[] = [...STAGES_0, STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5, STAGE_6];

export interface SectionRef { stage: CourseStage; section: CourseSection }

/** Every section in course order. */
export const ALL_SECTIONS: SectionRef[] = COURSE.flatMap((stage) => stage.sections.map((section) => ({ stage, section })));

const indexOf = (stage: string, section: string) => ALL_SECTIONS.findIndex((r) => r.stage.slug === stage && r.section.slug === section);

export function findSection(stage: string, section: string): SectionRef | undefined {
  return ALL_SECTIONS[indexOf(stage, section)];
}

/** The section after this one, crossing into the next stage after a stage's last section. */
export function nextSection(stage: string, section: string): SectionRef | undefined {
  const i = indexOf(stage, section);
  return i < 0 ? undefined : ALL_SECTIONS[i + 1];
}

export function prevSection(stage: string, section: string): SectionRef | undefined {
  const i = indexOf(stage, section);
  return i <= 0 ? undefined : ALL_SECTIONS[i - 1];
}

export const findStage = (stage: string): CourseStage | undefined => COURSE.find((s) => s.slug === stage);

export const sectionHref = (stage: string, section: string) => `/course/${stage}/${section}`;

/** Each stage keeps one colour from the degree palette, so its panel, index entry and links agree. */
export const stageColour = (stage: string): string => degreeColour(1 + (COURSE.findIndex((s) => s.slug === stage) % 6));

/** Sections grouped by main topic, topics in `TOPICS` order, course order inside a topic; empty topics left out. */
export function byTopic(): { topic: { id: TopicId; label: string }; items: SectionRef[] }[] {
  return TOPICS.map((topic) => ({ topic, items: ALL_SECTIONS.filter((r) => r.section.topic === topic.id) })).filter((g) => g.items.length);
}
