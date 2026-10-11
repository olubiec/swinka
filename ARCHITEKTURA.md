# Architektura eSheep (Świnka na pulpit)

Niniejszy dokument stanowi wyczerpujący opis techniczny i architektoniczny projektu bazowego **eSheep** (`esheep/src/`, licencja MIT), który jest fundamentem dla projektu „Świnka na pulpit”.

---

## 1. Jak zbudować i uruchomić projekt w Visual Studio

### 1.1. Wymagania środowiskowe
*   **Visual Studio 2022 Community** (lub wyższe).
*   Pakiet obciążenia (Workload): **„Programowanie aplikacji klasycznych dla platformy .NET”** (*.NET desktop development*).
*   Zainstalowane składniki:
    *   Obsługa **.NET Framework 4.8** oraz **.NET Framework 4.7.2** Targeting Pack.
    *   Wsparcie dla języka C# 7.0+.

### 1.2. Rozwiązania (Solutions) w repozytorium
W katalogu `esheep/src/` znajdują się dwa pliki rozwiązań:
1.  **`DesktopPet.sln`** – pełne rozwiązanie deweloperskie, zawierające:
    *   Projekt główny `DesktopPet.csproj` (.NET Framework 4.8).
    *   Projekt instalatora `DesktopPet.Package.wapproj` (projekt tworzenia pakietów aplikacji systemu Windows / MSIX Desktop Bridge).
2.  **`DesktopPet_Portable.sln`** – dedykowane, samodzielne rozwiązanie typu *portable/standalone*, zawierające:
    *   Projekt `DesktopPet_Portable.csproj` (kompilujący w pełni funkcjonalny plik wykonywalny `DesktopPet.exe` bez zależności od narzędzi DesktopBridge i specyficznych metadanych Windows Store).

### 1.3. Instrukcja krok po kroku

#### Wariant A: Uruchomienie rozwiązania `DesktopPet.sln`
1.  Otwórz plik `esheep/src/DesktopPet.sln` w programie Visual Studio.
2.  **Przywrócenie pakietów NuGet**: Kliknij prawym przyciskiem myszy na węzeł rozwiązania w Eksploratorze rozwiązań (*Solution Explorer*) i wybierz **„Przywróć pakiety NuGet”** (*Restore NuGet Packages*). Alternatywnie w konsoli menedżera pakietów wykonaj `nuget restore`.
3.  **Projekt startowy i projekt instalatora**:
    *   Jeśli nie masz zainstalowanego składnika Windows Application Packaging Project, projekt `DesktopPet.Package` może zgłosić błąd ładowania. W takim wypadku kliknij na niego prawym przyciskiem myszy i wybierz **„Wyładuj projekt”** (*Unload Project*).
    *   Upewnij się, że projekt **`DesktopPet`** jest pogrubiony jako projekt startowy. Jeśli nie, kliknij na niego prawym przyciskiem myszy i wybierz **„Ustaw jako projekt startowy”** (*Set as Startup Project*).
4.  Wybierz konfigurację: **Debug** lub **Release** oraz platformę **x86** lub **x64**.
5.  Naciśnij klawisz **F5** (lub zielony przycisk **Start**), aby skompilować i uruchomić zwierzaka.

#### Wariant B: Uruchomienie rozwiązania `DesktopPet_Portable.sln` (zalecane dla wersji standalone)
1.  Otwórz plik `esheep/src/DesktopPet_Portable.sln` w Visual Studio.
2.  Przywróć pakiety NuGet (PPM na rozwiązaniu -> *Restore NuGet Packages*).
3.  Wybierz konfigurację **Debug** lub **Release** oraz platformę **x86** (lub **x64**).
4.  Naciśnij **F5**. Plik wykonywalny zostanie zbudowany w:
    `esheep/build/DesktopPetPortable/bin/Debug/DesktopPet.exe` (lub odpowiednio w podfolderze `Release`).

