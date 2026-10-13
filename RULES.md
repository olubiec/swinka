# Cuy — Rules for Agents & Architecture Reference

This project is **Cuy** (a desktop pet guinea pig based on the eSheep engine, MIT license).
Please consult `PLAN.md` and `ARCHITECTURE.md` before making architectural decisions.

---

## 1. Core Principles

1. **One task at a time:** Implement only the task requested in the current message. Keep builds and tests passing at every step.
2. **Platform & Stack:**
   - **Desktop Pet (`src/Cuy`):** C# on .NET Framework 4.8 WinForms (`Cuy.exe`).
   - **Game Core (`src/Cuy.Core`):** .NET Standard 2.0 library without WinForms/Win32 references.
   - **Unit Tests (`tests/Cuy.Core.Tests`):** .NET 9.0 xUnit test suite.
   - **Simulator (`tools/Cuy.Simulator`):** .NET Framework 4.8 console simulation harness.
   - **Home UI (`web/home`):** HTML5, Vanilla CSS, JavaScript running inside WebView2 (transparency via DWM blur/accent).
   - **Minigames (`web/home/minigames`):** Phaser 3 (`lib/phaser.min.js`), local copy.
3. **Currency & Save State:**
   - Currency: **Clovers** (`koniczynki`).
   - Save path: `%AppData%\Cuy\save.json` with version field and automatic backup `%AppData%\Cuy\save.bak`.
   - Legacy migration: On first start, migrate an existing `%AppData%\Swinka` save to `%AppData%\Cuy`.
4. **Logs & Runtime Environment:**
   - WebView2 user data: `%LocalAppData%\Cuy\WebView2`.
   - Application log: `%LocalAppData%\Cuy\logs\cuy.log` (rotate at 1 MB, retain 3 historical copies).
   - Virtual Host: `https://cuy.home/` mapped to `web/home`.
   - Mutex: `"Cuy.SingleInstance"`.
5. **Pixel Art Aesthetics:**
   - Nearest-neighbor scaling, no blur or bilinear filtering.
   - 16x16 icon atlas, 64x64 sprite frames.

---

## 2. Directory Layout & Name Map

### Solutions & Projects
| Old Path | New Path | Project / Assembly / Namespace |
| --- | --- | --- |
| `esheep/src/` | `src/Cuy/` | `Cuy.csproj` -> `Cuy.exe`, namespace `Cuy` |
| `SwinkaCore/SwinkaCore/` | `src/Cuy.Core/` | `Cuy.Core.csproj` -> `Cuy.Core.dll`, namespace `Cuy.Core` |
| `SwinkaCore/SwinkaCore.Tests/` | `tests/Cuy.Core.Tests/` | `Cuy.Core.Tests.csproj`, namespace `Cuy.Core.Tests` |
| `SwinkaCore/Symulator/` | `tools/Cuy.Simulator/` | `Cuy.Simulator.csproj`, namespace `Cuy.Simulator` |
| `domek/` | `web/home/` | Home window HTML/JS/CSS |
| `domek/minigry/` | `web/home/minigames/` | Phaser 3 minigames |
| `narzedzia/` (art) | `tools/art/` | Python art generation tools (do not edit art code) |
| `narzedzia/generuj_xml.py` | `tools/build_pet_xml.py` | Builds desktop `src/Cuy/Resources/animations.xml` from `assets/` |
| `ZASADY.md` | `RULES.md` | Project rules and mappings |
| `ARCHITEKTURA.md` | `ARCHITECTURE.md` | Technical engine architecture |
| `DesktopPet.sln` / `SwinkaCore.sln` | `Cuy.sln` | Unified solution at repo root containing all 4 projects |

---

## 3. Asset & Data Mapping

### Assets Directory Structure (`assets/`)
- `assets/sprites/<variant>/`:
  - `adult/`: Adult guinea pig frames + `spritesheet.png`
  - `baby/`: Baby guinea pig frames + `spritesheet.png`
  - `senior/`: Senior guinea pig frames + `spritesheet.png`
  - `legend/`: Legend guinea pig frames + `spritesheet.png`
  - `companion_black_white/`, `companion_agouti/`, `companion_cream/`
- `assets/icons/`:
  - `icons_16.png` / `ikony_16.png` (25 icons, 400x16)
  - `icons.json` / `ikony.json`
  - `pet_head.ico`
- `assets/app-icon/`:
  - `icon.ico`, `icon_16.png`, `icon_32.png`, `icon_256.png`
- `assets/sounds/`:
  - 10 WAV sound clips (Pixabay license)
- `assets/data/`:
  - `actions.json` (English keys & actions)
  - `items.json` (English keys & item IDs)
  - `simulation.json`

### Need Names Key Map
| Polish (UI/Display) | English Data Key (`actions.json`, `items.json`, C# Enum) |
| --- | --- |
| Najedzenie | `satiety` |
| Witamina C | `vitamin_c` |
| Energia | `energy` |
| Humor | `mood` |
| Czystość klatki | `cleanliness` |
| Ząbki | `teeth` |
| Zdrowie | `health` (derived) |

### Item IDs Map
| Old Polish ID | New English ID | Name | Category |
| --- | --- | --- | --- |
| `siano` | `hay` | Siano | `food` |
| `granulat` | `pellets` | Granulat | `food` |
| `papryka` | `bell_pepper` | Papryka | `vegetable` |
| `natka` | `parsley` | Natka pietruszki | `vegetable` |
| `jarmuz` | `kale` | Jarmuż | `vegetable` |
| `ogorek` | `cucumber` | Ogórek | `vegetable` |
| `marchewka` | `carrot` | Marchewka | `treat` |
| `gryzak` | `chew_toy` | Gryzak | `chew` |
| `pilka` | `ball` | Piłeczka | `toy` |
| `tunel` | `tunnel` | Tunel | `toy` |
| `domek` | `house` | Domek | `furniture` |
| `poidlo` | `water_bottle` | Poidło | `furniture` |
| `tort` | `cake` | Tort z selera | `special` |

### Code Class & Concept Names
| Old Polish Name | New English Name |
| --- | --- |
| `SwinkaBrainController` | `BrainController` |
| `SwinkaFoodManager` | `FoodManager` |
| `SwinkaPoopManager` | `PoopManager` |
| `SwinkaInteractionManager` | `InteractionManager` |
| `SwinkaIcons` | `PetIcons` |
| `SwinkaItemCatalog` | `ItemCatalogLoader` / `ItemCatalog` |
| `FormDomek` | `HomeWindow` |
| `FormBobek` | `PoopForm` |
| `FormStatusBubble` | `StatusBubble` |
| `FormBrainOverlay` | `DebugOverlay` |
| `FormFoodItem` | `FoodItemForm` |
| `koniczynki` | `clovers` |
| `bobek` | `poop` |
| `wiez` | `bond` |
