# Kontrakt muzyczny (MW-0, PM-01)

Zamrożony po MW-0. Zmiany tylko przez PM-01b (poprawka) z wpisem w `docs/opt/log/` lub w tabeli zmian poniżej. Wszystkie pakiety MW-1…MW-8 pracują na tych nazwach.

## 1. Format audio

- `numpy.float32`, kształt `(2, n)`, 44 100 Hz, zakres ±1,0.
- Jingle mono: suma kanałów przy kodowaniu (bez zmiany długości).
- Wyjście końcowe: OGG, master LUFS wg specyfikacji, szczyt ≤ −1 dBTP.

## 2. Funkcje

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `voices.render` | `render(voice, midi, dur_s, vel, sr, rng) -> ndarray` | jeden dźwięk; `voice` z palety (`docs/music_prompts/README.md`, sekcja 1) |
| `fx.apply` | `apply(chain, audio, sr) -> ndarray` | `chain` = lista `{"fx": "REV-M", "wet": 0.16}` |
| `sequencer.build` | `build(spec) -> {layer: ndarray}` | audio na warstwę (do stemów i dB) |
| `finish.finish` | `finish(audio, spec) -> path` | zawinięcie ogona, zerowe przejście, LUFS, limiter −1 dBTP, OGG |
| `motif` | `motif(key, mode, style)` | motyw Cuy i podpis (MT-06) |

## 3. Zdarzenia

- Nutowe: `{t_beats, dur_beats, midi, vel, voice, layer}`.
- Perkusyjne: `{t_steps, inst, vel}` (`inst` ∈ `KICK, SNR, BRSH, HAT, SHK`; siatka 16 kroków na takt 4/4, 12 dla 3/4 i shuffle).

## 4. Słownik wzorów (`pattern`)

Wartość pola `layers[].pattern` musi pasować do jednej z form (walidator sprawdza regex):

- `bass.root_fifth`, `bass.walking`, `bass.bossa`, `bass.octave8`, `bass.oom`, `bass.pedal2bars`
- `chords.offbeat_2_4`, `chords.arp8`, `chords.bossa`, `chords.stab_i2_i4`, `chords.oompa`, `chords.sustain`
- `orn.every_n_bars(n, beat)`
- `random.pentatonic_walk`
- `melody.skeleton`
- `noise.loop(file, db)`

Dodane w MW-0 (poza listą z `MUSIC_WAVES.md` §3): `chords.sustain` (warstwa PAD, jeden akord na takt) i `melody.skeleton` (warstwa melodii grana z szkieletu A/B z `theory.py`). Oba są potrzebne katalogowi (`catalog_loops.py`).

## 5. Specyfikacja utworu

Plik `tools/music/specs/<id>.json`. Pola obowiązkowe (pełny opis w `spec.schema.json`):

| Pole | Typ | Uwagi |
| --- | --- | --- |
| `id` | `[a-z][a-z0-9_]*` | równe nazwie pliku |
| `kind` | `theme, bed, place, room, minigame, record, jingle, noise` | |
| `title`, `role` | tekst | `role` opcjonalne |
| `bpm`, `meter` (3/4), `key`, `mode`, `bars`, `swing` (50–75), `seed` | liczby | |
| `chords[]` | `{bar, sym}` | pierwszy akord w takcie 1, numery rosną; akord trwa do następnego |
| `layers[]` | `{role, voice, db, pattern, part?, from_bar?, register?, stem?}` | `stem` ∈ `base, rhythm, lead` |
| `drums` | `null` lub `{kit, levels}` | `levels` tylko dla kodów perkusji |
| `fx[]` | `{fx, wet?, on?}` | `on`: `all` (domyślnie) lub kod głosu |
| `master` | `{lufs, ceiling_dbtp: -1}` | `lufs` w −24…−12 |
| `loop` | `{enabled, start_s?, end_s?}` | `start_s < end_s`; dla miejsc z `loopStart/loopEnd` |
| `stem_of` | `null` lub `id` innej specyfikacji | wariant pochodny (np. `_full`) |

Specyfikacje zaczynające się od `_` (np. `_example_bed.json`) są przykładami. Generatory (`build_manifest.py`, `render.py` w pełnej serii) je pomijają.

## 6. CLI

```
python3 tools/music/validate_spec.py [id ...]   # bez argumentów: wszystkie specs/*.json
python3 tools/music/render.py <id>              # jeden utwór lub wszystkie jego pliki (MW-1+)
node tools/qa/music-audit.js [--only id ...]    # MT-09
python3 tools/music/gen_prompts.py              # prompty z katalogów
```

Walidator wymaga `pip install jsonschema`. Kod wyjścia: 0 poprawne, 1 błędy, 2 brak zależności.

## 7. Zmiany kontraktu

| Wersja | Zmiana | Powód |
| --- | --- | --- |
| MW-0 | dodano `chords.sustain`, `melody.skeleton` do słownika wzorów | warstwy PAD i melodii z katalogu |
| MW-1 (PM-03) | efekty `PAN(p)` i `WIDTH(w)` w łańcuchu `fx` | panorama warstw i szerokość stereo (MT-04) |
| MW-1 (PM-02) | zanik głosów = T60 (czas spadku o 60 dB), `dur_s` nie skraca zaniku | jednoznaczne znaczenie pola w `voices.py` |
