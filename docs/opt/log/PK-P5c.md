# PK-P5c: Desktop minimal second pig companion
Status: OK (already implemented in FormPet.cs, BrainController.cs, PigsFeature.cs; build verified).
APIs/fields: FormPet.IsAmbientCompanion (skips _brain.StepWalk at 1266, random idle/walk/sniff/popcorn at 1469-1475); BrainController.SetDesktopPet(PigProfile, bool) (UI-thread BeginInvoke, max 2 FormPet); PigsFeature.HandleMessage handles "pigs.desktopPet" { pigId, on } (max 2 / min 1 in ActivePigIds, toast "Max 2 pigs on desktop", AutoSaver.SaveNow, PigLook.RefreshAll, NotifyStateChanged, [Pets] log).
Differences: None; implementation matches R29 section 6 Option A.
Manual test (Windows):
1. Open Home -> Pigs card, toggle "Show on desktop" ON for a second pig -> second FormPet appears and wanders/idles on desktop.
2. Try enabling a 3rd pig -> refused with toast "Max 2 pigs on desktop".
3. Toggle the 2nd pig OFF -> second FormPet closes and disposes cleanly; check logs for "[Pets] Closed ambient desktop pet window" and no window leak.
4. Confirm primary pig still responds to feeding/cursor while 2nd pig cycles ambient animations without clobbering BrainController.