### 1.4. Budowanie z wiersza poleceń (MSBuild)
Możliwa jest również kompilacja bez otwierania interfejsu Visual Studio:
```powershell
# 1. Przywrócenie pakietów NuGet do folderu packages
.\esheep\src\nuget.exe restore .\esheep\src\DesktopPet_Portable.sln -PackagesDirectory .\esheep\src\packages

# 2. Kompilacja za pomocą MSBuild
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" .\esheep\src\DesktopPet_Portable.sln /t:Build /p:Configuration=Debug /p:Platform=x86

# 3. Uruchomienie zwierzaka
.\esheep\build\DesktopPetPortable\bin\Debug\DesktopPet.exe
```

---

## 2. Struktura folderów i najważniejsze klasy

### 2.1. Układ katalogów repozytorium
*   **`esheep/`**:
    *   `src/`:
        *   `dotNet/` – rdzeń silnika zwierzaka (zarządzanie animacjami, oknami, zdarzeniami myszy i Win32 API).
        *   `Portable/` – formularze poboczne (okno opcji `FormOptions2.cs`, okno pomocy `FormHelp.cs`, okno o programie `AboutBox.cs`).
        *   `LocalData/` – klasy definicji XML (`AnimationXML.cs`).
        *   `Resources/` – zasoby domyślne, w tym wbudowany plik `animations.xml` oraz schemat walidacji `animations.xsd`.
    *   `Pets/`:
        *   `esheep64/` – wzorcowy zestaw owcy (zawiera plik `animations.xml` z zagnieżdżonym arkuszem klatek PNG i ikoną w formacie Base64).
    *   `Tools/` – narzędzia pomocnicze do edycji i testowania animacji eSheep (`PetEditor`, `PetTester`).
    *   `build/` – katalog wyjściowy skompilowanych plików binarnych (`DesktopPet.exe`, pliki DLL, pliki PDB).
*   **`swinka/`**:
    *   `swinka_spritesheet.png`, `swinka_animacje.json` – domyślne grafiki i opisy animacji świnki.
    *   `dorosla/`, `maluch/`, `senior/`, `legenda/`, `towarzysz_*/` – arkusze klatek dla etapów życia i towarzyszy.
    *   `ikony/` – ikony przedmiotów, potrzeb i zasobnika systemowego.
    *   `dane/` – pliki konfiguracyjne dla przyszłego mózgu gry (`actions.json`, `items.json`, `symulacja.json`).
*   **`narzedzia/`**:
    *   Skrypty w języku Python do generowania klatek, eksportu arkusza i galerii (`export.py`, `pig.py`, `anims.py`, `anims2.py`, `props.py`).

### 2.2. Najważniejsze klasy i pliki źródłowe

| Plik | Klasa / Struktury | Rola w projekcie |
| :--- | :--- | :--- |
| **`Animations.cs`** | `Animations`, `TAnimation`, `TSequence`, `TMovement`, `TSpawn`, `TNextAnimation`, `TValue`, `TSound`, `TChild` | Przechowuje w pamięci pełne drzewo zachowań zwierzaka wczytane z XML: animacje, prawdopodobieństwa, sekwencje klatek, punkty spawn i przejścia warunkowe. |
| **`Xml.cs`** | `Xml` | Wczytuje i deserializuje `animations.xml` (lub zasób wewnętrzny w przypadku błędu), tnie obrazek PNG na kafelki (`BuildSprites`) i oblicza dynamiczne wyrażenia matematyczne (`ParseValue`). |
| **`FormPet.cs`** | `FormPet` (część 1) | Główne okno zwierzaka oparte na `System.Windows.Forms.Form` bez obramowania (`FormBorderStyle.None`) z przezroczystością. Zawiera pętlę kroków (`NextStep`), logikę wykrywania okien (`FallDetect`) i krawędzi pulpitu. |
| **`FormPet.Motion.cs`** | `FormPet` (część 2) | Rozszerzenie klasy `FormPet` dodające zegar ruchu o wysokiej rozdzielczości (8 ms), fizykę przeciągania (`BeginSmoothDrag`), rzucania (`AdvanceToss`), odbicia od krawędzi i hook Win32 (`SetWinEventHook`) śledzący przesuwane okna. |
| **`MotionTrack.cs`** | `MotionTrack`, `DragVelocity` | Odpowiada za płynną interpolację pozycji klatek oraz buforowanie próbek ruchu kursora w celu wyliczenia wektora siły wyrzutu (`TossForce`). |
| **`ContextMenus.cs`** | `ContextMenus` | Buduje i zarządza menu podręcznym w zasobniku systemowym (tray icon) oraz menu debugowania po kliknięciu prawym przyciskiem na zwierzaka. |
| **`ProcessIcon.cs`** | `ProcessIcon` | Obsługuje kontrolkę `NotifyIcon` na pasku zadań obok zegarka. |
| **`StartUp.cs`** / **`Program.cs`** | `StartUp`, `Program` | Punkty wejściowe do aplikacji. Zarządzają unikalnością instancji (Mutex), parametrami uruchomieniowymi i pętlą `Application.Run`. |

