# Plan poprawek stylu świata (fala S, 2026-11-03)

Powód: świnki mają własny charakter, a świat (dom, ogród, park, farma, targ, przedmioty) wyszedł generyczny. Ten plan wraca do stylu świnek i przerabia świat tak, żeby było widać, że to jedna gra. Zakres: tylko grafika (`tools/art/`, `assets/`, `docs/`).

## 1. Diagnoza (na podstawie `docs/album/podglad/*.png`)
1. **Paleta.** Świnki: ciepłe, przygaszone, ziemiste. Świat: czyste, nasycone kolory (czerwień i biel markizy, niebo, trawa, różowa sofa, niebieski fotel). Wygląda jak gotowy zestaw stockowy.
2. **Motywy ze sztampy.** Markiza w pasy, obrus w kratkę, drzewo-lizak, rząd tulipanów, klasyczna fontanna, czerwona stodoła, kamienne płyty ścieżki. Żaden przedmiot nie mówi „to świat świnki morskiej".
3. **Fakturę mają tylko świnki.** Świnki mają futro, miękkie przejścia i drobny szum. Świat to płaskie bryły w trzech tonach, jednolity szum trawy, pasmowe niebo. Brak wspólnego kierunku światła i cieni kontaktowych.
4. **Skala i ujęcie.** Sofa ma kilka razy większą skalę niż świnka, podłoga jest z góry (cegła), meble z przodu. Sceny to rozrzucone przedmioty na płaszczyźnie, bez warstw i bez środka kompozycji.
5. **Zbyt regularne.** Wszystko jest generowane kodem: symetria, równe odstępy, równe obramowania. Brak „ręki" (przekrzywione szwy, łatki, zużycie).
6. **Kontur.** Wszystko ma ten sam kontur `#3a1d17`, także tło. Przez to nic nie ma głębi.
7. **Nie widziane w grze.** Wszystko oceniono tylko na arkuszach podglądu, nie w oknie Domku w prawdziwej skali.

## 2. Co zachowujemy
Świnki (arkusze, rasy, portrety) są wzorcem stylu i nie ruszamy ich. Ikony 0-119 (te sprzed paczki finalnej) to drugi wzorzec; ikony 120-160 trzeba do nich dopasować. Dane, rozmiary komórek i ścieżki plików zostają (kontrakt `docs/KONTRAKT_ASSETOW.md`), żeby fala G nie traciła pracy.

