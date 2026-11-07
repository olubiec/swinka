# PK-P38a — Pig presence chip and exits

- Decisions: Rendered wood-panel badge chip `Cuy is in <place>` with a `Go there` button when viewing an empty scene; multi-pig mode shows `<Name> is in <place>`. Clicking `Go there` jumps to that scene.
- Exits: Hooked `CanvasPig.onPigExit` to dispatch `places.pigMove { pigId, to }` along the scene ring, respecting locked destinations (disabling exits for 60s) and pinned pigs.
- Transitions: Guarded `CanvasPig.setScene` from resetting pig positioning when scene is unchanged, and invoked `CanvasPig.enterFrom(side)` upon detecting arrivals in `checkArrivals`.
- Differences from planned: None; adheres strictly to the contracts and scene ordering.
- Status: DONE
