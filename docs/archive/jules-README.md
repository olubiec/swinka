# jules/ – task prompts and the dispatch queue

- `tasks/` – every planned task as a complete prompt (English). `PLAN.md` – the human's overview (Polish).
- `contracts.md` – message/state shapes shared by the web and C# halves of Home features.
- `queue/` – copying a task file here and pushing to `main` starts it in Jules
  (`.github/workflows/jules-dispatch.yml`, needs the `JULES_API_KEY` repository secret). One file = one Jules task = one PR.
  To restart a task: Actions → "Jules dispatch" → Run workflow → path of the file.
- Agents: never edit this folder unless your task says so.
