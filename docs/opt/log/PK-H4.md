# PK-H4 Log
Status: DONE
API: `window.PigReactions` / `module.exports` (`PRIORITIES`, `SICK_BLOCKED_ANIMS`, `detectSulk(timestampsMs,nowMs,windowMs,threshold)`, `canInterrupt(currentPriority,nextReaction)`, `isBlockedBySickness(anim,ctx)`, `isThrottled(lastAtMs,nowMs,cooldownMs)`, `react(event,ctx)`).
Zwrot `react`: `{ anim, durationMs, bubble, sound, effect, priority, interruptAutonomous, blocked }` lub `null` (nieznane/błędne wejście lub aktywny throttle).
Decyzje:
- Dodano czysty `isThrottled` oraz opcjonalny `ctx.nowMs`/`ctx.lastReactionAtMs`/`ctx.cooldownMs` (domyślnie `600` ms) dla E8 przy zachowaniu pełnej czystości i determinizmu `react`.
- Różnica vs R41 §6 ("Prompt fixes"): R41 zakładało edycję `sound.js`/`app.js`/`canvas-pig.js`/`bridge.js`, lecz PK-H4 ogranicza `Zmieniaj` do czystego modułu (sklejenie i dźwięki w PK-CV3).
STUB w teście (`ux-p113-reactions.js`): brak atrap; E6 czyta `assets/data/tricks.json`.
Weryfikacja: `node --check web/home/lib/pig-reactions.js && node --check tools/qa/ux-p113-reactions.js && node tools/qa/ux-p113-reactions.js` -> 10/10 PASS.
