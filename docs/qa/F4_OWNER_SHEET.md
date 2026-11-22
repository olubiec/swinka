# Wave 4 Owner Test Sheet (Windows)

One-page checklist for final human verification on Windows after Wave 4. Mark `OK` or `NO` for each step.

| # | Step | How to check | Expected result | Automated test | OK / NO |
| --- | --- | --- | --- | --- | --- |
| **A** | **Hay Hop** | | | | |
| 1 | Launch and play Hay Hop from Home. | Open the Hay Hop minigame and jump over obstacles using keyboard or mouse. | Minigame starts cleanly and jump controls respond without input lag. | `ux-p130-hayhop.js` | |
| 2 | Verify scoring and run end screen. | Clear several obstacles, then collide with an obstacle to end the run. | Score increments on cleared obstacles and the end-of-run summary appears cleanly. | `ux-p130-hayhop.js` | |
| 3 | Verify clover reward payout. | Finish a run with a positive score and check the clover balance in Home. | Earned clovers are added to the wallet immediately and persist. | `ux-p130-hayhop.js` | |
| 4 | Verify daily reward limit. | Play runs until the daily reward cap is reached, then complete another run. | Daily cap notice is shown, payout stops at the cap, and practice play still works. | `ux-p140-hayhop-adv.js` | |
| 5 | Verify WebView2 audio and visual smoothness. | Play a full run on Windows with sound on and inspect rendering. | Audio plays in sync and WebGL/canvas rendering has no stutter or glitches. | `manual only` | |
| **B** | **Companion** | | | | |
| 6 | Enable companion toggle in Home. | Turn on the companion setting and observe the room. | Companion pig spawns in Home without overlapping the main pig. | `ux-p131-companion.js` | |
| 7 | Verify companion in Garden with furniture. | Switch to Garden with companion enabled and furniture placed. | Companion moves around the garden with correct draw order behind/in front of props. | `ux-p141-companion-adv.js` | |
| 8 | Verify companion in Park. | Travel to Park with companion enabled and walk around. | Both main pig and companion render and roam within park bounds. | `ux-p131-companion.js` | |
| 9 | Toggle companion off and verify persistence. | Turn off the companion toggle, switch scenes, and reopen Home. | Companion despawns immediately and stays disabled after reopening Home. | `ux-p141-companion-adv.js` | |
| 10 | Verify companion performance on Windows. | Keep companion active across Home and taskbar for 2 minutes. | Animations stay smooth and CPU/memory remain low. | `manual only` | |
| **C** | **Dancing to Music** | | | | |
| 11 | Verify pig dances when music plays. | Start music playback on the gramophone/radio in Home. | The pig switches to the dance animation in time with the music. | `ux-p132-dance.js` | |
| 12 | Verify click interrupts and resumes dance. | Click/pet the dancing pig, then wait a few seconds while music still plays. | The pig reacts to the click and then resumes dancing smoothly. | `ux-p142-dance-adv.js` | |
| 13 | Verify two pigs dance together. | Have both main pig and companion in Home while music is playing. | Both pigs enter the dance animation and stay synced. | `ux-p142-dance-adv.js` | |
| 14 | Verify stopping music ends the dance. | Pause or turn off the music player in Home. | Dancing pigs return cleanly to normal idle or walking behavior. | `ux-p132-dance.js` | |
| **D** | **Live Weather & Privacy** | | | | |
| 15 | Verify live weather is off by default. | Launch with a fresh profile and inspect weather settings. | Live weather toggle is OFF and no location is stored. | `ux-p133-weather-live.js` | |
| 16 | Verify zero network traffic without consent. | Monitor outbound traffic (Fiddler/Wireshark/DevTools) with live weather OFF. | Zero weather or location network requests are sent. | `ux-p143-weather-privacy.js` | |
| 17 | Verify opt-in consent and live update. | Grant weather consent, set a location, and trigger a weather update. | Weather state updates and matching visual weather effects appear. | `ux-p133-weather-live.js` | |
| 18 | Verify Windows Firewall block handling. | Block `Cuy.exe` outbound connections in Windows Firewall and refresh weather. | App handles the blocked request gracefully with no freeze or crash. | `manual only` | |
| 19 | Verify offline / no-internet fallback. | Disconnect Wi-Fi/Ethernet, launch the app with live weather enabled. | Offline fallback activates cleanly without unhandled errors or UI lockup. | `manual only` | |
| 20 | Verify removing location / revoking consent. | Clear the saved location or disable live weather in settings. | Location data is removed from saved state and live weather stops. | `ux-p143-weather-privacy.js` | |
| 21 | Verify zero traffic after revoking consent. | Restart the app after clearing consent and watch the network monitor. | Zero outbound weather requests occur on startup or during idle. | `manual only` | |
| **E** | **Growth Stages in Home** | | | | |
| 22 | Verify `baby` stage appearance in Home. | Inspect a `baby` stage pig walking, idling, and eating in Home. | Baby sprites, scale, and animations render crisply with no clipping. | `ux-p134-stage-looks.js` | |
| 23 | Verify `junior` stage appearance in Home. | Inspect a `junior` stage pig in Home. | Junior stage look and animations render cleanly. | `ux-p134-stage-looks.js` | |
| 24 | Verify `adult` stage appearance in Home. | Inspect an `adult` stage pig in Home. | Adult stage look and animations render cleanly. | `ux-p134-stage-looks.js` | |
| 25 | Verify `senior` stage appearance in Home. | Inspect a `senior` stage pig in Home. | Senior stage look and animations render cleanly. | `ux-p134-stage-looks.js` | |
| 26 | Verify `legend` stage appearance in Home. | Inspect a `legend` stage pig in Home and compare with taskbar pet. | Legend stage look/effects render cleanly and match the desktop pet. | `ux-p134-stage-looks.js` | |
| **F** | **Full Game Playthrough (Waves 3 & 4)** | | | | |
| 27 | Adoption flow. | Adopt or add a pig and check its initial profile, stage, and needs. | Pig is created with valid defaults and appears in Home and taskbar. | `ux-p126-day-journey.js` | |
| 28 | Home room interaction. | Pet the pig, toggle props, and switch between indoor rooms. | Needs/reactions update and room transitions stay smooth. | `ux-p144-stage-regression.js` | |
| 29 | Garden gameplay. | Visit Garden, start an outdoor run or interact with garden props. | Pig navigates within garden bounds and companion/run work cleanly. | `ux-p144-stage-regression.js` | |
| 30 | Farm gameplay. | Visit Farm and interact with crops/farm items. | Farm state updates and rewards/items register properly. | `ux-p144-stage-regression.js` | |
| 31 | Market purchase flow. | Open Market, purchase an item with clovers, and check inventory. | Clovers deduct accurately and the purchased item appears in inventory. | `ux-p144-stage-regression.js` | |
| 32 | Park exploration. | Visit Park and let the pig (and companion) roam. | Pig moves within walkable park bounds with no visual glitches. | `ux-p144-stage-regression.js` | |
| 33 | Room Editor and Undo/Redo. | Enter Edit mode, place/move an item, press Ctrl+Z and Ctrl+Y, then reload. | Undo/redo work accurately and final layout persists after reload. | `ux-p144-stage-regression.js` | |
| 34 | Sleep behavior. | Set night or place a rest spot and observe the pig sleeping. | Pig enters the house/bed and plays the sleep animation cleanly. | `ux-p144-stage-regression.js` | |
| 35 | Eating behavior. | Feed food items to the pig from inventory. | Pig eats with animation/sound and fullness/vitamin C/mood increase. | `ux-p144-stage-regression.js` | |
