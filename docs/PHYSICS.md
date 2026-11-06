# Fizyka spadania i lądowania (D3.3)

Stan na wave D3. Źródła: `src/Cuy.Core/Physics/TossPhysics.cs` (kod), `src/Cuy/Resources/animations.xml` (animacje).
Każdy parametr z tabeli ma test w `tests/Cuy.Core.Tests/TossPhysicsTests.cs` lub `AnimationSeamTests.cs`.

Porównanie z oryginalnym eSheep nie zostało wykonane: kod źródłowy eSheep nie jest w repozytorium.
Wartości poniżej są wartościami obecnego kodu i danych; zmieniono je tylko tam, gdzie kod różnił się od tabeli (w tej fali nie było takich różnic).

## Ruch rzutu (TossPhysics.Step)

| Parametr | Wartość | Uwagi | Test |
|---|---|---|---|
| Jednostka czasu | 30 ms | prędkości w px na 30 ms | `Fall_IsIndependentOfTickRate` |
| Krok czasu | dt = min(50, dt_ms) / 30 | pauza dłuższa niż 50 ms liczy się jak 50 ms | `PauseLongerThan50Ms_IntegratesLikeFiftyMs` |
| Zero czasu | brak kroku | `Stepped = false` | `ZeroTime_DoesNotStep` |
| Grawitacja | vy += 1.5 * dt | 1.5 px/30 ms na każdą jednostkę dt | `Gravity_MatchesPhysicsTable` |
| Przesunięcie pionowe | dy = vy * dt + 0.75 * dt² | w kroku 30 ms z spoczynku: 0.75 px | `Gravity_MatchesPhysicsTable` |
| Ruch poziomy | x += vx * dt | bez tarcia w powietrzu | `HorizontalToss_CoversExpectedDistance` |
| Odbicie od krawędzi | vx *= -0.3, pozycja odbita z tym samym współczynnikiem | lewa i prawa krawędź | `LeftEdge_ReversesAndDampsVelocity`, `RightEdge_ReversesAndDampsVelocity` |
| Lądowanie na dole | ground = dół ekranu - wysokość - offset stóp | offset stóp = `Start.OffsetY` animacji | `Landing_WithFootOffset_KeepsFeetOnBottomEdge` |
| Lądowanie na oknie | ground = góra okna - wysokość | okno znika w locie: wraca lądowanie na pasku | `WindowGoneMidFall_LandsOnBar` |
| Miękkie lądowanie | vy po grawitacji < 40 | `FallSoft`; inaczej `FallHard` | `LandingSpeedJustBelow40_IsSoft`, `LandingSpeedOf40_IsHard` |

## Animacje upadku (animations.xml)

| Animacja (id) | Interwał | Klatki | Następnik |
|---|---|---|---|
| fall (5) | 100 -> 40 ms | 4, powtórzenia 20 | sekwencja: 5 (100%); granica ekranu: 20 |
| fall soft (9) | 83 ms | 8 | 25% -> 22, 75% -> 3 |
| fall hard (10) | 100 ms | 8 | 25% -> 22, 75% -> 3 |
| land (20) | 83 ms | 8 | 25% -> 22, 75% -> 3 |

Ciągłość przejść (D3.2): wszystkie 143 przejścia `next` w `animations.xml` mają różnicę OffsetY na szwie <= 2 px (`EveryTransition_KeepsFootOffsetWithinTwoPixels`).

## Otwarte punkty (bez zmiany danych)

- Po twardym upadku (fall hard) nie ma osobnej animacji „obudzenia”: następnik jest taki sam jak po miękkim (22 albo 3). Wymaga decyzji grafiki/designu, nie zmieniono.
- Interwał animacji (83-100 ms) i krok fizyki (30 ms) to dwie różne skale czasu; animacje nie są sterowane krokiem fizyki.
