Status: BLOCKED on Playwright browser run (`node --check` passed on feature.js, mock.js, ux-p116-run.js)
Files: web/home/features/run/feature.js, web/home/features/run/feature.css, web/home/features/run/mock.js, tools/qa/ux-p116-run.js
API: window.CuyRun + CuyHome.registerFeature({id:'run', alwaysOnState:true}), #runEntryBtn, CuyRoom.addLayer('run_overlay',6), bridge run.out/run.in
Decisions: Palette colors only from style_palette.json/--ui-*; ux-p116-run.js mounts run files via addScriptTag/addStyleTag when not yet in index.json.
Block reason (node tools/qa/ux-p116-run.js):
browserType.launch: Executable doesn't exist at C:\Users\48782\AppData\Local\ms-playwright\chromium_headless_shell-1194\chrome-win\headless_shell.exe
Please run: npx playwright install
STUBs: ux-p116-run.js stubs CuyPlaces.getCurrentPlace() for scene switching tests (V1..V7).
