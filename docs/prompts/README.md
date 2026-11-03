# Prompt library for future waves (W12-W30)

136 task files in the Jules Loop format (`docs/JULES_LOOP.md`), one per small task. They are kept here, **not** in `tasks/`, on purpose: the loop starts a wave when `tasks/W*.md` land on `main`, and no loop is enabled yet. W11 (5 tasks) is already in `tasks/`.

## How a wave is started
1. Wave N-1 is merged and green. Re-read the next wave's files against the real code (names and signatures are "as planned"; every file tells the agent to use the real code and list differences in the PR).
2. `bash tools/release-wave.sh W12` copies `docs/prompts/W12-*.md` to `tasks/`.
3. Commit and push to `main`. The loop starts the wave.
4. When all tasks of the wave are merged, repeat with the next wave.

Rules kept by every file: non-overlapping `Zmieniaj` inside a wave, `Wymagane` is a subset of `Zmieniaj`, `Weryfikacja` present, no questions, dependent work only in a later wave.

Waves: W12-W15 named pigs, W16-W22 world, W23-W30 pig rooms, shared bedroom, roaming, garden run, desktop props, home store.
Overview and counts: `docs/ROADMAP.md`. Design: `docs/NAMED_PIGS.md`, `docs/WORLD.md`, `docs/PIG_ROOMS.md`. Graphics: `docs/GRAFIKA_KOLEJKA.md`, `docs/DESIGNER_BRIEF.md`.

## Sub-waves (W23-W30)
Tasks of one wave run in parallel, so a task that uses code from a sibling cannot start before it. W23-W30 are therefore split into sub-waves (`W23a`, `W23b`, ...) listed in `subwaves.json`; each prompt names its sub-wave and the tasks it needs merged first. They are also added to `waves.yaml` (the orchestrator plan). `tools/release-wave.sh W26b` copies one sub-wave. W11-W22 follow the grouping of `waves.yaml`.