---

## 3. Format `animations.xml`

Format pliku konfiguracyjnego `animations.xml` jest zdefiniowany formalnym schematem XSD w `esheep/src/Resources/animations.xsd`. Plik ten łączy grafikę, dźwięki oraz graf stanów wszystkich zachowań zwierzaka.

### 3.1. Główne sekcje dokumentu XML
```xml
<?xml version="1.0"?>
<animations xmlns="https://esheep.petrucci.ch/">
  <header> ... </header>
  <image> ... </image>
  <spawns> ... </spawns>
  <animations> ... </animations>
  <childs> ... </childs>
  <sounds> ... </sounds>
</animations>
```

#### `<header>` – Metadane
Zawiera węzły: `<author>`, `<title>`, `<petname>`, `<version>`, `<info>`, `<application>` (zawsze wartość `1`) oraz `<icon>` zawierający ikonę ICO zakodowaną w Base64 (wykorzystywaną na pasku zadań).

#### `<image>` – Arkusz klatek (Sprite Sheet)
*   `<tilesx>`: liczba kolumn kafelków na arkuszu (np. 16).
*   `<tilesy>`: liczba wierszy kafelków na arkuszu (np. 11 dla eSheep, 60 dla świnki).
*   `<png>`: surowy obrazek PNG zakodowany jako ciąg znaków Base64 w sekcji `<![CDATA[ ... ]]>`.
*   `<transparency>`: klucz koloru przezroczystości (domyślnie `Magenta`).

#### `<spawns>` – Miejsca pojawienia się
Sekcja określa, gdzie i z jakim prawdopodobieństwem zwierzak ma się pojawić na ekranie:
```xml
<spawns>
  <spawn id="1" probability="20">
    <x>screenW+10</x>
    <y>areaH-imageH</y>
    <next probability="100">1</next>
  </spawn>
  <spawn id="2" probability="80">
    <x>random*(screenW-imageW-50)/100+25</x>
    <y>-imageH-20</y>
    <next probability="100">1</next>
  </spawn>
</spawns>
```
*   `probability`: waga prawdopodobieństwa wylosowania danego spawnu.
*   `<next>`: ID animacji, od której zwierzak ma zacząć po pojawieniu się.

#### `<animations>` – Definicje animacji
Każde zachowanie zwierzaka opisane jest elementem `<animation id="X">`:
```xml
<animation id="1">
  <name>walk</name>
  <start>
    <x>-2</x>
    <y>0</y>
    <interval>200</interval>
    <offsety>0</offsety>
    <opacity>1.0</opacity>
  </start>
  <end>
    <x>-2</x>
    <y>0</y>
    <interval>200</interval>
    <offsety>0</offsety>
    <opacity>1.0</opacity>
  </end>
  <sequence repeat="20" repeatfrom="0">
    <frame>2</frame>
    <frame>3</frame>
    <next probability="90" only="none">1</next>
    <next probability="10" only="taskbar">35</next>
    <next probability="2" only="window">11</next>
  </sequence>
  <border>
    <next probability="100" only="none">2</next>
    <next probability="2" only="vertical">37</next>
  </border>
  <gravity>
    <next probability="100" only="none">5</next>
  </gravity>
</animation>
```

