# Manual test before giving Cuy away

Run on a second Windows account or in Windows Sandbox, from a fresh unzip of dist/Cuy_v1.zip.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Unzip, run Cuy.exe, pass SmartScreen (More info > Run anyway) | Welcome view in Home asks for a name; 3-step intro follows; gift letter shows if gift/note.txt exists |
| 2 | Wait 5 s | Small (baby) guinea pig on the taskbar; name in the tray tooltip; same baby pig drawn in Home |
| 3 | Feed from the tray and from Home; buy an item in the shop; click a poop | Pig walks to food and eats; clovers change; poop disappears and gives clovers; need bars move |
| 4 | Pet with the cursor; keep the cursor still near the pig; Call; click the pig 10 times fast | Purr and hearts; pig turns and follows the cursor with its eyes; runs to the cursor and wheeks; chatters and sulks |
| 5 | Sounds off in the tray menu | No sounds until switched back on |
| 6 | Start Cuy.exe a second time | No second pig; Home of the running pig comes to the front |
| 7 | Press F9 | Nothing happens in Release |
| 8 | Move the taskbar to the top and to the left; set display scale 150 % | Pig stays on the taskbar and reachable |
| 9 | Sleep the PC for 30 minutes, wake it | Pig still there; needs lower but not below 20 |
| 10 | Quit, start again | Name, needs, clovers and items unchanged |
| 11 | Restart Windows | Cuy starts by itself |
| 12 | Untick Start with Windows, restart Windows | Cuy does not start |
| 13 | Unzip a newer build over the folder, start | Same pig, same name and clovers |
| 14 | In a terminal: Cuy.exe --selftest | Every line PASS, exit code 0 |
| 15 | Check %LocalAppData%\Cuy\logs\cuy.log | No ERROR lines |
