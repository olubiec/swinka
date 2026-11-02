# Inwentarz grafiki (2.11.2026)

Spis tego, co jest w `assets/`, i tego, czego brakuje. Liczby sprawdzone skryptem na plikach, nie z pamięci. Rozmiar `assets/`: 49 MB (budżet paczki 60 MB).

## Jest (sprawdzone)
| Element | Stan | Gdzie |
|---|---|---|
| Pięć świnek z kolekcji (Ned, Kuki, Glen, James, Racuch) | 5 x 5 etapów (baby, junior, adult, senior, legend), po 60 animacji, arkusze x1 i x2, `animations.json`, `rotation.json` | `assets/sprites/pigs/<id>/<etap>/`, `pigs.json` |
| Świnka generyczna | 5 etapów x 8 kształtów (smooth/teddy/rosette/peruvian x normal/chubby/lean), 60 animacji | `assets/sprites/<etap>/`, `assets/sprites/breeds/<kształt>/<etap>/`, `breeds.json` |
| Towarzysze | agouti, czarno-biała, kremowa (dorosłe) | `assets/sprites/companion_*` |
| Maści | 13 wzorów x 10 palet, 13 stref, palety seniora, 5 nazwanych | `assets/sprites/palettes.json` |
| Obrót | `turn` 0/30/60/90, `turn_smooth` 8 klatek, `idle_34` 4 klatki | `rotation.json` w każdym folderze |
| Ikony 16x16 | 120 (indeksy 0-119), w tym wzory, rasy, cechy, pogoda, odznaki | `assets/icons/icons_16.png`, `icons.json` |
| Dekoracje sklepu | 40 przedmiotów w atlasie | `assets/decor/decor.png`, `decor.json` |
| Dźwięki i muzyka | 10 efektów, 5 utworów | `assets/sounds/`, `assets/music/` |
| Ikona aplikacji, kolorowanki | tak | `assets/app-icon/`, `assets/coloring/` |

## Brak (z `docs/GRAFIKA_KOLEJKA.md`)
| Co | Ile | Uwagi |
|---|---|---|
| Wąsy rexa kędzierzawego (R1) | 1 zestaw x 5 etapów | James ma teraz gładką sierść |
| Głowy wg rasy (R2) | 8 x 5 | teraz wspólna głowa |
| Portrety 128 px (R3) | 5 | ekran Moje świnki, oferty adopcji |
| Ikony pięciu nowych wzorów (R4) | 5 | brindle, magpie, tortoiseshell, belt, blaze_only |
| Ikony pamięci i adopcji (R7) | 4 | świeczka, prezent, spacer, para |
| Ikony świata (S0) | 24 | `assets/world/` w ogóle nie istnieje |
| Rośliny i narzędzia farmy (S1) | ok. 89 elementów | |
| Przedmioty salonu, ogrodu, parku, farmy (S2-S5) | 45 sprite'ów + tła i kafelki | |

Poza grafiką (kod, nie robię): wczytanie `pigs.json`, życie osobne dla każdej świnki, odblokowania, odtwarzanie obrotu, rysowanie dekoracji (kontrakty T1-T10 w `docs/PLAN_GRAFIK_V2.md`).

## Uwagi do świnek
- Ned: serduszko jest po jednej stronie grzbietu, ale z profilu czyta się raczej jako plama.
- James: jednolicie szary, bez rexowych wąsów i bez nakrapiania ze zdjęcia.
- Glen: rozetki i rdzawy pasek poprawione w tej rundzie; ucho bez rdzawej smugi.
- Kuki i Racuch: łaty zgodne z profilem, przodem i tyłem.
