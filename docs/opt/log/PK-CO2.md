# PK-CO2: Companion: Core setting, validation and contract
- Added `src/Cuy.Core/GameState.Companion.cs` (`CompanionEnabled = false`, `CompanionId = "garden_friend"`) per R45 section 6 prompt fix.
- Added `src/Cuy.Core/Input/Validation/CompanionMessages.cs` (`IMessageRuleSet` for `companion.set`, `IsKnownCompanion`, `ValidateSetPayload`).
- Added `docs/contracts/companion.md` specifying `companion` state key and `companion.set` message contract.
- Added `tests/Cuy.Core.Tests/CompanionMessagesTests.cs` (valid, unknown id, missing field, wrong type, 200-payload fuzz, old save defaults).
- Verification: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~Companion"` (22 passed, 0 failed).
- No stubs needed; no deviations from R45 section 3/6.
