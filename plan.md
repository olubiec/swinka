1. **Model Classes Creation**:
    - `src/Cuy.Core/Health/ConditionDefinition.cs` to model the JSON structure for health conditions and triggers.
    - `src/Cuy.Core/Health/HealthState.cs` to hold `ActiveCondition` class, and the other health states required (e.g. `LowNeedHours`).
    - `src/Cuy.Core/Health/HealthSystem.cs` for logic implementing ticking of conditions.
2. **Game State and Pet Integration**:
    - `src/Cuy.Core/GameState.Health.cs` to add the lazy `Health` state.
    - `src/Cuy.Core/Pet.Health.cs` to add the `HealthSystem` instance, logic for checking and applying conditions (e.g. `RecordTreat`, `Checkup`, `Treat`, `GiveDose`, `IsSick`, `HealthPenalty`).
3. **Write Tests**:
    - `tests/Cuy.Core.Tests/HealthSystemTests.cs` covering all the scenarios required: triggers correctly functioning, bounds logic, testing with fixed seeds, random respiratory checks.
4. **Integration**:
    - Update `assets/data/health.json` to include the specific information per the task.
5. **Pre-commit Checks**: Run pre commit steps to ensure testing, verifications, reviews and reflections are done.
6. **Submit PR**: Submit the task with title `F1-08: Illness model and treatment rules`.
