PK-P5b: Status: BLOCKED (4 pre-existing Core tests fail on MessageValidator/IMessageRuleSet outside Zmieniaj).
Decyzje: kept existing .btn-toggle-active alongside new .btn-pin-toggle and .desktop-pet-toggle/.chk-desktop-pet in pigs/feature.js; used --ui-* vars in feature.css; added places.pigPin & pigs.desktopPet mocks in pigs/mock.js; fixed ux-p5-pin.js mock state helper (bridge.currentState + broadcastState instead of nonexistent bridge.setState).
API/pola: places.pigPin { pigId, pinned }; pigs.desktopPet { pigId, on } (max 2 active, toast "Max 2 pigs on desktop", min 1); Rules already in PlacesMessages.cs & PigsMessages.cs.
JS verification: node --check passed; node tools/qa/ux-p5-pin.js passed P1-P8.
BLOCKED Core tests (15 passed, 4 failed in PigPinMessagesTests.cs; existing assertions not altered per rules):
- PlacesPigPin_UnknownField_IsInvalid & PigsDesktopPet_UnknownField_IsInvalid: Assert.True(res.IsInvalid) False (MessageValidator.cs does not reject unknown fields).
- PlacesPigPin_VeryLongPigId_IsInvalid & PigsDesktopPet_VeryLongPigId_IsInvalid: Assert.True(res.IsInvalid) False (tests use length 100, FieldRule.Id in IMessageRuleSet.cs has maxLen=128).
