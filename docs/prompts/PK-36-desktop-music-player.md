# PK-36: Odtwarzacz muzyki na pulpicie (NVorbis) i most z Domkiem (package, 1 item)
Zmieniaj: src/Cuy/dotNet/MusicPlayer.cs, src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/SoundManager.cs, src/Cuy/dotNet/HomeWindow.cs, src/Cuy/Cuy.csproj, THIRD_PARTY_NOTICES.md, docs/opt/log/PK-36.md
Wymagane: src/Cuy/dotNet/SoundManager.cs, src/Cuy/dotNet/HomeWindow.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: src/Cuy.Core/* (poza odczytem), web/*, tests/*, assets/*, waves.yaml, AGENTS.md
Goal: Belka pulpitu gra z plików OGG przez NVorbis (MIT). Zależność jest zatwierdzona w `docs/MUSIC_PLAN.md`, tabela decyzji, wiersz 5 („tak, własny tor C#”). Jedyna nowa zależność w tej fali.
Depends on: PK-34a, PK-35. Test ręczny wymaga plików OGG z fal audio (po G2); sam build nie wymaga plików.
Steps: work the item below. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes.
### Item 1: MusicPlayer i wpięcie.
- Dodać pakiet NuGet `NVorbis` (wersja stabilna z MIT, zapisz numer w logu) do `Cuy.csproj`; dopisać jego licencję MIT do `THIRD_PARTY_NOTICES.md`.
- `MusicPlayer.cs`: `Play(trackId)`, `Stop(fade)`, `SetVolume`, `Duck()`. Odczyt OGG przez NVorbis do strumienia PCM, osobny `WaveOutEvent`, pętla z punktów z `music.json`, fade 1500 ms. Ścieżki z `music.json` (parser jak reszta danych). Brak pliku = ostrzeżenie w logu, bez wyjątku.
- `BrainController.cs`: timer 60 s wybiera belkę przez `MusicPolicy.PickBed`; `null` = stop belki. Wyłączenie przy pełnym ekranie i uśpionej świnice (wyciszenie w 20 s) zgodnie z 5.6.
- `SoundManager.cs`: `Play` wołając `MusicPlayer.Duck()` dla `wheek`, `purr`, `crunch`, `pop`.
- `HomeWindow.cs`: wiadomości mostu z 5.6: Domek -> pulpit `music` `home_open`/`home_close`; pulpit -> Domek `jingle` (przekazanie tylko w tym pakiecie: przekaż dalej zdarzenie, nie zmieniaj logiki jingla), `stage`, `suppress`. Jedyny edytor `HomeWindow.cs` w fali.
Prohibited: no other new dependencies; no change to existing SFX playback behaviour; no edits to web files.
Log: write `docs/opt/log/PK-36.md` (max 10 lines: NVorbis version, decisions, differences from the plan, anything left undone). No pull request text.
