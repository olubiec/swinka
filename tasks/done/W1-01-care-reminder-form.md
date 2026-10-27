<!-- DONE 2026-10-27 by PR #32 (legacy F2-02, merged as one change). Not to be run again. Gaps fixed by W1-09, W1-10, W2-01. -->
# W1-01: Care reminder card (WinForms)
Goal: a small pixel card that can appear above the desktop pig with a care task, a Done button and a Later button.
Depends on: nothing (wave start). Contract: `docs/contracts.md`, section calendar.
Change: new `src/Cuy/dotNet/CareReminderForm.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `public sealed class CareReminderForm : Form`; constructor `(string taskId, string title, string text, string iconId, Action<string> onDone, Action<string,int> onLater)`; static `Current` (only one card at a time) and `static void CloseCurrent(string taskId = null)`. The form never calls Core itself: only the callbacks.
2. Look: borderless, TopMost, no taskbar button, does not steal focus (`ShowWithoutActivation`, `WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW` in `CreateParams`). Cream background `#f7ecd9`, 3 px dark border `#2b1712`, the task icon from `PetIcons.GetIconBitmap(iconId)` at 2x (nearest neighbour), bold title, the first sentence of `text`, buttons **Done** and **Later (1 h)**, a small x that means Later 15 min (`onLater(taskId, 15)`; the button means `onLater(taskId, 60)`).
3. Position above the pig using `FormPet.ActivePet` bounds, clamped to the working area of that screen; a 200 ms timer keeps it following the pig. Auto-hide after 3 minutes without calling any callback.
4. Static `IconFor(string taskId)`: veggies bell_pepper, water water_drop, hay hay, spot_clean broom, weigh scale, full_clean broom, brush brush, nails nail_clipper, vet_check vet, anything else pig_head (check the ids exist in `assets/icons/icons.json`; if one is missing use pig_head and list it in the PR).
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes (nothing calls the form yet; W2-01 wires it).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
