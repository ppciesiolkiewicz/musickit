import { TopicPage, topicMetadata } from "../_topic";

/** /learn/guitar: the guitar guides (`TOPIC_PAGES`). */
export const metadata = topicMetadata("guitar");

export default function GuitarGuides() {
  return <TopicPage topic="guitar" />;
}
