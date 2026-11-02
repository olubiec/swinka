# W9-10: Fix vet feature null addEventListener and remove the smoke-test swallow
Goal: the Vet screen no longer throws "Cannot read properties of null (reading addEventListener)" and web-smoke no longer hides it.
Zmieniaj: web/home/features/vet/feature.js, tools/qa/web-smoke.js
Wymagane: web/home/features/vet/feature.js
Weryfikacja: node tools/qa/web-smoke.js
Steps:
1. Find the querySelector that returns null in vet/feature.js and guard or fix it.
2. In tools/qa/web-smoke.js remove the pageerror branch that ignores messages containing addEventListener, and the TODO.
Zakazy: change other existing assertions, new dependencies.
