# Manual test before giving Cuy away

Run on a second Windows account or in Windows Sandbox, from a fresh unzip of dist/Cuy_v1.zip.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Unzip dist/Cuy_v1.zip, run Cuy.exe, pass SmartScreen (More info > Run anyway) | Welcome view in Home asks for a pig name; 3-step intro follows; gift letter shows if gift/note.txt exists |
| 2 | Enter name, complete intro | Guinea pig emerges at taskbar (corner peek animation), settles on taskbar; name in tray tooltip; same baby pig drawn in Home |
| 3 | Start Cuy.exe a second time | No second pig; Home of running pig comes to the front |
| 4 | Observe pig idle and walking on taskbar | Pig idles, sniffs, twitches nose, then walks left and right along top edge of taskbar without falling off |
| 5 | Move taskbar to top/left/right; set display scale 150 % | Pig stays docked to taskbar edge and reachable |
| 6 | Move cursor close to pig, keep cursor still | Pig turns head and follows cursor with its eyes smoothly |
| 7 | Feed from tray menu or from Home | Pig walks to food and eats; fullness increases; heart particles float up |
| 8 | Wait for poop, click poop | Poop disappears and gives +2 clovers; cleanliness bar increases |
| 9 | Feed from hay rack in Home | Pig eats hay; teeth wearing stays balanced; hay count decreases |
| 10 | Double click pig or tray icon to open Home | Home opens at 420x640; displays 6 need bars, bond bar, and clover balance |
| 11 | Call pig from Home or tray menu | Pig wheeks, turns, and runs to the cursor |
| 12 | Click pig 10 times fast | Pig chatters teeth, displays annoyed mood, and sulks briefly |
| 13 | Sleep PC for 30 minutes, wake it | Pig still there; needs lower over time but do not drop below safety floor (20) |
| 14 | Open Care Calendar feature in Home | Calendar grid displays current month with past care badges, streak counter, and activity marks |
| 15 | Complete all daily care tasks (feed, pet, clean) | Today receives gold star, streak increments by 1, and daily care bonus is awarded |
| 16 | Open Vet feature in Home | Vet screen shows pig vitals, diagnosis card (vitamin C level, hygiene, teeth wear), and advice |
| 17 | Administer medicine or vitamin C drops at Vet | Treatment animation plays, illness status clears, and health indicator returns to green |
| 18 | Open Colouring feature in Home | Canvas loads with pig outlines, color palette, and pixel fill tools |
| 19 | Color illustration and click Save | Artwork saves to local album, awards creativity clovers, and page is viewable in Album |
| 20 | Open Shop in Home | Catalog displays food (pellets, bell pepper, kale, carrot), care items, toys, and habitat decor with clover prices |
| 21 | Purchase an item with clovers | Clover counter deducts price, item appears in inventory, and pig squeaks with excitement |
| 22 | Open Decor feature, place a rug or wooden house | Placed decor item appears in Home room view; pig rests near or interacts with it |
| 23 | Play Veggie Rain minigame from Minigames hub | Falling vegetables caught in basket award clovers up to daily cap |
| 24 | Play Veggie Memory minigame | Matching veggie pairs clears board, displays victory banner, time, and clover rewards |
| 25 | Play Hay Maze minigame | Pig navigates maze collecting hay; reaching finish records time on hub leaderboard and awards clovers |
| 26 | Pet pig with cursor | Purr sound plays, hearts float up, and bond progress bar increases |
| 27 | Open Tricks feature in Home | Unlocked tricks (Spin, Stand Up, Popcorn, Hurdle Jump) display with cooldown timers and level requirements |
| 28 | Click a ready trick (e.g. Spin or Popcorn) | Pig performs trick animation on desktop and Home, gains bond XP, and trick enters cooldown |
| 29 | Reach pig birthday or anniversary | Birthday hat and banner appear in Home; confetti bursts; birthday cake gift is delivered |
| 30 | Feed birthday cake to pig | Pig eats cake with festive chewing particles, fullness and mood jump to 100%, and birthday entry saves to album |
| 31 | Open Achievements feature in Home | Achievement list shows progress bars, unlocked badges, and clover rewards |
| 32 | Complete an achievement requirement | Toast alert appears; badge unlocks with sound; clovers are claimed and balance updates |
| 33 | Play audio or music on Windows | Pig notices sound, enters listening posture, and twitches ears rhythmically |
| 34 | Shake mouse cursor rapidly over pig | Pig startles with alert bubble (!), freezes briefly, and scampers to nearest corner |
| 35 | Launch a fullscreen game or video | Cuy detects fullscreen window and hides desktop pet to avoid obstruction, reappearing when window un-fullscreens |
| 36 | Toggle sound off in tray menu or Settings | Audio mutes instantly; unmuting restores wheeks, chewing, and UI sound effects at volume slider level |
| 37 | Change display scale or select secondary monitor in Settings | Pig resizes smoothly (1x, 1.5x, 2x) or repositions to selected secondary monitor taskbar |
| 38 | Click 'New Pig' in Settings, confirm reset modal | Current pig state is backed up with timestamp to backups folder; game resets to welcome naming screen |
| 39 | Open Diary and Album in Home | Chronological timeline shows birth date, stage changes, trick milestones, and saved snapshot photos |
| 40 | Terminal test, autostart toggle, and release integrity (Cuy.exe --selftest, F9, size, logs) | Cuy.exe --selftest returns exit code 0 with all PASS; pressing F9 does nothing; tray menu has no dev items; unticking Start with Windows disables autorun; quitting/restarting/reinstalling keeps name, needs, and clovers; unzipped folder is under 60 MB; %LocalAppData%\Cuy\logs\cuy.log contains 0 ERROR lines |
