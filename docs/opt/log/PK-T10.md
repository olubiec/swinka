# PK-T10 Log
- Cases: 10 PASS (S1-S9 pass on verification run; S10 salon indoor lamps pass, outdoor fixture overlap fixed), 0 DEFECT, 0 SKIP.
- Decisions: Embedded 6 legacy save fixtures (v1 minimal, v1 Polish item/counter keys, v1 legacy decor, v2 unnamed starter pig room, v2 memorial/null collections, v99 future fields) directly in S1 plus optional `Fixtures/*.json` scan per R34 section 7.
- Decisions: Used `Pet.WorldItemCatalog` property initializer instead of constructor parameter (constructor takes `(state, clock, balance)`).
- Verification: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~NewFeaturesAdversarial"` ran twice (limit 2).
