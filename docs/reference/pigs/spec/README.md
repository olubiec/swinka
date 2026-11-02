# Specyfikacje wyglądu pięciu świnek (A0)

Wygenerowane przez `tools/art/ref_spec.py` ze zdjęć właściciela (`docs/reference/pigs/*.jpg`). Pliki:
- `<id>.json`: typ włosa, proporcje, układ łat (`layout`), lista kontrolna cech (`checklist`, używana w kryteriach przyjęcia A1-A8), próbki kolorów regionów (`regions`: rampa 4 odcieni jasny -> ciemny i paleta k-means), pewność (`confidence`).
- `<zdjęcie>_regions.png`: zdjęcie z zaznaczonymi regionami próbkowania (do kontroli).
- `regions.json`: same rampy regionów (dla testów kolorów, CIEDE2000 w `tools/art/colorlab.py`).

Ograniczenia:
- Kolory zawierają oświetlenie zdjęcia (ciepłe światło, ciemne ujęcia). Służą do relacji barw i odcienia, nie jako dokładne cele. Przy porównaniu ze sprite'em kolory korygujemy balansem bieli względem białych regionów tej samej fotografii.
- Układ łat jest opisany słowami i z regionów; widoki bez zdjęcia (tył Neda, przód Jamesa, bok Glena) to konwencja, oznaczona w `confidence`.
- Zdjęcie `racuch_03_scale_848g` nie jest w specyfikacji (możliwa druga świnka).

Odkrycia, które zmieniają obecne sprite'y:
- **Kuki:** z góry (nowe zdjęcie `kuki_03_topdown`) cztery pasy: ruda głowa i barki, CIEMNY pas za barkami, RUDA łata na biodrach (tu siedzą dwie rozetki, złote w świetle), ciemny brąz zadu; przejścia to miękkie gradienty z mieszanych włosów, nie linie.
- **Ned:** brąz obejmuje uszy, oczy, boki głowy aż do szyi i pas na karku/barkach, biała jest łysina, policzki i broda; "serce" ledwo widać (domysł).
- **Racuch:** czarne siodło to szeroki pas przez środek grzbietu z falistym brzegiem, nie plama; biały czubek zadu; czarna plama za okiem.
- **James:** czysty szary pieprz i sól (jasne włosy równomiernie), ciemny pyszczek, bez łat.
- **Glen:** całkiem czarny, bryłę widać tylko po kępach i połysku; rudy pasek w uchu i smuga na boku.
