# Library seed

Plans and single exercises written by agents for the library's gaps (NEW10 in `tasks.txt`). One JSON file per plan or
exercise, so an agent writing one reads nothing else here. `index.ts` loads them through the generated `index.gen.ts` in
each folder.

```
plans/<id>.json    one 7-day plan each (SeedPlanFile)
blocks/<id>.json   one exercise each, for a step no plan reaches yet (SeedBlockFile)
```

## Adding one

1. Read the gap first: `library_coverage` (the `musickit-library` MCP tools, README in `../README.md`) and the steps on
   `/dev/path`.
2. For a plan, get the live writer's prompt for the player: `npm run -s seed -- prompt <persona id | answers.json> out.txt`
   (personas: `devtools/model/personas.ts`), and write the plan that prompt asks for.
   Write the file. The id is the file name: `<area>-<level>-<what>`, for example `theory-new-steady-beat`.
   - A plan: `{ "id", "answers", "model", "versions": { "prompt", "agents", "teaching" }, "note", "plan" }`. `answers`
     is the player the plan is for, as the questionnaire records them (`PlanAnswers`); `plan` is exactly what the AI
     returns (`title`, `summary`, `progress`, `days`).
   - An exercise: `{ "id", "model", "versions", "note", "exercise" }`, the exercise as it would sit in a plan's day.
     Its `steps` names the path steps it practises (`["barre:2"]`, `PATH` in `plan/model/path.ts`), each in a track
     of its `concepts`; its level is the highest of their levels (the parser sets it), and the library finds it by
     step.
   - `versions` are `PROMPT_VERSION` (`plan/model/prompt.ts`) and `DOC_VERSIONS` (`plan/examples/index.ts`) as they
     are when the file is written. `model` is the API id of the model that wrote it. `note` says which gap, in one line.
3. `npm run -s seed -- check <file>` until it says ✔: the file reads with no parser warning, its versions are the
   current ones (`npm run -s seed -- versions`), every exercise names a concept and at least one step (each in a track of
   its concepts), a named step that has a ladder has a tool sitting on it, and a tool of a concept with steps sets its
   level or stage.
   Then `npm run -s gen:json-index`, so the folder's `index.gen.ts` imports the new file.
4. `npm run -s db:seed-plans`, then `npm run -s db:seed-blocks` (check `DATABASE_URL` in `.env.local` first).

Every exercise follows the same rules as the plan examples (`../../plan/examples/README.md`), and a tool whose concept
has steps sets `level` (or picks the tune or run by stage), never raw settings, so the step can be read back.
