# Cuy

A pixel art guinea pig for the Windows desktop. It walks on the taskbar and on windows, has needs like a Pou-style pet, and grows up at the pace of a real guinea pig. A gift project, built with AI agents.

| What | Where |
| --- | --- |
| Project plan, stages and prompts (Polish) | `PLAN.md` |
| Rules for AI agents | `RULES.md`, `CLAUDE.md` |
| Architecture | `ARCHITECTURE.md` |
| Art (60 animations x 7 variants, icons), sounds and game data | `assets/` |
| Desktop app (C#, .NET Framework 4.8, based on eSheep, MIT) | `src/Cuy/` |
| Game logic (.NET Standard 2.0) and tests | `src/Cuy.Core/`, `tests/` |
| Home window and minigames (HTML/JS) | `web/home/` |
| Build, packaging and art tools | `tools/` |
| Licences | `THIRD_PARTY_NOTICES.md` |

Build and test: `powershell -ExecutionPolicy Bypass -File tools/build.ps1`. Manual release checklist: `TESTING.md`.
