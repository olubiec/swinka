# PK-34b: silnik WebAudio i dyrygent (log)
- Wykonano: web/home/music-engine.js, web/home/music-director.js, web/home/mocks/music-engine.mock.js (nowy katalog mocks), tools/qa/music-engine-test.js.
- Weryfikacja: node --check (3 pliki) + `node tools/qa/music-engine-test.js` -> MUSIC ENGINE TEST OK.
- Silnik: stemy startują na jednym czasie ctx.currentTime+0,1 s; wejście stemu = rampa gain w `enter` sekund; pętla przez loopStart/loopEnd; crossfade 1500 ms; ducking -5 dB w 40 ms, powrót po 400 ms; filtr nocny lowpass 1800 Hz (otwarty 20000 Hz).
- Dyrygent: priorytety 50/40/30/20/10 jak w 5.4; remis = późniejszy setContext; stopHome() usuwa kontekst domku (zostaje tylko desktop).
- Decyzja: klucze kontekstu `minigame:<id>`, `record:<id>`, `place:<id>`, `home.view:<widok>` mapowane przez trackFor (routes z music.json albo domyślne reguły).
- Różnice względem planu: brak wear/EQ płyt w silniku (to PK-38a, osobny graf); brak obsługi visibilitychange (zostaje w PK-37).
- Nie ruszono music.js, app.js ani żadnego widoku.
