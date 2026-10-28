Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>". Nie zadawaj pytań i nie zatrzymuj się. Jeśli coś jest niejasne, wybierz najprostsze rozwiązanie zgodne z plikiem zadania i AGENTS.md, a decyzję opisz w PR-ze w sekcji „Decisions”. Jeśli test nie przechodzi, znajdź przyczynę w kodzie i napraw ją w zakresie „Change”; nie zmieniaj asercji.

# W1-05: Diary templates (data) with a validation test
Goal: at least 48 warm, short diary templates exist as data and a test proves they render cleanly.
Depends on: nothing (wave start). `Cuy.Core.Diary.TraceryGrammar` is already in the repo (API: `new TraceryGrammar(IDictionary<string,string[]>)`, `FromJson`, `HasSymbol`, `SetRule`, `SetFact`, `Flatten(rule, Random)`).
Change: new `assets/data/diary.json`, new `tests/Cuy.Core.Tests/DiaryTemplatesTests.cs`, new `docs/diary-grammar.md`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `diary.json`: a list of templates `{ "id", "stages": ["adult"], "when": { "minFed": 3, "sick": false, "mood": "low|ok|high", "birthday": false, "weather": "rain|cold|hot|any" }, "text": "..." }` plus the shared grammar rules. At least 48 templates, at least 8 per group (baby, junior, adult, senior/legend) plus generic ones. `text` is a Tracery string; facts used as `#name#`, `#fed#`, `#vegetable#`, `#pets#`, `#games#`, `#poops#`, `#clovers#` (no `{name}` placeholders).
2. Tone: cute, short (max 160 characters after rendering), never dark. Medium-sized slots (not one word, not whole sentences); vary sentence length and shape; keep random choices stable inside one entry with `[key:...]` actions so e.g. the favourite vegetable repeats; make a template depend on state (stage, mood, sickness, birthday) so two entries differ for a reason. Fewer clearly different variants beat many near-copies.
3. `DiaryTemplatesTests.cs` (xUnit, seeded `Random`): the file parses; >= 48 templates; >= 8 per stage group; every template renders with sample facts without a leftover `#` or `[`; rendered length <= 160; render each template group 2000 times and fail if one opening (first three words) exceeds 40 % of the outputs of that group.
4. `docs/diary-grammar.md`: the syntax used (`#symbol#`, `#[key:a,b]symbol#`, modifiers `capitalize`, `capitalizeAll`, `a`, `s`, `ed`, `inQuotes`, `comma`, plus our own `[key:POP]` and `lower`) with two short examples. Do not edit `TraceryGrammar.cs` unless a test needs it, and then say so.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; ten sample entries per life stage so the human can read them for tone; screenshot if the change is visual.
