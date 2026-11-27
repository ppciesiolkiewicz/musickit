import { TopicPage, topicMetadata } from "../_topic";

/** /learn/theory: the theory guides (`TOPIC_PAGES`). */
export const metadata = topicMetadata("theory");

export default function TheoryGuides() {
  return <TopicPage topic="theory" />;
}
