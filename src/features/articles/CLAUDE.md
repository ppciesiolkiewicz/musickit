# Articles: rules

- Every word is written in the articles' voice, the `article-voice` skill, which loads the `teaching-voice` skill first (an
  article's exercises are teaching-voice text), and checked with `review-teaching-text` before it ships. The voice lives only there: a seed file records its version
  (`versions.voice`), never the voice itself.
- Music facts come from the theory calculator (`npm run -s theory -- …`), recorded in the seed file's `calculator`.
- Exercises reuse the library's tools and wording: name the seed blocks in the seed file's `blocks`. A tool is set up as the
  plan's parser accepts it (the test checks). Name controls by their label on the screen, and a button as a button: the Start microphone button, the Play button.
- "practice" for the verb and the noun, never "practise" (the test checks). Australian English otherwise.
- Each article has its seed file in `seeds/<slug>.json`. Record the author's notes verbatim; don't raise `versions` by hand,
  only when the article is rewritten to the current documents.
- No prices, no affiliate links, no sponsored products. A product recommendation says it isn't paid for.
