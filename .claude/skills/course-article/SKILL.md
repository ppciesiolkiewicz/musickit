---
name: course-article
version: 2
description: Write or rewrite a section (article) of the position course in src/features/course/stages - text, neck and chord visuals, tasks, links - and fill in planned stub sections. Use when asked to write a course article, lesson or section, fill a planned section, or point a glossary word at a new article.
---

# Course article

A course section is one page at `/course/<stage>/<section>`. It is pure data in `src/features/course/stages/s*.ts`, built with the helpers in `src/features/course/build.ts`. Write the text as the **teaching-voice** skill says. Read that skill first.

## Where things are

- `model.ts`: `CourseStage`, `CourseSection`, `Block`, `TopicId`, and `section(slug, title, topic, about, blocks)`. A section with no blocks is *planned*: only its `about` line shows.
- `build.ts`: `text(...paras)`, `neck(caption, from, to, dots, { paths, legend, window })`, `chords(caption, list)`, `strum(pattern, chords, caption)`, `melody(...)` with its notes from `tune(spec)`, `songs(...)`, `task(text)`, `links(explore, practise)`, and `visual(...)` for the other pictures in `visuals.ts`. Also `toneDot`, `toneDots`, `pianoKeys`, `path`, `PATH` colours, `MAJOR_SEMIS`, `MINOR_SEMIS` and the pitch constants `E G A B C D`. Read the signature in the file before you call a helper: this list goes stale.
- Stage files and URL slugs differ: `s0.ts` holds stages 1–4, `s1.ts` is stage 5 (Position 1), `s2.ts` is 6, … `s7.ts` is 11. Find a section with `grep -n 'section("<slug>"' src/features/course/stages/*.ts`.
- `glossary.ts`: explained words and the article each points to.
- `content.test.ts`: checks dots sit on the drawn frets, chord boxes exist, links are real, and written sections have text plus something to look at or do. `DONE` lists the stages whose content is written (all eleven today; a new stage's slug goes there once it is written).

## Steps

1. **Read the neighbours.** Read the section before and after in course order, and the stage `intro`. The article may only assume what earlier sections taught. Match their length: usually 1–2 `text` blocks of 2–3 short paragraphs, one or more visuals, one `task`, one `links`.
2. **Get the facts from the calculator.** Run `npm run -s theory -- …` for every key, chord, scale, position or fret you will mention or draw. Keep the output, and draw the dots from it, never from memory.
3. **Plan the page** as text → picture → task, in pairs: a paragraph introduces an idea, the visual right after it shows it, and its caption says what to look at ("C: from Em, only the B string moves, up one fret"). One idea per visual. Use `paths` arrows for movement, and a `legend` when colours carry meaning.
4. **Write the text.**
   - Open with what the thing is in one sentence, then why a player cares in one more.
   - Course pages get no glossary (i) tips. Define a word in plain words the first time the course uses it, or link to the section that defines it. Don't define it again in later sections.
   - Name songs only as title and artist with chords (`songs`). Melodies in tab only for traditional or public-domain tunes.
5. **Write the task.** The article exists for its task, so practice comes first and the reading leads up to it (see "What we teach for" in teaching-voice). The task is a drill to play right now, with these exact chords or notes, and it shows the idea. Say what it trains, and when it's done in feel rather than counts ("until the change needs no look at the neck"). Where it fits, end with one variation that makes it a new drill (another key, position or string set).
6. **Links.** `explore` goes to `/theory/...` pages or other course sections that go deeper, and `practise` goes to tools. Every href must be a real page (the test checks this). Each `note` is a short clause.
7. **Keep the `about` line true.** It is one or two plain sentences on what the page teaches. The AI plan's link list shows it too.
8. **Glossary.** If this article now explains a glossary word better than the word's current `href`, repoint it. If the article introduces a word a beginner won't know, add a `Term` (the first form is the name the AI prompt uses, `short` is one plain line) and run `glossary.test.ts`.
9. **Verify.**
   ```
   TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)
   $TSX --test src/features/course/*.test.ts
   npx tsc --noEmit 2>&1 | grep -v '^.next/'
   ```
   Then open `/course/<stage>/<section>` in the dev server and check that every caption matches its picture and every note the text names stands out on it. Run the **review-teaching-text** skill on the section before you call it done. If the dev server won't build because of another session's work, say so in your report: don't claim the page was read in the app.
