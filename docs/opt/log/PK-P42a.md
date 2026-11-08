# PK-P42a: Core: one pig look source of truth
Desktop fields: pet.Profile (NamedId, Breed, PaletteId) + stageKey; uses named sheet if present, else breed + palette.
Home fields: roster/pigs (id, name, breed, paletteId, namedId, stage); canvas-pig previously bypassed baked named sheets.
Mismatch: unnamed starter fell back to named roster/kuki skin; Home window rendered generic sheet for Kuki.
Core API: PigLookResolver.Resolve(pig, stage) returns PigLookDescriptor { SpriteKey, Breed, Coat, Stage, Named }.
Page state: PigRoster.BuildPigLook / AttachLook exposes pig.look = { spriteKey, breed, coat, stage }.
Desktop adapter: src/Cuy/Graphics/PigLook.cs delegates look resolution to Core's PigLookResolver.
Tests: K1 (starter!=kuki/ned), K2 (determinism), K3 (assets exist), K4 (stage changes), K5 (unnamed pig).
Differences: PigsFeature.cs not in Zmieniaj; look state builder helper placed in PigRoster.cs for callers.