### 3.2. Szczegóły parametrów ruchu i sekwencji

1.  **`<start>` i `<end>` (Interpolacja ruchu)**:
    *   `<x>` i `<y>`: wektor przesunięcia okna w pikselach na pojedynczą klatkę. Jeśli `<start>` i `<end>` różnią się, silnik liniowo interpoluje prędkość w trakcie trwania sekwencji.
    *   `<interval>`: czas wyświetlania pojedynczej klatki w milisekundach (np. `200` ms = 5 FPS).
    *   `<offsety>`: korekta pionowej pozycji okna (przydatna, gdy animacja ma inny punkt bazowy podłogi).
    *   `<opacity>`: przezroczystość okna (od `0.0` do `1.0`).

2.  **Wyrażenia dynamiczne w XML**:
    W polach `<x>`, `<y>`, `<interval>` oraz `repeat` można stosować dynamiczne formuły obliczane przez silnik (klasa `DataTable.Compute` w `Xml.cs`):
    *   `screenW` / `screenH` – pełna szerokość / wysokość ekranu.
    *   `areaW` / `areaH` – szerokość / wysokość obszaru roboczego pulpitu (`WorkingArea`, bez paska zadań).
    *   `imageW` / `imageH` – szerokość / wysokość kafelka zwierzaka.
    *   `imageX` / `imageY` – pozycja nadrzędnego zwierzaka (dla obiektów potomnych `child`).
    *   `random` – liczba losowa z zakresu 0–99 generowana w każdym kroku.
    *   `randS` – liczba losowa 0–99 stała przez cały cykl życia zwierzaka (do następnego spawnu).
    *   `scale` – aktualny współczynnik skalowania interfejsu.

3.  **`<sequence>`**:
    *   `<frame>`: indeks kafelka na arkuszu (numerowany od 0).
    *   `repeat`: liczba powtórzeń sekwencji (może być stała, np. `20`, lub dynamiczna, np. `10+random/10`).
    *   `repeatfrom`: indeks klatki wewnątrz sekwencji, od której następuje zapętlenie (po odegraniu pierwszego pełnego przebiegu).
    *   `<action>flip</action>`: powoduje odwrócenie zwierzaka w poziomie (odbicie lustrzane klatek oraz negacja przesunięcia X).

### 3.3. Przejścia stanów (`<next>`) i warunki (`only`)
Węzeł `<next probability="P" only="WARUNEK">ID_ANIMACJI</next>` definiuje kolejne stany grafu zachowań:
*   **Przejścia sekwencyjne (`sequence -> next`)**: wywoływane po naturalnym zakończeniu wszystkich powtórzeń klatek.
*   **Przejścia krawędziowe (`border -> next`)**: wywoływane natychmiast po napotkaniu krawędzi ekranu, okna lub paska zadań.
*   **Przejścia grawitacji (`gravity -> next`)**: wywoływane, gdy zwierzak znajdzie się w powietrzu bez podłoża pod łapkami.

Flaga `only` (mapowana na typ `TNextAnimation.TOnly`) definiuje warunek środowiskowy:
*   `none` (0x7F) – brak warunku, przejście zawsze dozwolone.
*   `taskbar` (0x01) – tylko gdy zwierzak znajduje się na pasku zadań.
*   `window` (0x02) – tylko gdy zwierzak stoi na krawędzi okna aplikacji.
*   `horizontal` (0x04) – dotknięcie górnej lub dolnej krawędzi ekranu.
*   `horizontal+` (0x06) – dotknięcie poziomej krawędzi ekranu lub krawędzi okna.
*   `vertical` (0x08) – dotknięcie lewej lub prawej krawędzi ekranu.

