import { ARTICLES } from "./index";
import { TOPICS, type Article, type Topic } from "./model";

/**
 * A topic's own page, /learn/<topic>: what it says on the page (`title`, `intro`) and in a search result (`metaTitle`,
 * `description`). Each is written for a broader search than one article ("guitar lessons for beginners"), and lists the
 * articles tagged with it.
 */
export interface TopicPage { topic: Topic; title: string; metaTitle: string; description: string; intro: string }

export const TOPIC_PAGES: Record<Topic, TopicPage> = {
  guitar: {
    topic: "guitar",
    title: "Guitar guides",
    metaTitle: "Guitar Lessons for Beginners: Chords, Scales and CAGED · attunr",
    description: "Free guitar guides with exercises on the page: chord shapes, barre chord alternatives, major and minor scales and the CAGED system on an interactive neck.",
    intro: "Chords, scales and the CAGED system on a guitar neck you can play. Press a chord box or a note to hear it, then play it on your guitar.",
  },
  singing: {
    topic: "singing",
    title: "Singing guides",
    metaTitle: "Singing Exercises for Beginners: Pitch, Warm-ups, Ear Training · attunr",
    description: "Free singing exercises you do on the page: pitch matching, vocal warm-ups and ear training. Sing into your mic and see your pitch live.",
    intro: "Pitch matching, vocal warm-ups and ear training to sing right on the page. Sing into your mic and see your pitch drawn live.",
  },
  theory: {
    topic: "theory",
    title: "Music theory guides",
    metaTitle: "Music Theory for Beginners: Intervals, Scale Degrees, Chords · attunr",
    description: "Free music theory guides you hear and play: intervals and solfège, scale degrees, major and minor chords and scales, and CAGED.",
    intro: "Intervals, scale degrees, and major and minor chords and scales, learned by ear and on the guitar neck, with exercises on the page.",
  },
};

/** The topics with a page, in the order /learn's buttons show them. */
export const TOPIC_SLUGS = Object.keys(TOPICS) as Topic[];

/** The articles tagged with `topic`, in /learn's order. */
export const articlesOf = (topic: Topic): Article[] => ARTICLES.filter((a) => a.topics.includes(topic));

/** The newest `updated` of a topic's articles: the day its page last changed. */
export const topicUpdated = (topic: Topic): string => articlesOf(topic).map((a) => a.updated).sort().at(-1) ?? "";
