# W8-07: Home contracts match what was built
Zmieniaj: docs/contracts.md
Wymagane: docs/contracts.md
Weryfikacja: git diff shows only the files listed in "Zmieniaj"
Nie ruszaj: src/*, web/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: `docs/contracts.md` is the true list of state keys and messages.
Depends on: all earlier waves merged. Read the C# `AddState` / `HandleMessage` of every feature and `HomeWindow.SendStateToWebView`; the mock in `web/home/bridge.js` must agree.
Steps:
1. Bring these sections in line with the code: diary and album, bond (`bond`, `bondNext`), hayRack, minigames (`records`, `dailyRewardedCount`, `dailyMax`, `plays`, `lastResult`), tricks (`id, title, unlocked, unlockLevel, readyIn`, message `trick`), achievements, settings (volume, quiet hours, mute, `monitors`, `monitor`, `settings_monitor`, `settings_reset_confirmed`).
2. Mark the companion and weather sections "not built" (kept as design notes) instead of deleting them. Where code and contract disagree and the code is clearly right, change the contract; list every disagreement in the PR.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
