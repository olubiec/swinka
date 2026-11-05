# PK-34a: Logika wyboru muzyki (MusicPolicy.cs) z testami (package, 1 item)
Zmieniaj: src/Cuy.Core/Audio/MusicPolicy.cs, src/Cuy.Core/Audio/MusicSettings.cs, tests/Cuy.Core.Tests/MusicPolicyTests.cs, docs/opt/log/PK-34a.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter FullyQualifiedName~MusicPolicyTests
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: src/Cuy/*, web/*, docs/* (poza logiem), assets/*, waves.yaml, AGENTS.md, SoundPolicy.cs, BrainController.cs
Goal: Czysta logika wyboru muzyki w Core, bez UI i bez odtwarzania. Pulpit (PK-36) i Domek (PK-37) tylko wołają te funkcje.
Depends on: nothing. Źródło faktów: `docs/MUSIC_PLAN.md` sekcje 5.3 (`mix`, `routes`), 5.4 (priorytety), 5.9 (funkcje), 4.8 (5 stanów zużycia), dane `assets/data/music.json` (generowane później przez fale audio; w tym pakiecie nie są potrzebne).
Steps: work the item below. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes.
### Item 1: MusicPolicy and MusicSettings.
- `MusicSettings` (record): `MusicOn = true`, `Volume = 0.6`, `AtNight = false`.
- `PickBed(DateTime now, MusicSettings s)` zwraca id belki: 06-09 `bed_morning`, 09-17 `bed_day`, 17-22 `bed_evening`, 22-06 `bed_night`. Cisza nocna wg `mix.quiet` (22:00-08:00): bez zgody (`AtNight = false`) zwraca `null` w tym przedziale. Z zgodą: 22-06 `bed_night`, 06-08 `bed_morning`. `MusicOn = false` zawsze `null`. Granice: 06:00, 09:00, 17:00, 22:00 (tabela 5.3 jest źródłem; zapisz w logu, jak rozstrzygnięto 06-08 przy zgodzie).
- `Resolve(Context[] stack)`: `Context(string Kind, int Priority, string TrackId, long Seq)`. Najwyższy priorytet gra; przy remisie wygrywa większy `Seq` (ostatnie ustawienie). Pusta lista = `null`.
- Priorytety stałe: minigame 50, record 40, home 30, place 20, desktop 10.
- `Arrangement(stage)`: tabela etapów życia świnki (użyj typu etapu z Core; znajdź go `grep -rn "Senior\|LifeStage" src/Cuy.Core`). `baby` = octave +1, tempo ×1,10, timbre `celesta`; pozostałe etapy = octave 0, tempo 1,0, timbre domyślny.
- `WearChain(string condition)`: parametry z sekcji 4.8 (`mint`, `worn`, `scratched`, `warped`, `cracked`, brak = `mint`). Zwraca trzask dB, wow %, Hz, dolnoprzepust Hz, opcjonalnie crush (tylko `cracked`).
- `RecordTrack(recordId, side, pass)`: zwraca `rec_<id>_<side><pass>`, `side` = `a`/`b`, `pass` = 1/2. Walidacja: pusty id lub zły side/pass rzuca `ArgumentException`.
- `DanceFor(playerId, series)`: dane z `assets/records/players_design.json` (jeśli brak pliku w czasie testu, zwraca `null` i test to sprawdza; nie czytaj całego pliku, tylko klucz używany).
- `ComfortFilter(int comfort)` dla 0-100: dolnoprzepust liniowo 3000 Hz (0) -> 12000 Hz (100); zysk padu 0 dB (0) -> +2 dB (100). Poza zakresem obcinane do 0/100.
- Testy (`MusicPolicyTests.cs`): granice godzin (06:00, 09:00, 17:00, 22:00), noc bez zgody = null, noc z zgodą, pełny ekran nie wpływa tu (to rola pulpitu; test tylko sprawdza, że funkcja nie zwraca belki przy `MusicOn = false`), priorytety i remis, aranżacje dla 5 etapów, 5 stanów zużycia, id płyt (`rec_s1_poranek_a1`), komfort 0/50/100.
Prohibited: no new NuGet packages; do not touch SoundPolicy.cs; no UI, no save code (zapis to PK-35).
Log: write `docs/opt/log/PK-34a.md` (max 10 lines: decisions and why, differences from the plan, anything left undone). No pull request text.
