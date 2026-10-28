# Behaviors

Behaviors are desktop plug-ins that allow you to extend the pet's behavior on the screen.

## How to add a new behavior
1. Create one class in one file in `src/Cuy/dotNet/Behaviors/`.
2. Implement the `IDesktopBehavior` interface.
3. Provide a unique string for the `Id` property.
4. Keep the `Tick` method fast! It's called on the UI thread ~every 100ms.
5. Use `ctx.RequestAnimation` for animations.
6. Never block the UI thread!

## Enabling Sample Behavior
To enable the sample behavior, simply remove it from the `DisabledIds` set on the behavior host:
`DisabledIds.Remove("sample");`