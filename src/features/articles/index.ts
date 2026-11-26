import type { Article } from "./model";
import { majorAndMinorScalesGuitar } from "./content/major-and-minor-scales-guitar";
import { microphoneAndAudioInterface } from "./content/microphone-and-audio-interface";
import { pitchMatchingExercises } from "./content/pitch-matching-exercises";
import { scaleDegreesGuitarAnyKey } from "./content/scale-degrees-guitar-any-key";
import { scaleDegreeFeelings } from "./content/scale-degree-feelings";
import { vocalWarmUps } from "./content/vocal-warm-ups";

export type { Article, ArticleBlock, ArticleSeed } from "./model";

/** Every public article, in the order /learn lists them. A new one is a file in content/, its seed in seeds/, and an entry here. */
export const ARTICLES: Article[] = [pitchMatchingExercises, vocalWarmUps, scaleDegreeFeelings, majorAndMinorScalesGuitar, scaleDegreesGuitarAnyKey, microphoneAndAudioInterface];

export const articleOf = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);
