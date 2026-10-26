# Third-Party Software Notices and Licences

This project (Cuy) incorporates third-party software and assets licensed under open source and permissive licenses.
The notices and full license texts are provided below.

---

## 1. DesktopPet (eSheep)

- Project: https://github.com/Adrianotiger/desktopPet
- Author: Adriano Petrucci (Adrianotiger) and contributors
- License: MIT License (added to the upstream repository on 2026-10-14; keep this attribution)

### Contributors & Acknowledgments:
- NAudio integration for audio playback
- SignPath Foundation - Open Source Certificate
- Sprites: Oliver, RedSparr0w, Michelle
- Coding: Sergi (Tray Icon), Robin (Graphviz), Zecheriah (Tossing physics), Xhonye (performance & test scripts)

### MIT License Text:

```
MIT License

Copyright (c) 2016-2024 Adriano Petrucci

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. Phaser 3 (3.90.0, pinned locally)

- Project: https://github.com/phaserjs/phaser
- Author: Richard Davey, Photon Storm Ltd.
- License: MIT License

```
MIT License

Copyright (c) 2011-2024 Richard Davey, Photon Storm Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 3. Newtonsoft.Json

- Project: https://github.com/JamesNK/Newtonsoft.Json
- Author: James Newton-King
- License: MIT License

```
The MIT License (MIT)

Copyright (c) 2007 James Newton-King

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 4. Microsoft.Web.WebView2 SDK

- Project: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Publisher: Microsoft Corporation
- License: Microsoft Software License Terms / Microsoft Edge WebView2 SDK Redistributable

Licensed under Microsoft Software License Terms. Permitted for use and redistribution with applications utilizing the Microsoft Edge WebView2 Runtime.

---

## 5. Pixelify Sans Font

- Author: Stefie Justprince
- License: SIL Open Font License, Version 1.1

```
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.
```

---

## 6. Sound Effects (Pixabay / Freesound)

Audio clips used in Cuy are licensed under the **Pixabay Content License** (originals sourced from Freesound), permitting free commercial and non-commercial use:

| File | Context / Trigger | Source / Creator |
| --- | --- | --- |
| `kwik_1.wav`, `kwik_2.wav`, `kwik_3.wav` | Hunger, call, greeting | Guinea Pigs (Breviceps) / Pixabay |
| `mruczenie.wav` | Petting (`purr_pet`) | Guinea Pigs (Breviceps) / Pixabay |
| `cwierkanie.wav` | Baby chirp, happiness | Cute guinea pig (Karola3206) / Pixabay |
| `pisk_strachu.wav` | Fear, fleeing (`flee`) | Angry guinea pig (Karola3206) / Pixabay |
| `pisk_zlosci.wav` | Upset, excessive clicks (`chatter`) | Angry guinea pig (Karola3206) / Pixabay |
| `chrupanie_1.wav`, `chrupanie_2.wav` | Eating | Eating a Carrot / Pixabay |
| `pop.wav` | Popcorning | Happy Pop 2 (floraphonic) / Pixabay |

---

## 7. NAudio

- Project: https://github.com/naudio/NAudio (packages `NAudio.Core`, `NAudio.WinMM`, `NAudio.Wasapi`, version 2.2.1 after task F6-00)
- Author: Mark Heath and contributors
- License: MIT License (https://github.com/naudio/NAudio/blob/master/LICENSE)

Used for sound playback and for the per-session audio peak meters that let the pig dance to music (no audio is recorded).

---

## 8. Open-Meteo and GeoNames (weather data)

- Weather data by Open-Meteo.com: https://open-meteo.com/
- Data licence: Creative Commons Attribution 4.0 (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- City search uses the Open-Meteo geocoding API, which is based on GeoNames (https://www.geonames.org/, CC BY 4.0).
- The free API is for non-commercial use only; Cuy is a free gift and must stay non-commercial while it uses it (see `README.md`, "Weather data").

The attribution link is shown next to the weather in the Home settings.

---

## 9. Tracery (concept and syntax only)

- Project: https://github.com/galaxykate/tracery (Kate Compton), Apache-2.0
- Cuy uses its own implementation (`src/Cuy.Core/Diary/TraceryGrammar.cs`) of the Tracery grammar syntax for the diary; no Tracery code is included.
- Own extensions (not part of Tracery): the `[key:POP]` action and the `lower` modifier.

---

## 10. ZzFX

- Project: https://github.com/KilledByAPixel/ZzFX (Frank Force)
- License: MIT License (https://github.com/KilledByAPixel/ZzFX/blob/master/LICENSE)
- `ZzFXMicro.min.js` (about 1.2 KB) generates the short sound effects in the Home page at runtime (task F4-07).

---

## 11. Chromium (ported logic)

- Project: https://chromium.googlesource.com/chromium/src (`ui/base/fullscreen_win.cc`)
- License: BSD 3-Clause, Copyright The Chromium Authors (https://chromium.googlesource.com/chromium/src/+/main/LICENSE)
- `FullscreenDetector` (task F6-03) is a C# port of the logic of `IsPlatformFullScreenMode` and `IsFullScreenWindowMode` with Cuy changes (desktop shell exclusion, per-monitor test).
  The idea of excluding the desktop shell windows comes from Flow Launcher (no code copied; its licence is unconfirmed).

---

## 12. Velopack (optional, only if the installer is built)

- Project: https://github.com/velopack/velopack, https://docs.velopack.io
- License: MIT License
- Used only for the optional installer and auto-update (tasks F3-03, F7-03). The ZIP package stays the default.

---

## 13. Only if the code is actually copied or used (not part of the build today)

- `ourcade/infinite-jumper-template-phaser3` (MIT, https://github.com/ourcade/infinite-jumper-template-phaser3): the Hay Hop game follows its pattern; add its MIT notice here if code is copied (F5-01).
- NES.css (MIT) and rot.js (BSD-3-Clause): NOT used (decision R1, R10.3); add them here only if that changes.
