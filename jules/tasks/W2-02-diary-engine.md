# Task W2-02: Diary engine (Core + data + tests)

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: wave 1 merged. Core only, no UI.
Replaces old task(s): F4-03. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Goal
`GameState.Diary` (`List<DiaryEntry>`) and `Pet.AddDiaryEntry` exist but nothing writes entries. Add a generator that
writes one warm, funny English entry per day from the pig's point of view, built from templates and the day's numbers.

## Files you may change
New: `src/Cuy.Core/Diary/DiaryWriter.cs` (uses the existing `TraceryGrammar`, see below), `src/Cuy.Core/Diary/DayStats.cs`, `src/Cuy.Core/Pet.Diary.cs`,
`assets/data/diary.json`, `tests/Cuy.Core.Tests/DiaryTests.cs`. Also `src/Cuy/dotNet/ItemCatalogLoader.cs`-style loader
is NOT needed: load the JSON through a small `DiaryTemplates.Load(string json)` in Core and let the desktop pass the text.

## Specification
1. `assets/data/diary.json`: at least 48 templates, at least 8 per life stage group (baby, junior, adult, senior/legend)
   plus generic ones. Each template: `{ "id", "stages": ["adult"], "when": { "minFed": 3, "sick": false, "mood": "low|ok|high", "birthday": false, "weather": "rain|cold|hot|any" }, "text": "..." }`.
   The `text` is a Tracery-style grammar string rendered by `Cuy.Core.Diary.TraceryGrammar` (own engine, already in the repo, see
   "Gotowe pliki"). Facts are set before rendering with `SetFact("name", ...)`, `fed`, `vegetable` (favourite vegetable name),
   `pets`, `games`, `poops`, `clovers`, and used as `#name#`, `#fed#` ... (the `{name}` placeholder style is dropped). Variety
   comes from rules such as `#[mood:#happyWord#]opening#`. Tone: cute, short (max 160 characters), never sad-dark; e.g.
   "Today I ate {fed} snacks and wheeked at {pets} cuddles. Best day ever, said {name}."
2. `DayStats` is collected by `Pet` through the existing `Count(...)` counters (feed, pet, minigame, poop cleaned, bond
   points): add counters where missing, keyed by local date, reset at local midnight; keep only the last 3 days.
3. `Pet.TryWriteDiary()` (called by `Pet.Update()` when the local date changed since the last entry): picks a matching
   template with the injectable `System.Random`, fills it, calls `AddDiaryEntry`; never two entries per local date;
   no entry for a day with zero activity (a "quiet day" generic line is allowed once). Keep at most 365 entries.
4. Tests (xUnit, `ManualClock`, fixed `Random`): one entry per day, no entry twice, stage filter works, no `#` or `[` left
   after rendering, max length, 400 simulated days stay below 365 entries.

5. Content rules (R6.3): slots of medium size (not one-word slots, not whole sentences); count the real probability of each
   phrasing (a test that renders each template 2000 times with a seeded `Random` and fails if one opening exceeds 40 % of the
   outputs of a template group); vary sentence length and shape and never use the same shape twice in a row (keep the last
   entry's template id and avoid it); inside one entry keep random choices stable (use `[key:...]` actions so the same word
   is reused, e.g. the favourite vegetable); make entries depend on state (needs, life stage, the day's last actions, sickness,
   birthday, weather) so two entries differ for a reason; prefer fewer clearly different variants over many near-copies;
   recursion limit is built into `TraceryGrammar` (do not raise it).
6. Syntax (R6.1, main Tracery branch): `#symbol#`, `#[key:value1,value2]symbol#`, modifiers `capitalize`, `capitalizeAll`, `a`, `s`,
   `ed`, `inQuotes`, `comma`. Own extensions, document them in a comment block at the top of `diary.json`'s schema doc
   (`docs/diary-grammar.md`, new): `[key:POP]` and the modifier `lower`. Ready-made C# ports are NOT used (no proof they are maintained).

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.

## Gotowe pliki
- `research/gotowce/src/Cuy.Core/Diary/TraceryGrammar.cs` → `src/Cuy.Core/Diary/TraceryGrammar.cs` (ALREADY copied, compiles, tested in
  `tests/Cuy.Core.Tests/ReadyMadeComponentsTests.cs`). API: `new TraceryGrammar(IDictionary<string,string[]>)`, `FromJson(string)`,
  `HasSymbol`, `SetRule(symbol, params string[])`, `SetFact(symbol, value)`, `Flatten(rule, Random)`, `FlattenSymbol(symbol, Random)`.
  Do not rewrite it; extend it only if a test needs it.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC: nothing UNVERIFIED. In the PR: ten sample entries for each life stage (read them for tone and repetition).

When done, open a pull request against `main` titled `W2-02: Diary engine`.
