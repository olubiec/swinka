# SwinkaCore: mózg gry

Biblioteka .NET Standard 2.0 (działa z eSheep na .NET Framework 4.8). Nie korzysta z WinForms ani z Win32.
Na razie nie jest podłączona do eSheep (to zrobimy w B2).

## Budowanie i Symulator

```powershell
cd SwinkaCore
dotnet build
.\Symulator\bin\Debug\net48\Symulator.exe 7 --pc 9-17 --opieka
.\Symulator\bin\Debug\net48\Symulator.exe 150 --co 24 --pc 9-17 --opieka
.\Symulator\bin\Debug\net48\Symulator.exe --pomoc
```

Symulator zapisuje stan w `%TEMP%\SwinkaSymulator`, więc prawdziwego zapisu nie dotyka.

## Pliki

| Plik | Co robi |
| --- | --- |
| `Time/IClock.cs`, `ScaledClock.cs`, `ManualClock.cs` | Zegar gry z mnożnikiem (1x, 60x, 1440x); sztuczny zegar do testów |
| `Need.cs`, `Needs.cs` | Sześć potrzeb 0-100, spadek online i offline, Zdrowie |
| `Balance.cs` | Wszystkie liczby balansu w jednym miejscu (z PLAN.md) |
| `LifeStage.cs` | Etapy życia, wiek świnki, odmiana „1 rok / 2 lata / 5 lat” |
| `GameState.cs` | Stan gry zapisywany do JSON |
| `Pet.cs` | Upływ czasu, zdarzenia, więź, koniczynki, ekwipunek, album, pamiętnik |
| `Save/SaveSystem.cs`, `Save/AutoSaver.cs` | save.json + save.bak, zapis co 60 s |
| `GameSession.cs` | Wszystko razem: tego użyje eSheep |

## Jak użyć w aplikacji (B2)

```csharp
var session = GameSession.Open(new ScaledClock(TimeMultipliers.Normal));
session.Pet.NeedLow += (s, e) => { /* kwiczenie */ };
session.Start();      // nalicza czas offline, zgłasza zaległe zdarzenia
// co ~1 s w wątku UI:
session.Tick();       // potrzeby + zapis co 60 s
// przy zamknięciu:
session.Close();
```

## Zasady liczenia

- Spadek na godzinę: najedzenie 8, witamina C 4, energia 6, humor 5, czystość 0 (będzie zależeć od bobków, B4), ząbki 2.
- Offline (aplikacja zamknięta): spadek 3x wolniejszy, nie poniżej 20; energia rośnie jak w czasie snu.
- Przerwa w `Update` dłuższa niż 5 min czasu realnego (np. uśpiony laptop) też liczy się jak offline.
- Zdrowie = połowa średniej + połowa najniższej potrzeby.
- Etap życia według wieku świnki (1 dzień realny = 21 dni świnki): Młodzik od 1. dnia, Dorosła od 8,7, Senior od 69,6, Legenda od 139,1.
- Więź: próg poziomu n = 15·n·(n−1)/2 punktów, limit 30 punktów dziennie.
- Zapis: najpierw `save.tmp`, potem `File.Replace` podmienia `save.json`, a poprzedni plik staje się `save.bak`.
  Gdy `save.json` jest uszkodzony, stan wczytuje się z `save.bak`, a zły plik zostaje jako `save.uszkodzony.json`.