### 3.4. Specjalne animacje rozpoznawane po nazwie (`<name>`)
W klasie `Xml.cs` (linie 220–229) silnik identyfikuje kluczowe animacje mechaniki gry na podstawie wartości tagu `<name>`:
*   **`drag`**: animacja trzymania zwierzaka kursorem myszy (lewy przycisk wciśnięty).
*   **`fall`**: swobodne opadanie po puszczeniu myszy (gdy siła rzutu jest mała, `TossForce.Length() <= 5`).
*   **`toss`**: lot w powietrzu po dynamicznym rzucie myszką (`TossForce.Length() > 5`).
*   **`fall soft`**: miękkie lądowanie po rzucie z niewielką prędkością pionową (`tossVertVel < 40`).
*   **`fall hard`**: twarde lądowanie (np. uderzenie o ziemię) przy dużej prędkości (`tossVertVel >= 40`).
*   **`kill`**: animacja zamykania aplikacji (stopniowe zanikanie przezroczystości `Opacity -> 0`).
*   **`sync`**: animacja synchronizacji / resetu.

---

## 4. Podział arkusza klatek na kafelki

Za cięcie arkusza sprite'ów odpowiada klasa `Xml.cs` w metodach `ReadImages()` i `BuildSprites(Bitmap spriteSheet)`.

### 4.1. Algorytm wyliczania wymiarów kafelka
W pliku XML w węźle `<image>` zdefiniowane są parametry siatki:
*   `TilesX` – liczba kolumn (np. 16 dla świnki).
*   `TilesY` – liczba wierszy (np. 60 dla świnki).

Wymiary pojedynczego kafelka wyliczane są w `Xml.cs` (linie 529–532):
```csharp
while (image.Width * iScale / AnimationXML.Image.TilesX > 255) iScale--;
spriteWidth = image.Width * iScale / AnimationXML.Image.TilesX;
spriteHeight = image.Height * iScale / AnimationXML.Image.TilesY;
```
> [!NOTE]
> Pętla `while (... > 255) iScale--;` chroni przed przekroczeniem 255 pikseli szerokości kafelka, co w kontrolkach WinForms (`ImageList`) wywołałoby wyjątek przepełnienia bufora.

### 4.2. Przebieg cięcia arkusza (Row-Major Order)
Metoda `BuildSprites` (linie 542–570 w `Xml.cs`) iteruje po obrazku dwoma zagnieżdżonymi pętlami:
1.  Pętla zewnętrzna: wiersze od góry do dołu (`yOffset = 0; yOffset < spriteSheet.Height; yOffset += tileHeight`).
2.  Pętla wewnętrzna: kolumny w danym wierszu od lewej do prawej (`xOffset = 0; xOffset < spriteSheet.Width; xOffset += tileWidth`).

Każdy kafelek jest wycinany i dodawany po kolei do listy `sprites`.
Numeracja kafelków jest 0-bazowana:
$$\text{indeks\_kafelka} = (\text{numer\_wiersza} \times \text{TilesX}) + \text{numer\_kolumny}$$

Dla świnki (`TilesX = 16`):
*   Rząd 0 (idle): klatki 0 do 15.
*   Rząd 1 (sniff): klatki 16 do 31.
*   Rząd 2 (walk): klatki 32 do 47.
*   Rząd $R$: klatki od $R \times 16$ do $(R \times 16) + 15$.

### 4.3. Skalowanie kafelków w stylu Pixel Art
Wewnątrz `BuildSprites`:
```csharp
for(int x = 0; x < spriteWidth / iScale; x++)
{
    for (int y = 0; y < spriteHeight / iScale; y++)
    {
        var pen = spriteSheet.GetPixel(xOffset + x, yOffset + y);
        graphics.FillRectangle(new SolidBrush(pen), new Rectangle(x * iScale, y * iScale, iScale, iScale));
    }
}
```
Kafelki są skalowane algorytmem **Nearest-Neighbor** (piksel po pikselu jako bloki `iScale × iScale`), co gwarantuje zachowanie ostrej, nierozmytej grafiki retro pixel art bez artefaktów interpolacji dwuliniowej.

### 4.4. Lustrzane odbicie klatek
Odbicie w lewo realizowane jest dynamicznie w `FormPet.Motion.cs` w metodzie `GetSprite(int index)`:
Gdy zwierzak idzie w lewo (`spritesFlipped = true`), metoda pobiera kafelek z `imageList1`, wywołuje `image.RotateFlip(RotateFlipType.RotateNoneFlipX)` i zapisuje wynik w słowniku podręcznym `flippedSprites`, aby nie powtarzać operacji.

