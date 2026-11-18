/**
 * The offer to students: what a person who practises on their own gets from attunr, and on what terms. /dev/kickstarter
 * (Students) shows it, and anything written for students (an ad, a sign-up page) is written from it. Change what may be
 * said to a student here, nowhere else. The offer to teachers and schools is in ./kickstarter.
 */

import { FIRST_STUDENTS, FIRST_STUDENTS_PRICE, STUDENT_PRICE } from "@/lib/studentOffer";
import { LINK_GROUPS, type DemoLink } from "./kickstarter";

/** The whole offer in one line. */
export const STUDENT_OFFER_LINE = "A daily practice plan made for you, with engaging exercises you play and sing along with on the screen. Free while attunr is in beta.";

/** One of the three things the offer stands on, in the order an ad leads with them. */
export interface Pillar {
  title: string;
  /** what it means for the student, in one sentence */
  promise: string;
  /** what is true about it today; nothing else may be said */
  facts: string[];
}

export const PILLARS: Pillar[] = [
  {
    title: "A daily practice plan fitted to you",
    promise: "Open attunr and today's practice is ready: what to work on, and for how long.",
    facts: [
      "A student first answers a few questions: what they play or sing (guitar, voice, music theory), where they are in each topic, and how many minutes a day they have.",
      "Each day they open the plan page, attunr puts that day's plan together from its own library of exercises. No AI writes the plan.",
      "The plan follows how they rate each exercise: it brings the next thing within reach, and mixes back a little of what already feels solid.",
      "Each day is a bit different from the day before, and they can ask for another plan on the same day.",
      "Daily plans are unlimited.",
    ],
  },
  {
    title: "The change: a daily habit you can see",
    promise: "A short, focused practice every day gets a player further than a long one now and then.",
    facts: [
      "A daily reminder at a time they choose. Today it is a browser notification, shown while attunr is open in a tab: say \"a daily reminder\", never \"an email\" or \"a text message\".",
      "Short, focused practice: the plan fits the minutes they said they have, each exercise has its own minutes, and a timer counts the day's practice.",
      "Progress tracking: after each exercise they rate how it went, from \"Can't do it yet\" to \"Easy now\". A day streak and a progress tracker on the plan page show how far each topic has come.",
      "There are no points, no score and no percentages. Progress is what gets easier to play or sing.",
      "Under the plan is a learning path: every skill in small steps, in order, from a first week to advanced. The plan picks the next step within reach. A student doesn't see the steps, so say \"the next thing to learn\", never \"see your path\".",
      "The change is what the habit does: practising every day, knowing what to play, hearing it get easier. Never a result by a date (\"play any song in 30 days\").",
    ],
  },
  {
    title: "Engaging, interactive exercises",
    promise: "Every exercise is something to play, sing or hear on the screen, not a page to read.",
    facts: [
      "The word is \"engaging\": an exercise answers back. It plays with them, listens to them and shows what it heard, so the minutes hold their attention. Say why it is engaging; the word alone says little.",
      "Each exercise has its tool on the page: a guitar neck that shows the notes, a tab that plays along, a staff that draws the voice's pitch from the microphone, a backing band, a metronome, ear games.",
      "The exact material is in front of them: this scale, in this key, in this position. Nothing to transpose in their head.",
      "For guitar, singing and music theory, from a first week to advanced.",
      "It runs in the browser, on a phone or a computer. There is nothing to install.",
    ],
  },
];

/** What a student gets and pays, and what signing up means today. */
export const STUDENT_TERMS: string[] = [
  "attunr is in beta, and it is free now.",
  "Signing up today means leaving a few details. Promise nothing more than that step.",
  `The first ${FIRST_STUDENTS} people who sign up get the early price when paid plans open: ${FIRST_STUDENTS_PRICE} a year instead of ${STUDENT_PRICE} (US dollars).`,
  "The early price is locked in: it doesn't go up while they stay subscribed.",
  "There is no payment yet, so nothing is charged and nobody is counted. Say \"when paid plans open\", and give no date and no number of places left.",
];

/** What nothing written for a student says, and why. */
export const STUDENT_NEVER: string[] = [
  "\"Start now\", \"Download\", \"Get the app\": the next step is signing up, and there is no app to install.",
  "\"AI writes your plan\", \"AI teacher\", \"AI coach\": the plan is put together from attunr's library, by attunr.",
  "Hype (\"revolutionary\", \"unlock\", \"master\"), exclamation marks and emoji.",
  "A result by a date, or a result at all (\"play like a pro\"). Promise the habit and what it does.",
  "Points, scores, levels to beat, \"gamified\": attunr is practice, not a game.",
  "\"Only X places left\", a deadline or a countdown: nobody is counted.",
  "A price, a feature, a user count or a date that isn't on this page.",
];

const list = (items: string[]) => items.map((x) => `- ${x}`).join("\n");

/** The whole offer as one text, to paste where something for students is written: the line, the pillars, the terms, what never to say, the pages to show. */
export function studentOffer(demos: DemoLink[]): string {
  const groups = LINK_GROUPS.map((g) => [g, demos.filter((d) => d.group === g)] as const)
    .filter(([, ds]) => ds.length)
    .map(([g, ds]) => `### ${g}\n${ds.map((d, i) => `${i + 1}. ${d.label} (${d.about}): ${d.url}`).join("\n")}`);
  return [
    `# attunr for students: the offer\n${STUDENT_OFFER_LINE}`,
    ...PILLARS.map((p, i) => `## ${i + 1}. ${p.title}\n${p.promise}\n${list(p.facts)}`),
    `## The terms\n${list(STUDENT_TERMS)}`,
    `## Never say\n${list(STUDENT_NEVER)}`,
    groups.length ? ["## Pages to show, strongest first", ...groups].join("\n\n") : "",
  ].filter(Boolean).join("\n\n");
}
