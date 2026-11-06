# Legenda muzyki Cuya (wersja robocza 1, do zatwierdzenia)

Wyprowadzona z `docs/STYL_SWIATA.md`: „ciepły, trochę lofi, vintage'owy domek świnki. Miękko, przytulnie, nic nie krzyczy". Zmienia ją tylko właściciel.

## 1. Home: ambienty w tle
- Delikatne tło, bez wyraźnej melodii na pierwszym planie i bez perkusji. Gracz ma ich nie zauważać, dopóki się nie wsłucha.
- Brzmienia: miękkie pady, pianino lub rhodes, harfa, dzwonki, nylonowa gitara, szum winylu lub taśmy, odgłosy natury w tle (deszcz, świerszcze, wiatr).
- Harmonia: akordy z siódemkami i dziewiątkami, powolne zmiany (jeden akord na 2-4 takty), progresja 8-16 taktów. Pętla o długości co najmniej 1 minuty, najlepiej 2-4 minuty, żeby nie nudziła się w tle.
- Tempo 50-85 BPM albo bez wyraźnego pulsu.
- **Liczba utworów:** wdrożone 15 (rano 3, dzień 5, wieczór 4, noc 3), wybrane przez właściciela. Tło gra w losowej kolejności z puli bieżącej pory; kolejny utwór startuje po zakończeniu poprzedniego.
- Nastrój pory dnia jak w `lights.json`: rano jasno i lekko (różowo), dzień neutralnie, wieczór cieplej i wolniej (pomarańcz), noc chłodniej, ale czytelnie (nie mroczno).

## 2. Gry: styl „jak z Undertale"
- Chiptune / mała orkiestra z syntezatorów: żwawy, trochę zabawny, z wyraźnym motywem melodycznym, który da się zanucić.
- Jedna pętla na grę, tempo 100-150 BPM, długość pętli 1-2 minuty.
- Dozwolone: pulsujący bas, arpeggia, kwaśne „bleep" leady, nagła zmiana tonacji w środku. Zakazane: epicka orkiestra filmowa, metal, EDM, mrok jak w horrorze.

## 3. Zakazy (całość)
Epicka orkiestra filmowa, metal, EDM, kosmos / sci-fi, horror, głośny perkusyjny groove w tle Home.

## 4. Licencja i format
Tylko CC0 lub CC-BY. Ogg Vorbis, pętla bez trzasku (crossfade na szwie: wdrożone dla pętli gier nie zostało, do sprawdzenia uchem), głośność ok. −14 LUFS dla gier, ok. −18 LUFS dla ambientów (cichsze tło).

## 5. Radio
Zmieniarka tła (`web/home/features/music/changer.js`) odblokowuje się, gdy gracz kupi odtwarzacz inny niż startowy. Przycisk ♪ w nagłówku otwiera listę: „Auto” albo konkretny utwór z puli każdej pory. Wybór zapamiętany w `localStorage` (`cuy_music_station`). Gramofon startowy nie odblokowuje zmieniarki.
