# PK-R8 log: care calendar research
Decisions: reminders default disabled in gameplay via Balance.CareManualReminders; legacy unit tests preserve enabled state.
Pig data: CareSettings.Pigs (List<CarePig>: Name, BirthDate, InitialWeightGrams) synced with PigNames for backward compatibility.
Weight entry: Pet.AddWeight auto-calls MarkCareDone("weigh"); CalendarFeature.HandleMessage dismisses _currentReminder popup.
Message validation: new CalendarMessages implementing IMessageRuleSet covers calendar_done, snooze, settings, weight, delete.
Styling & mock: use global .ui-panel-paper, .room-tab, .retro-toggle from style.css; add web/home/features/calendar/mock.js.
Packages: PK-P8a (Core & Host), PK-P8b (Web UI & Mock), PK-P8q (QA Smoke test). Zero overlap with waves 1-3.
Verification: node tools/qa/foundation-check.js docs/opt/foundations/R8.md 5 (FOUNDATION OK, 5 sections, 15877 chars).