---

## 5. Wykrywanie zdarzeń, fizyka i interakcje

### 5.1. Pętla animacji
1.  **Główny zegar klatek**: Obiekt `timer1` klasy `System.Windows.Forms.Timer` w `FormPet.cs`.
    *   W każdym cyklu wywoływane jest zdarzenie `Timer1_Tick`, które przekazuje sterowanie do metody `NextStep()` (linie 494–790).
    *   W `NextStep()` następuje:
        *   Wyznaczenie aktualnego indeksu klatki: `pictureBox1.Image = GetSprite(...)`.
        *   Aktualizacja czasu trwania klatki: `timer1.Interval = ...`.
        *   Interpolacja przezroczystości `Opacity` i pozycji pionowej `OffsetY`.
        *   Obliczenie wektora ruchu `(x, y)`.
        *   Detekcja kolizji z krawędziami ekranu i oknami.
        *   Sprawdzenie warunku zakończenia sekwencji (`AnimationStep >= TotalSteps`) i ewentualne przejście do kolejnej animacji.
2.  **Zegar płynnego ruchu (Motion Timer)**: Obiekt `motionTimer` w `FormPet.Motion.cs` (interwał 8 ms, ok. 120 Hz).
    *   Wykorzystuje precyzyjny zegar multimedialny Windows (`winmm.dll timeBeginPeriod(1)`).
    *   Odpowiada za niezależną od FPS klatek interpolację pozycji okna podczas przeciągania, rzucania i śledzenia okien.

### 5.2. Wykrywanie okien i paska zadań

#### Pasek zadań
W metodzie `NextStep()` (linie 632–647):
Obszar roboczy pulpitu pobierany jest przez `ScreenArea` (właściwość `Screen.WorkingArea`, która w Windows automatycznie wyklucza pasek zadań).
Gdy `PositionY + y > ScreenArea.Y + ScreenArea.Height - Height`, silnik wykrywa kontakt z paskiem zadań i wywołuje przejście krawędziowe:
```csharp
int iBorderAnimation = Animations.SetNextBorderAnimation(CurrentAnimation.ID, TNextAnimation.TOnly.TASKBAR);
```

#### Okna aplikacji (Chodzenie po oknach)
Odpowiada za to metoda `FallDetect(int y)` (linie 883–965 w `FormPet.cs`):
1.  Wywołuje funkcję Win32 `NativeMethods.EnumWindows`, aby przejrzeć wszystkie okna najwyższego poziomu.
2.  Filtruje okna niewidoczne (`IsWindowVisible`), zminimalizowane, niemające widocznego paska tytułu (`GetTitleBarInfo`) oraz okna innych zwierzaków (`sTitle == "Sheep"`).
3.  Pobiera prostokąt obrysu okna: `NativeMethods.GetWindowRect`.
4.  Sprawdza kryteria kolizji z górną krawędzią okna:
    *   Zwierzak znajduje się w osi X w granicach okna: `PositionX >= rct.Left - Width / 2 && PositionX + Width <= rct.Right + Width / 2`.
    *   Ruch w dół `y` spowoduje przekroczenie górnej krawędzi okna: `PositionY + Height < rct.Top && PositionY + Height + y >= rct.Top`.
5.  Jeśli okno nie jest przesłonięte przez inne okno na wierzchu (`!CheckTopWindow(false)`), uchwyt zostaje zapamiętany w `hwndWindow`, a zwierzak ląduje na górnej ramce okna (`PositionY = rct.Top - Height`).

#### Śledzenie poruszającego się okna
Gdy użytkownik przesuwa okno, po którym chodzi zwierzak:
Klasa `FormPet.Motion.cs` (linie 45–60) rejestruje hook zdarzeń systemowych Win32:
```csharp
followHook = SetWinEventHook(EventObjectLocationChange, EventObjectLocationChange, IntPtr.Zero, followCallback, process, thread, 0);
```
Przy zdarzeniu `EventObjectLocationChange` (0x800B) wywoływana jest metoda `FollowWindow()`, która natychmiast przesuwa okno zwierzaka wraz z oknem aplikacji.

