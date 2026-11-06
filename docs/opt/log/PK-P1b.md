# PK-P1b log
- Root cause (coloring): .play-level event listener attached only after loading all pack thumbnails; unhandled promise rejections on failure and stale closed state. Fixed by attaching listeners immediately, wrapping handler in try/catch with toast, and resetting editor on close.
- Root cause (vet): Check-up button only rendered on unknown condition cards (missing when healthy/known), gave no visual feedback on healthy pig, lacked vet_checkup_result message and browser mock handler. Fixed with Pet.CheckupWithResult, C#/mock vet_checkup_result event, persistent check-up panel and result text.
- Missing file gap: VetMessages.cs validation rule set was omitted (not in Zmieniaj; VetFeature handles dispatch directly).
- Before fix failures: ux-p1-buttons failed vet-checkup-feedback (missing .vet-checkup-result / mock handler) and vet-checkup-twice (button missing after first checkup).
- Left undone: none.
