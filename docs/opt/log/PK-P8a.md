# PK-P8a Log: Core pig profiles and manual reminders
- Models: CarePigProfile (Name, BirthDate, AdoptedDate, BaselineGrams) and CareSettings.Pigs (List<CarePigProfile>).
- Validation: CareInput.TryProfile validates name, dates (2020-01-01..today, adopted >= birth), and baseline grams (50..3000, 0/null=none).
- Management: Pet.SetPigProfile adds/updates profile in CareSettings.Pigs and synchronizes CareSettings.PigNames.
- Manual opt-in: CareSettings.ManualOptIn (bool?). When true (new games), tasks require explicit enabled override.
- Compatibility: Legacy saves load with ManualOptIn=null keeping existing behavior; GameState.Care.cs not in Zmieniaj (AGENTS.md gap rule: not touched).
- Reminders: AddWeight marks WeightLog tasks done, updates LastDoneUtc/History for today, and avoids double-counting streaks.
- Differences from R8: Named CarePigProfile instead of CarePig, AdoptedDate added, ManualOptIn on CareSettings instead of Balance flag, host feature wiring left to next package.