### 5.3. Przeciąganie myszą (Drag)
Obsługiwane w `PictureBox1_MouseDown` (linie 1109–1120 w `FormPet.cs`):
1.  Kliknięcie LPM na zwierzaku resetuje przypisane okno: `hwndWindow = IntPtr.Zero`.
2.  Włączane są flagi: `IsDragging = true`, `IsTossing = false`.
3.  Metoda `BeginSmoothDrag()` przechwytuje kursor (`pictureBox1.Capture = true`) i zapisuje punkt zaczepienia `dragAnchor = PointToClient(Cursor.Position)`.
4.  Silnik wymusza animację przeciągania: `SetNewAnimation(Animations.AnimationDrag)`.
5.  Ruch myszy (`MouseMove`) wywołuje `UpdateDragPosition`, aktualizując położenie okna i rejestrując próbki czasu i współrzędnych w buforze `dragVelocity`.

### 5.4. Rzucanie zwierzakiem (Toss) i fizyka upadku
Obsługiwane w `PictureBox1_MouseUp` (linie 1190–1224 w `FormPet.cs`):
1.  Po puszczeniu lewego przycisku myszy bufor `dragVelocity` oblicza wektor prędkości rzutu:
    `TossForce = dragVelocity.TossForce(now)`.
2.  **Warunek rzutu**:
    *   Jeśli długość wektora `TossForce.Length() > 5`:
        *   Aktywowany jest tryb rzutu: `IsTossing = true`.
        *   Prędkość pionowa inicjowana jest z wektora: `tossVertVel = TossForce.Y`.
        *   Wymuszany jest interwał 30 ms (`timer1.Interval = 30`), co zapewnia płynną trajektorię.
        *   Uruchamiana jest animacja `SetNewAnimation(Animations.AnimationToss)`.
    *   Jeśli `TossForce.Length() <= 5` (zwierzak został po prostu upuszczony):
        *   Uruchamiana jest zwykła animacja spadania: `SetNewAnimation(Animations.AnimationFall)`.
3.  **Fizyka lotu (`AdvanceToss` w `FormPet.Motion.cs`)**:
    *   Pozycja pozioma: `PositionX += TossForce.X * dt`. Przy uderzeniu o lewą lub prawą krawędź ekranu następuje odbicie sprężyste ze współczynnikiem `-0.3` (`TossForce.X *= -.3f`).
    *   Pozycja pionowa: całkowanie grawitacji $dy = v_y \cdot dt + 0.75 \cdot dt^2$, gdzie prędkość rośnie: $v_y += 1.5 \cdot dt$.
    *   W locie wywoływane jest `FallDetect`, dzięki czemu rzucony zwierzak może wylądować na krawędzi dowolnego okna.
    *   Po wylądowaniu (`land == true`):
        *   `IsTossing = false`.
        *   Jeśli $v_y < 40$, uruchamiana jest animacja `AnimationFallSoft`.
        *   Jeśli $v_y \ge 40$, uruchamiana jest animacja `AnimationFallHard`.

---

## 6. Jak z kodu C# wymusić konkretną animację (na potrzeby Etapu B)

W oryginalnym kodzie eSheep wybór kolejnej animacji odbywa się pseudolosowo wewnątrz metody `SetNextSequenceAnimation` w oparciu o wagi `probability` z pliku XML. Na potrzeby Etapu B (gdzie decyzje o zachowaniu podejmuje Utility AI z biblioteki `SwinkaCore`) konieczne jest mechaniczne sterowanie animacjami z poziomu kodu C#.

