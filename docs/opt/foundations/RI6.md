# RI6: Integration analysis — Hay Hop, companion, dance, live weather, stage looks

## 1. Rozbieżności moduły F4-2 vs kontrakty

Wszystkie 25 plików F4-2 istnieją na dysku. Zgodności i rozbieżności względem `R44`, `R45`, `R48`, `R49`, `R50`:

| Obszar | Kontrakt | Stan w kodzie (`plik:linia`) | Rozbieżność / akcja integracyjna |
| --- | --- | --- | --- |
| Hay Hop (JS + Core) | `R44`: `minigame.hay_hop.result` (`score`, `durationMs`, `seed`) w `HayHopMessages` i `docs/contracts/hayhop.md:3-10` | `hayhop.js:109,230` woła `config.endGame(score)` -> `minigames-api.js:1025` wysyła `minigame_result`; `HomeWindow.cs:741-745` obsługuje tylko `minigame_result(gameId, score)` bez `durationMs`; `HayHopMessages.cs:15-19` rejestruje `minigame.hay_hop.result` | Zgodnie z `R44.md:66`: w `PK-CS4` podpiąć `HayHopReward.Compute` / obsługę `durationMs` lub pozostawić `minigame_result` jako ścieżkę kompatybilną |
| Companion (JS + Core) | `R45`: `Companion.create`, `step(dt, ctx)`, `entries()`, `setEnabled`, `setId`, `isEnabled`, `getId`, `DEFAULT_DATA`; `GameState.CompanionEnabled=false`, `CompanionId="garden_friend"`; `CompanionMessages` (`companion.set`) | `web/home/lib/companion.js:10,111,282,306,328-366`; `src/Cuy.Core/GameState.Companion.cs:6-9`; `src/Cuy.Core/Input/Validation/CompanionMessages.cs:12-82` | Brak rozbieżności w API. `HomeWindow.cs` nie emituje jeszcze `state.companion` ani nie obsługuje `companion.set` (do wpięcia w `PK-CS4`); `GameState.Normalize()` (`GameState.cs:94-118`) nie pilnuje pustego `CompanionId` |
| Dance Sync (JS + JSON) | `R48`: `DEFAULT_BPM=120`, `FRAMES_PER_BEAT=4`, `MIN_FPS=4`, `MAX_FPS=16`, `MAX_DANCE_MS=30000`, `beatClock`, `fpsForBpm`, `resolveTrackBpm`, `shouldStartDance`, `shouldStopDance`, `createBrowserSync` | `web/home/lib/dance-sync.js:6-10,20,78,94,142,151,177,279-298`; `assets/data/music_bpm.json` istnieje | Zgodne z kontraktem. `music_bpm.json` nie jest jeszcze ładowany w `app.js:127-141` (do wpięcia w `PK-APP4`), a `canvas-pig.js` nie ma jeszcze `setMusicBpmData` / `_danceSynced` (do wpięcia w `PK-CV4`) |
| Live Weather (Core + C# + Web) | `R49`: `GameState.Normalize()` ustawia `Weather = new WeatherSettings()`; `WeatherMapping.FromWmo` zwraca `"clear"` dla nieznanych kodów; `WeatherMessages` (`weather.*`); `WeatherService`; `CuyWeatherLive.mapState`/`validateCoordsInput`; `features/weather/*` | `src/Cuy.Core/GameState.Weather.cs:5-14`; `src/Cuy.Core/Weather/WeatherMapping.cs:29-75`; `src/Cuy.Core/Input/Validation/WeatherMessages.cs:11-22`; `src/Cuy/dotNet/WeatherService.cs:22-207`; `web/home/lib/weather-live.js:18-74`; `web/home/features/weather/feature.js:120-210` | **Rozbieżność:** `GameState.Normalize()` (`src/Cuy.Core/GameState.cs:94-118`) NIE zawiera `if (Weather == null) Weather = new WeatherSettings();` (wymagane w `R49.md:51`). Dodatkowo `Program.cs:235-240` i `HomeWindow.cs:661,761` czekają na wpięcie w `PK-CS4` |
| Stage Looks (JS + JSON) | `R50`: `STAGES`, `NAMED_PIGS`, `normStage`, `normBreed`, `setData`, `getData`, `lookFor`, `badge`, `housePlate` | `web/home/lib/stage-looks.js:4-295`; `assets/data/stage_looks.json` istnieje | Zgodne z kontraktem. `canvas-pig.js` (`3790-3835`, `4391-4399`, `4664-4670`, `5140-5150`) nie wywołuje jeszcze `StageLooks` (do wpięcia w `PK-CV4`) |

## 2. Kotwice dla PK-CV4 (`web/home/canvas-pig.js`)

Wszystkie numery linii zweryfikowane w aktualnym `web/home/canvas-pig.js` (5665 linii):

1. **Companion (`R45`):**
   - Pola instancji w konstruktorze `PigCanvas`: dodać `this.companionCfg = null; this._companionInst = null;`.
   - `update(dt)` (`canvas-pig.js:3965-4135`): po aktualizacji pozycji świnek wywołać `this._companionInst.step(dt, { sceneId: this.sceneId, walk: this.walk, pigs: ..., isFree: (x, y) => this.isFree(x, y) })` (gdy `this._companionInst` aktywne).
   - `render()` (`canvas-pig.js:4331-4381`): pobrać `companionEntries = (this._companionInst && this._companionInst.entries()) || []`, dołączyć do tablicy `merged` sortowanej po `y` (obok `inFront` i `extraPigs` z linii `4333-4335`) i rysować z `drawContactShadowFor` + `litFrame` z uwzględnieniem `entry.facing`, `entry.frameSize`, `entry.floorY`, `entry.scale`.
   - Publiczne API (`canvas-pig.js:5306-5583`): dodać `setCompanion(cfgOrEnabled)` na `PigCanvas.prototype`, w `CanvasPig` i w delegacji `PigCanvas.setCompanion` (`5534-5565`). Wyłączenie (`enabled === false` lub falsy) natychmiast wywołuje `setEnabled(false)` / zeruje wpis.

2. **Dance Sync (`R48`):**
   - `PigCanvas.prototype.setMusicBpmData(data)`: przekazuje tabelę BPM do instancji `DanceSync.createBrowserSync()`.
   - `_buildBehaviorCtx()` (`canvas-pig.js:3375-3409`): w linii `3407` zastąpić surowe `window.CuyMusic.isPlaying()` wywołaniem `this._danceSync.isMusicAudible()` (z fallbackiem na `CuyMusic.isPlaying()`).
   - `update(dt)` (`canvas-pig.js:4093-4135`): sprawdzać `DanceSync.shouldStartDance` / `DanceSync.shouldStopDance` (`MAX_DANCE_MS = 30000`), aktualizować `this._danceSyncFps` z `sync(nowMs)` oraz ustawiać cooldown po zakończeniu tańca.
   - `defFor(animName)` (`canvas-pig.js:4664-4670`): gdy `animName === 'dance' && this._danceSynced && this._danceSyncFps`, użyć `this._danceSyncFps` (zachowując spowolnienie `0.8` dla `senior`/`legend` z linii `4666-4667`).

3. **Live Weather (`R49`):**
   - `PigCanvas.prototype.setWeatherKind(kind)` + ekspozycja w `CanvasPig` (`canvas-pig.js:5306-5583`): zapisuje `this._weatherKind = kind || null` (jeden z `'clear'|'cloudy'|'fog'|'rain'|'snow'|'storm'|null`), aby warstwa `'weather'` (`CuyWeather`, `web/home/features/places/feature.js:1270-1288`) mogła zastosować nadpisany typ pogody na żywo.

4. **Stage Looks (`R50`):**
   - `updateState(state)` (`canvas-pig.js:3790-3835`, po linii `3815-3829`): wywołać `StageLooks.lookFor(this.activePig, this.stageKey)` i zapisać `this._stageLook`, aktualizując `this.spriteKey` i `this.canvas.dataset.spriteKey`.
   - `render()` (`canvas-pig.js:4391-4399`, po bloku `drawMarketSignboards` w `4391-4393`): dla `this.sceneId === 'room' || this.sceneId === 'salon'` wywołać `StageLooks.housePlate(this.lastState)` i narysować pikselową tabliczkę Domku bez naruszania `litFrame` i `DrawBudget`.
   - `defFor(animName)` (`canvas-pig.js:4664-4670`): uwzględnić `this._stageLook.slowMul` (domyślnie `0.8` dla `senior`/`legend`).
   - `drawSpeechBubble(ctx)` (`canvas-pig.js:5140-5150`, linia `5149`): zastąpić stałe `-44` przez `(this._stageLook && this._stageLook.bubbleOffsetY) || -44`.
   - `CanvasPig` (`5534-5583`): dodać `setBeat(clock)` jeśli wymagane przez `PK-CV4` (`R50.md:89`).

## 3. Kotwice dla PK-APP4 (`web/home/`)

1. **`web/home/index.html`:**
   - Linia `297` (`<script src="lib/weather.js"></script>`): dopisać `<script src="lib/weather-live.js"></script>` zaraz po `lib/weather.js`.
   - Linie `300-304` (przed `<script src="canvas-pig.js"></script>` w `304`): dopisać `<script src="lib/companion.js"></script>`, `<script src="lib/dance-sync.js"></script>`, `<script src="lib/stage-looks.js"></script>`.

2. **`web/home/features/index.json`:**
   - Linie `1-20`: dopisać `"weather"` do tablicy modułów funkcji.

3. **`web/home/minigames/games.json`:**
   - Linia `1`: dopisać na końcu tablicy `"hayhop/hayhop-logic.js", "hayhop/hayhop.js"`.

4. **`web/home/app.js`:**
   - `initBehaviorData()` (`app.js:127-141`): w `Promise.all` pobrać `base + 'data/music_bpm.json'` (przekazać do `canvasPig.setMusicBpmData`), oraz opcjonalnie `data/companions.json` i `data/stage_looks.json` (`StageLooks.setData`).
   - `updateStateUI(state)` (`app.js:337-452`):
     - ok. `370-374` (`elements.stageBadge`): opcjonalnie użyć `StageLooks.badge(state, state.stageKey)` do spójnego tekstu wieku i klasy.
     - ok. `445-451` (przy `canvasPig.updateState(state)`): wywołać `CuyWeatherLive.mapState(state.weather)` -> `canvasPig.setWeatherKind(...)` oraz przekazać `state.companion` -> `canvasPig.setCompanion(...)`.

## 4. Kotwice dla PK-CS4 (C# / Core)

1. **`src/Cuy.Core/GameState.cs`:**
   - `Normalize()` (`GameState.cs:94-118`): dodać `if (Weather == null) Weather = new WeatherSettings();` oraz `if (string.IsNullOrWhiteSpace(CompanionId)) CompanionId = "garden_friend";`.

2. **`src/Cuy/dotNet/Program.cs`:**
   - Linie `235-240`: po `BrainController.Initialize(initialSpeed)` utworzyć `WeatherService` z `hasConsent: () => BrainController.Instance?.Pet?.State?.Weather?.Consent == true` i zamknąć/zwolnić w `Application.ApplicationExit` (`Program.cs:240`).

3. **`src/Cuy/dotNet/HomeWindow.cs`:**
   - `BuildStatePayload` (`HomeWindow.cs:661`, przed/obok `HomeFeatures.AddAllState`): dodać `payload["weather"]` ze stanu `Pet.State.Weather` + `WeatherService` oraz `payload["companion"]` (`{ enabled = state.CompanionEnabled, id = state.CompanionId }`).
   - Obsługa wiadomości (`HomeWindow.cs:741-766`):
     - `761` (`HomeFeatures.Dispatch`): obsłużyć `weather.setConsent`, `weather.setLocation`, `weather.deleteLocation`, `weather.refresh` (z `MessageValidator`) oraz `companion.set` (`CompanionMessages`), albo przez klasy `IHomeFeature` (`HomeFeatures.LoadAll()` w `Program.cs:236` ładuje je automatycznie przez refleksję).
     - `741-745, 1019`: dla `minigame_result` przy `gameId == "hay_hop"` (lub nowej wiadomości `minigame.hay_hop.result`) zachować kompatybilność z `HandleMinigameResult` i ewentualnie podpiąć `HayHopReward.Compute`.

## 5. Kolejność wstawień i ryzyka (prywatność)

1. **Kolejność wstawień w F4-4:**
   1. `PK-CS4` (Core `GameState.Normalize()`, `Program.cs`, `HomeWindow.cs` / `IHomeFeature`) — zapewnia kompletny `state.weather` i `state.companion` w payloadzie oraz walidację wiadomości.
   2. `PK-CV4` (`web/home/canvas-pig.js`) — dodaje metody `setCompanion`, `setMusicBpmData`, `setWeatherKind`, `setBeat` i integrację `StageLooks` w `updateState`/`render`/`defFor`/`drawSpeechBubble`.
   3. `PK-APP4` (`index.html`, `app.js`, `features/index.json`, `minigames/games.json`) — ładuje skrypty w kolejności zależności i spina dane JSON + `updateStateUI` z `CanvasPig`.

2. **Ryzyka i kontrola prywatności:**
   - **Brak żądań sieciowych bez zgody (`R49`):** `WeatherService` tworzy `HttpClient` leniwie dopiero gdy `hasConsent() == true` (`WeatherService.cs:75`), a `web/home/features/weather/feature.js` wysyła wyłącznie komunikaty bridge (`weather.*`) bez żadnego `fetch`/`XMLHttpRequest`/`WebSocket`. `PK-CS4` nie może wywoływać `GetCurrentAsync` ani `GeocodeCityAsync` przed jawnym `Consent == true`.
   - **Zaokrąglenie współrzędnych (`R49`):** `WeatherService.GetCurrentAsync` zaokrągla `lat`/`lon` do 1 miejsca po przecinku przed `OpenMeteo.ForecastUrl`.
   - **Brak `AnalyserNode` (`R48`):** `dance-sync.js` używa `beatClock` + `music_bpm.json`; nie dotyka `web/home/music.js` i nie tworzy `AudioContext.createMediaElementSource` (ryzyko CORS na `https://cuy.assets/`).
   - **Skala i kolizje (`R45`, `R50`):** `CanvasPig.setCompanion` aktywny wyłącznie w `garden` i `park`; `housePlate` rysowane wyłącznie w `room` i `salon`.
