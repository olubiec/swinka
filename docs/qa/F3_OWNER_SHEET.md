# Wave 3 Owner Test Sheet (Windows)

One-page checklist for final human verification on Windows after Wave 3. Mark `OK` or `NO` for each step.

| # | Step | How to check | Expected result | Automated test | OK / NO |
| --- | --- | --- | --- | --- | --- |
| **A** | **Home Behavior & Parity** | | | | |
| 1 | Verify the pig sleeps inside a house at night with its nose peeking out. | Set system/game time to night while a house is placed and watch Home. | The pig enters the house and its nose peeks out while sleeping. | `ux-p111-rest-spots.js` | |
| 2 | Verify the pig takes daytime naps on a bed or mat. | Observe the pig during daytime with a rest spot in the room. | The pig walks to the rest spot and plays the nap animation. | `ux-p111-rest-spots.js` | |
| 3 | Verify the pig drinks from a water bottle. | Place a water bottle in the room and wait for idle needs. | The pig approaches the bottle and plays the drinking animation. | `ux-p110-behavior.js` | |
| 4 | Verify the pig performs the scratching idle animation. | Watch the pig while idle in Home for 30 seconds. | The pig pauses and plays the scratching animation smoothly. | `ux-p110-behavior.js` | |
| 5 | Verify the pig runs across the room floor. | Observe the pig in an open room during active hours. | The pig sprints smoothly along the walkable floor band. | `ux-p112-motion.js` | |
| 6 | Verify the pig jumps (popcorns) when happy. | Keep mood high and watch the pig move around. | The pig performs a crisp upward jump animation with no clipping. | `ux-p112-motion.js` | |
| 7 | Verify the pig dances when music is playing. | Place and click the gramophone to start a track. | The pig switches to the dancing animation in time with music. | `ux-p110-behavior.js` | |
| 8 | Verify the pig yawns when tired or waking up. | Watch the pig before or after a nap in Home. | The pig plays the yawning animation cleanly. | `ux-p110-behavior.js` | |
| 9 | Verify two pigs can sleep together in the same room. | Place two pigs in one room at night or nap time. | Both pigs settle into rest spots without overlapping awkwardly. | `ux-p111-rest-spots.js` | |
| 10 | Verify the pig reacts immediately to feeding. | Drop or give food to the pig in Home. | The pig turns toward food, eats, and shows a positive reaction. | `ux-p113-reactions.js` | |
| 11 | Verify the pig reacts immediately to petting. | Click or stroke the pig in Home. | The pig shows hearts/happy reaction and plays pet feedback. | `ux-p113-reactions.js` | |
| 12 | Verify the pig reacts when performing a trick. | Trigger a trick interaction from the pig menu. | The pig performs the trick animation and shows a reward reaction. | `ux-p113-reactions.js` | |
| 13 | Verify a sick pig refuses to run. | Observe a pig in the sick state in Home. | The pig stays slow/resting and never enters the run animation. | `ux-p120-behavior-parity.js` | |
| 14 | Verify Home pig animations match the desktop pet style. | Compare Home canvas pig side-by-side with the taskbar pig. | Sprites, scale, and animation pacing look consistent. | `ux-p117-canvas-behavior.js` | |
| **B** | **Room Editor** | | | | |
| 15 | Verify Ctrl+Z undoes the last item placement or move. | Place or move an item in the editor and press Ctrl+Z. | The item reverts to its previous position or returns to inventory. | `ux-p114-edit-history.js` | |
| 16 | Verify Ctrl+Y redoes an undone editor action. | Press Ctrl+Y immediately after pressing Ctrl+Z. | The undone placement or move is reapplied accurately. | `ux-p114-edit-history.js` | |
| 17 | Verify grid snapping aligns items cleanly while dragging. | Drag a furniture item slowly across the room floor. | The item snaps to valid grid cells without jitter. | `ux-p123-editor-adv.js` | |
| 18 | Verify editor undo/redo buttons match keyboard shortcuts. | Click the Undo and Redo toolbar buttons after editing. | Toolbar buttons enable/disable and update state identically. | `ux-p119-edit-wiring.js` | |
| **C** | **Outdoor Run in Garden** | | | | |
| 19 | Verify an outdoor run can be started in the garden. | Open Garden and start an outdoor run session. | The run begins and the pig enters the outdoor run area. | `ux-p116-run.js` | |
| 20 | Verify the pig moves inside the garden run without clipping. | Watch the pig during an active outdoor run. | The pig stays within run bounds and avoids obstacles. | `ux-p124-run-adv.js` | |
| 21 | Verify the outdoor run finishes cleanly and returns the pig. | Let the run timer complete or end the run manually. | Summary/state updates and the pig returns cleanly. | `ux-p116-run.js` | |
| 22 | Verify run capacity prevents assigning too many pigs. | Try assigning more pigs to the run than capacity allows. | Extra assignment is blocked or deferred with clear feedback. | `ux-p124-run-adv.js` | |
| **D** | **Desktop Props (Windows)** | | | | |
| 23 | Verify desktop props render sharply at 100% DPI. | Pin a prop to the desktop on a 100% scale display. | Pixel art edges are crisp with no blur or halo. | `ux-p125-props-adv.js` | |
| 24 | Verify desktop props scale cleanly at 125% DPI. | Set Windows display scale to 125% and inspect pinned props. | Props align with the taskbar and remain sharp. | `manual only` | |
| 25 | Verify desktop props scale cleanly at 150% DPI. | Set Windows display scale to 150% and inspect pinned props. | Props scale proportionally without clipping or offset bugs. | `manual only` | |
| 26 | Verify desktop props work on a second monitor. | Drag a pinned prop to a secondary monitor and release. | The prop stays visible, interactive, and saves its position. | `manual only` | |
| 27 | Verify desktop props behave properly with fullscreen apps. | Launch a fullscreen video or game while props are pinned. | Fullscreen app is not covered or disrupted by desktop props. | `manual only` | |
| **E** | **World Sounds** | | | | |
| 28 | Verify ambient world sounds play at a balanced volume. | Switch between room, garden, and market with sound on. | Ambient audio transitions smoothly without clipping. | `ux-p115-budget-sounds.js` | |
| 29 | Verify interaction sounds trigger on place, feed, and pet. | Place an item, feed a pig, and pet a pig in Home. | Each action plays its matching sound effect promptly. | `ux-p115-budget-sounds.js` | |
| 30 | Verify muting silences all world and UI sounds immediately. | Toggle mute in settings while ambient and SFX are active. | All audio stops immediately with no lingering loops. | `manual only` | |
| **F** | **Performance with 3 Pigs** | | | | |
| 31 | Verify 3 pigs in Home animate smoothly without frame drops. | Open Home with 3 pigs active in the same scene for 1 minute. | Animations stay fluid and UI clicks remain responsive. | `ux-p127-perf-leaks.js` | |
| 32 | Verify 3 desktop pigs keep CPU and memory low over 5 minutes. | Run 3 pigs on the Windows taskbar and watch Task Manager. | CPU stays low and memory does not climb continuously. | `manual only` | |
| 33 | Verify switching rooms and toggling Home with 3 pigs has no lag. | Switch rooms, open editor, and close/reopen Home 5 times. | Transitions are fast with no stutter or visual artifacts. | `ux-p126-day-journey.js` | |
