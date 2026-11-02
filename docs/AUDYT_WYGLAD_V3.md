# Audyt wyglądu V3 (fale A0-A8)

Stan na 2026-11-02. Plan: `docs/PLAN_WYGLAD_V3.md`, research: `docs/RESEARCH_WYGLAD_V3.md`, panele "zdjęcie | sprite": `docs/album/compare/<id>.png` (`tools/art/compare_named.py`).

## Co jest zrobione
| Fala | Wynik |
| --- | --- |
| A0 | `colorlab.py` (CIEDE2000 zgodny z danymi Sharmy, k-means w Lab), `ref_spec.py`, `docs/reference/pigs/spec/` (specyfikacje, listy cech, rampy regionów), trzecie zdjęcie Kukiego (cztery pasy) |
| A1 | `coatgen.py`: wzór w przestrzeni modelu, szum, warping, dither o progu stałym na powierzchni; sloty Q0-Q3 z rampami pięciu świnek; strefy wzorów generycznych z organicznym warpingiem |
| A2 | `fur.py`: kępy zależne od rasy (teddy, rex, rosette, peruvian), światło krawędziowe, obrys selektywny (sel-out) dla pięciu świnek |
| A3 | `whorls.py`: wir (promienie o różnej długości, jasny środek) + grzebień między wirami; Kuki ma złote rozetki na ciemnym zadzie |
| A4 | częściowo: uszy, pyszczek, łysiny i oczy per świnka; patrz "Nie zrobione" |
| A5 | arkusze pięciu świnek `assets/sprites/pigs/<id>/<stage>/` (5 etapów, baked, bez remapu) + `pigs.json`, `tools/art/export_named.py` |
| A6 | pięć nowych wzorów generycznych (`brindle`, `magpie`, `tortoiseshell`, `belt`, `blaze_only`), wszystkie kształty zregenerowane z sierścią i rozetkami; `palettes.json` ma 99 + 50 id |
| A8 | `verify_palettes`: 0 różnic; `check_sprites` bez błędów; `anim-test`, `palette-test`, `web-smoke` OK |

## Ocena per świnka (uczciwa)
| Świnka | Ocena | Uwagi |
| --- | --- | --- |
| Racuch | dobra | siodło, biały czubek, łysina i plama przy uchu czytelne; siodło tylko na grzbiecie (zdjęcie z góry pokazuje szerszy pas) |
| Kuki | dobra | ruda przód, ciemny zad, dwie złote rozetki rozpoznawalne; ruda łata na biodrach i ciemny pas z góry słabo widoczne z boku; granica ruda/ciemna wciąż dość pionowa mimo miękkiego dithera |
| Glen | dobra | czarna bryła czyta się po połysku i kępach, rudy pasek w uchu i smuga na boku, czarne łapki (poprawka po uwadze właściciela); wiry tylko jako połysk |
| James | dobra | jednolity szary na ciele i pyszczku (poprawka po uwadze właściciela), sierść tylko fakturą; brak kręconych wąsów (rex) |
| Ned | dobra | brąz na uszach, oczach i barkach, biały pysk; serce po jednej stronie grzbietu, ukośnie (poprawka po uwadze właściciela), przy 64 px czyta się jako ukośna plama w kształcie serca |

## Nie zrobione / słabe
- **A4:** kręcone wąsy rexa, osobne kształty głów per rasa.
- **A7:** portrety 128 px pominięte (po A5 w 64 px nadal czytelne; decyzja do ponownej oceny przy karcie kolekcji).
- Rozetki na maściach generycznych: słabo widoczne (brak zmiany koloru w wirze, tylko światło).
- Ikony dla pięciu nowych wzorów generycznych nie narysowane.
- Album (`docs/album/index.html`) nie zregenerowany po V3 (ciężki, 12 MB); panele porównawcze `docs/album/compare/` są aktualne.
- Test migotania (różnice klatek tylko tam, gdzie ruszyła się bryła) nie wykonany jako automatyczny; kotwiczenie w współrzędnych modelu zapewnia stabilność z konstrukcji.
- Kryteria liczbowe z planu (IoU łat, deltaE) nie policzone; ocena na przeglądzie paneli.
- Rozmiar `assets/sprites`: 38 MB (plan zakładał do 30 MB); +15 MB to arkusze pięciu świnek w x1 i x2.
- `dotnet test` i uruchomienie `Cuy.exe` nie są możliwe w tej sesji.

## Kontrakt dla kodu (poza zakresem grafiki)
Loader musi znać `assets/sprites/pigs/pigs.json` (arkusz per świnka, bez `palettes.json`) obok `breeds.json`; reszta kontraktów T1-T10 w `docs/PLAN_GRAFIK_V2.md`.