## 3. Kierunek stylu (do akceptacji przed S1)
Nazwa robocza: **„domek z siana" (ciepły, miękki, domowy)**.
- **Paleta.** Jedna wspólna paleta główna (ok. 32 kolory) dla całego świata: ciepłe brązy, siano, krem, mech, przygaszona czerwień (jabłko, nie sygnalizacja), brudny róż, dymny błękit. Cienie przesunięte w fiolet/brąz, światła w ciepły żółty. Zakaz czystej czerwieni, czystego niebieskiego i czystej zieleni.
- **Światło.** Zawsze z lewej góry, ciepłe. Każdy przedmiot ma cień kontaktowy w tym samym kolorze.
- **Kontur.** Wybiórczy: przedmioty pierwszego planu mają kontur jak świnki, tło ma kontur tylko tonem ciemniejszym niż własna wypełnka lub wcale. Daje to głębię.
- **Tekstura.** Język „filcu i siana": plecione wiklinowe boki, kartonowe domki, dzianina z widocznym ściegiem, źdźbła siana, łatki, wytarte krawędzie. Miękkie, zaokrąglone rogi, brak ostrych kątów.
- **Motywy własne.** Okrągły „wejściowy łuk" (jak w tunelu i domku świnki) jako powtarzalny element drzwi, okien, bram, straganów. Sylwetka „bochenka" (zaokrąglona, niska) dla mebli i budek. Siano, marchewka, łapka, serduszko-nosek jako ornament. Meble w skali świnki (świnka = jednostka miary).
- **Charakter miejsc** (każde ma własną paletę i jeden „znak rozpoznawczy"):
  - Dom: popołudnie, pokój-gniazdo, ciepłe lampki, dzianina.
  - Ogród: wilgotna zieleń, wiklinowy płotek, tunel z wierzby.
  - Park: duży, spokojny, staw z mostkiem, drzewa o nieregularnych koronach (nie lizaki).
  - Farma: ziemia i słoma, drewniane skrzynki, nie stodoła z pocztówki.
  - Targ: stragany jak kartonowe pudła i skrzynki z warzywami, w skali świnki; plakaty ręczne.

## 4. Fale

### S0. Biblia stylu i próbki (bramka: ocena użytkownika)
- `docs/STYL_SWIATA.md`: zasady z pkt 3, paleta główna w `assets/data/style_palette.json`, lista zakazów i przykłady dobrze/źle.
- 5 próbek wzorcowych rysowanych ręcznie (piksel po pikselu): sofa, tunel z wierzby, stragan, drzewo, kawałek tła ogrodu. Obok nich świnka w tej samej skali.
- **Bramka:** użytkownik ocenia 5 próbek obok świnek. Bez akceptacji nie ma S1. Jeśli kierunek nie trafia, poprawiam S0, a nie 100 plików.

### S1. Narzędzia
- Zmiana sposobu pracy: sprite'y świata rysowane jako ręcznie napisane mapy pikseli z indeksami palety (DSL w `tools/art/handart.py`), a kod służy tylko do powtarzalnych tekstur (trawa, deska, cegła) i do pakowania. Powód: samo generowanie liczbami dało regularność z pkt 1.5.
- `tools/art/style_check.py`: sprawdza zgodność z paletą główną, brak czystych kolorów, limit nasycenia, kontur wg reguł, cień kontaktowy, rozmiary zgodne z kontraktem. Podpięte do `tools/qa`.
- `podglad.py`: każdy podgląd ma świnkę w skali i pasek porównania ze starą wersją.

### S2. Szybka zmiana koloru całego świata
Przemapowanie istniejących 45 przedmiotów, kafelków i teł na paletę główną i nowe zasady konturu. Cel: od razu zmniejszyć „stockowość" zanim narysuję nowe kształty. Test: lint 0 naruszeń.

### S3. Dom (14 przedmiotów, tapety, podłogi)
Przerysowanie meblowych sylwetek w skali świnki: sofa-bochenek, kartonowy domek, wiklinowy kosz, dzianinowa poduszka, regał z półek-skrzynek, lampki, okno z łukiem. Tapety i podłogi z drewnianych desek i dzianiny zamiast cegły. Sypialnia i pokój zabaw jako osobne nastroje.

### S4. Ogród i park (27 przedmiotów, 8 teł, kafelki)
- Tła ręcznie składane w warstwach: niebo (z gradientem w paletowych krokach, bez pasów), dalekie wzgórza bez konturu, żywopłot, grunt z nieregularnymi kępami i kwiatami. Pory dnia przez zmianę palety, nie przez nałożenie koloru.
- Nowe wspólne ikony miejsc: wiklinowy płotek zamiast sztachet, tunel z wierzby, mostek z gałęzi, drzewa o różnych koronach, staw z nieregularnym brzegiem. Altana i fontanna redesign (bez markizy w pasy).

### S5. Farma (grządki, uprawy, sad, narzędzia)
Grządki jako drewniane skrzynki ze słomą, uprawy z lekko nierównym rysunkiem i tym samym światłem co reszta; zamiast czerwonej stodoły: drewniany szopek ze słomianym dachem. Ramki wzrostu zostają (kontrakt), zmienia się wygląd.

### S6. Targ
Stragany jako kartonowe pudła i skrzynki w skali świnki, ręcznie malowane tablice zamiast kolorowych plansz, plakaty z ornamentem łapki.

### S7. Ikony 120-160
Dopasowanie do ikon 0-119: ten sam kontur, ta sama paleta i światło. Bez zmiany indeksów (CSS `--icon-count` bez zmian).

### S8. Spójność z grą
Po wdrożeniu fali G (podpięcie grafiki): zrzuty z okna Domku i pulpitu w prawdziwej skali, porównanie ze świnkami w każdym miejscu, poprawki skali i kontrastu. Wpis w `docs/AUDYT_WIZUALNY_FINAL.md`.

## 5. Kryteria zakończenia
1. Lint stylu: 0 naruszeń na wszystkich plikach `assets/world/`, teł i kafelków.
2. Test porównania: arkusz ze świnką i dowolnym przedmiotem czytelnie wygląda jak jedna gra.
3. Test 5 sekund: po spojrzeniu na zrzut każdego miejsca da się powiedzieć, co to za miejsce i że to świat świnek (użytkownik ocenia).
4. Brak motywów sztampowych z pkt 1.2 (markiza w pasy, kratka, drzewo-lizak).
5. Rozmiar `assets/` w budżecie (60 MB), kontrakt plików bez zmian, testy `check_sprites`, `anim-test`, `palette-test`, `web-smoke` zielone.

## 6. Ryzyka i decyzje użytkownika
- Rysowanie pikseli przez kod nie zastąpi grafika. Jeśli próbki S0 nie trafią w styl, najlepsza dźwignia to referencje użytkownika (zdjęcia, gry, moodboard) albo kilka gotowych szkiców do naśladowania.
- Kolejność: S0 musi być pierwsza, bo reszta zależy od akceptacji kierunku.
- S2 jest niedrogi i może zostać jako tymczasowa poprawka, jeśli S3-S6 będą się przesuwać.
- Fala G (kod) może iść równolegle, bo kontrakt plików się nie zmienia.