### 6.1. Rdzenna metoda zmiany animacji
W klasie `FormPet.cs` (linie 432–487) cała logika przełączania stanu skupiona jest w metodzie:
```csharp
private void SetNewAnimation(int id)
```
Metoda ta:
1.  Przerywa bieżącą sekwencję i resetuje krok: `AnimationStep = -1`.
2.  Pobiera definicję nowej animacji: `CurrentAnimation = Animations.GetAnimation(id)`.
3.  Przelicza dynamiczne parametry: `CurrentAnimation.UpdateValues(DisplayIndex)`.
4.  Odtwarza powiązany dźwięk: `Animations.StartSound(id)`.
5.  Ustawia interwał zegara na pierwszą klatkę nowej animacji: `timer1.Interval = CurrentAnimation.Start.Interval.GetValue()`.

### 6.2. Wymagane modyfikacje w Etapie B

#### 1. Upublicznienie metody lub dodanie dedykowanego API
W `FormPet.cs` należy zmienić modyfikator dostępu z `private` na `public` (lub `internal`) albo dodać dedykowaną metodę fasadową przyjmującą identyfikator lub nazwę animacji:
```csharp
// W FormPet.cs:
public void PlayAnimation(int animationId)
{
    SetNewAnimation(animationId);
}

public void PlayAnimationByName(string name)
{
    foreach (var pair in Animations.SheepAnimations)
    {
        if (pair.Value.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
        {
            SetNewAnimation(pair.Key);
            return;
        }
    }
}
```

#### 2. Przejęcie pętli wyboru kolejnej animacji (zastąpienie losowości)
W metodzie `NextStep()` w `FormPet.cs` (linie 688–750), gdy sekwencja klatek dobiega końca:
```csharp
if (AnimationStep >= CurrentAnimation.Sequence.TotalSteps) // animation over
{
    // Oryginalny kod eSheep:
    // int iNextAni = Animations.SetNextSequenceAnimation(CurrentAnimation.ID, ...);

    // Nowa architektura z SwinkaCore:
    int iNextAni = SwinkaBrain.DecideNextAnimation(CurrentAnimation.ID, IsOnTaskbar, IsOnWindow);
    if (iNextAni >= 0)
    {
        SetNewAnimation(iNextAni);
    }
    ...
}
```
Mózg gry `SwinkaCore` (oparty na Utility AI) zamiast losować animację z wag XML, obliczy pilność potrzeb świnki (głód, zmęczenie, nuda, witamina C) i wskaże odpowiednie ID animacji (np. `eat`, `sleep`, `wheek`, `sniff`).

#### 3. Hierarchia priorytetów (Fizyka vs Mózg AI)
Niezwykle ważne jest zachowanie nadrzędności fizyki pulpitu nad logiką potrzeb:
1.  **Priorytet 1 (Fizyka i Mysz)**: Przeciąganie (`drag`), rzut (`toss`), opadanie (`fall`), brak podłoża (`gravity`) oraz zderzenie ze ścianą ekranu (`border`). Te zdarzenia muszą natychmiast wywoływać `SetNewAnimation` bez pytania mózgu o zgodę (świnka nie może zacząć spać w trakcie upadku z zamkniętego okna ani podczas trzymania jej kursorem w powietrzu).
2.  **Priorytet 2 (Mózg AI)**: Gdy zwierzak bezpiecznie stoi na podłożu (pasku zadań lub oknie) i kończy bieżącą czynność, `SwinkaCore` decyduje o kolejnym stanie.

---

## 7. Weryfikacja działania i test kompilacji

Projekt bazowy eSheep został pomyślnie zbudowany w konfiguracji `Debug|x86` bez modyfikowania kodu źródłowego (`DesktopPet_Portable.sln`).

*   **Pakiety NuGet**: Przywrócono komplet 16 pakietów (m.in. `Newtonsoft.Json 13.0.4`, `System.Text.Json 10.0.11`, `NAudio 1.8.4`).
*   **Wynik kompilacji**: Kompilacja powiodła się bez błędów (0 błędów, ostrzeżenia zgodne z kodem bazowym eSheep).
*   **Plik wykonywalny**: Wygenerowano `esheep/build/DesktopPetPortable/bin/Debug/DesktopPet.exe`.
*   **Test uruchomieniowy**: Proces uruchomiono pomyślnie w systemie Windows (PID 16764) i zweryfikowano jego poprawne działanie na pulpicie.
