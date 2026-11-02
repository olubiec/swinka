# Prompt library for future waves (W12-W22)

71 task files in the Jules Loop format (`docs/JULES_LOOP.md`), one per small task. They are kept here, **not** in `tasks/`, on purpose: the loop starts a wave when `tasks/W*.md` land on `main`, and no loop is enabled yet.

## How a wave is started
1. Wave N-1 is merged and green. Re-read the next wave's files against the real code (names and signatures are "as planned"; every file tells the agent to use the real code and list differences in the PR).
2. `bash tools/release-wave.sh W12` copies `docs/prompts/W12-*.md` to `tasks/`.
3. Commit and push to `main`. The loop starts the wave.
4. When all tasks of the wave are merged, repeat with the next wave.

Rules kept by every file: non-overlapping `Zmieniaj` inside a wave, `Wymagane` is a subset of `Zmieniaj`, `Weryfikacja` present, no questions, dependent work only in a later wave.

Overview, counts and human steps: `docs/ROADMAP.md`. Graphics still to be drawn: `docs/GRAFIKA_KOLEJKA.md`.
