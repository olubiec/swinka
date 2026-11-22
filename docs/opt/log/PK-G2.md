Status: DONE (RunMessagesTests 10/10 pass; Cuy.csproj Release build 0 warnings, 0 errors; full Cuy.Core.Tests has 7 pre-existing unrelated failures noted in PK-G1)
Files: src/Cuy/dotNet/Features/RunFeature.cs, src/Cuy.Core/Input/Validation/RunMessages.cs, docs/contracts/run.md, tests/Cuy.Core.Tests/RunMessagesTests.cs
API: RunFeature (HomeFeatureBase, Id="run", AddState/HandleMessage/Tick), RunMessages (IMessageRuleSet, ValidatePigPayload), docs/contracts/run.md
Decisions: Stored session Out/HoursToday/MoodCreditedToday in RunFeature since WorldState.Run/Pet.Run are deferred per R38; accepted run.out/run.in + run_out/run_in aliases.
Differences from R38: Used HomeWindow.NotifyStateChanged() instead of brain.PushState() and pet.Clock.LocalNow() extension method (matching real codebase).
STUBs: None (RunMessagesTests tests real RunMessages + MessageValidator.BuildRuleMap).
