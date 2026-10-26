# Prompt do sesji researchu

Wklej poniższy szablon do nowej sesji (Sonnet lub Haiku). Podmień dwie rzeczy: `{LISTA}` (ID pytań) i `{NAZWA}` (nazwa sesji do komunikatu commita).
Pytania są w `RESEARCH.md`, wyniki trafiają do `research/<ID>.md`.

## Szablon

```
Lista ID: {LISTA}

You are a research assistant for the repo https://github.com/olubiec/swinka (pull the latest main first).

1. Read RESEARCH.md. Use only: the block "Wstęp do każdego pytania" near the top, and the questions for the IDs
   in the list (for each ID find the line "**ID**" and take the ```code block``` under it; also read the "Gdzie trafia"
   line of its group). Read nothing else, and do not read PLAN.md.
2. Answer each question separately, following the context and rules in the intro block. Search the web (official docs,
   GitHub, NuGet/npm, StackOverflow, then forums). Every fact needs a URL. Mark guesses UNVERIFIED. Do not invent versions
   or API names. If a question cannot be answered, write that in "Open questions / not found" and go on.
3. For each ID create research/<ID>.md (for example research/R8.1.md) in this format:
   - first lines: "Date: <today>", "Model: <your model name>", "Status: do weryfikacji"
   - "Question:" (copy of the question)
   - the findings (short, with links)
   - "Answer for Cuy" (max 5 lines)
   - "Open questions / not found"
4. Create only these new files in research/. Do not edit RESEARCH.md or any other file.
5. Commit all of them in one commit with the message "research: {NAZWA}" and push to main.
   If the push fails, run git pull --rebase and push again.
6. Reply with one line per ID: the file path and its "Answer for Cuy" text in one sentence.
```

## Wariant A: 4 sesje (12 / 11 / 10 / 14 pytań)

| Sesja | {NAZWA} | {LISTA} |
| --- | --- | --- |
| 1 (fala 2) | session 1 (R1, R2, R8) | R1.1, R1.2, R1.3, R2.1, R2.2, R2.3, R2.4, R8.1, R8.2, R8.3, R8.4, R8.5 |
| 2 (fala 3) | session 2 (R3, R4, R5) | R3.1, R3.2, R3.3, R3.4, R4.1, R4.2, R4.3, R4.4, R5.1, R5.2, R5.3 |
| 3 (fale 4-5) | session 3 (R6, R7, R9, R10) | R6.1, R6.2, R6.3, R7.1, R7.2, R9.1, R9.2, R10.1, R10.2, R10.3 |
| 4 (fala 6) | session 4 (R11-R15) | R11.1, R11.2, R11.3, R12.1, R12.2, R12.3, R13.1, R13.2, R13.3, R14.1, R14.2, R14.3, R15.1, R15.2 |

## Wariant B: 7 sesji (5-8 pytań, głębsze odpowiedzi)

| Sesja | {NAZWA} | {LISTA} |
| --- | --- | --- |
| 1 | session 1 (R1, R2) | R1.1, R1.2, R1.3, R2.1, R2.2, R2.3, R2.4 |
| 2 | session 2 (R8) | R8.1, R8.2, R8.3, R8.4, R8.5 |
| 3 | session 3 (R3, R4) | R3.1, R3.2, R3.3, R3.4, R4.1, R4.2, R4.3, R4.4 |
| 4 | session 4 (R5, R6) | R5.1, R5.2, R5.3, R6.1, R6.2, R6.3 |
| 5 | session 5 (R7, R9, R10) | R7.1, R7.2, R9.1, R9.2, R10.1, R10.2, R10.3 |
| 6 | session 6 (R11, R12) | R11.1, R11.2, R11.3, R12.1, R12.2, R12.3 |
| 7 | session 7 (R13, R14, R15) | R13.1, R13.2, R13.3, R14.1, R14.2, R14.3, R15.1, R15.2 |

## Wariant C: jedna sesja na jedno ID (powtórka słabego wyniku)

`{LISTA}` = jedno ID, np. `R8.3`; `{NAZWA}` = `R8.3`. Nadpisze plik `research/R8.3.md`.

## Wariant D: wszystkie 47 naraz (nie polecam, odpowiedzi będą płytsze)

`{LISTA}` = od R1.1 do R15.2 po kolei; `{NAZWA}` = `all`.

## Kolejność

Najpierw sesje z falą 2: wariant A sesja 1 albo wariant B sesje 1 i 2. R8 ma najwyższy priorytet.
