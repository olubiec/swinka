# Contracts per feature

Each feature documents its Home state and messages in `docs/contracts/<feature>.md` (old features stay in `docs/contracts.md`). One file per feature means two packages never edit the same contract file.

## Message validation (Core)
`src/Cuy.Core/Input/MessageValidator.cs` validates the messages JS sends. It never changes per feature. A feature adds one class `src/Cuy.Core/Input/Validation/<Feature>Messages.cs` implementing `IMessageRuleSet`; the validator finds all rule sets by reflection. Rules cover required fields, types, ranges and the snake_case type name. Prices and rewards are never read from JS.

## Browser mock
`web/home/features/<id>/mock.js` (loaded after `feature.js`, mock mode only) registers `bridge.registerMockHandler(type, fn)` for messages and `bridge.registerMockState(id, fn)` for the feature's default state. `bridge.js` itself does not grow.
