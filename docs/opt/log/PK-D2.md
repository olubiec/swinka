Status: DONE
Decisions: PropsMessages implements IMessageRuleSet (reflection-loaded) and provides static Validate(type, JObject) for [0,1] doubles, NaN/Infinity rejection, [-1,200] ints, and 1..64 string ids.
Decisions: PropsFeature holds session List<DesktopProp>, exposes PropsChanged event + CurrentProps for PK-CS3, handles props.{place,move,remove,toRoom,fromRoom} and prop_* aliases, and calls pet.Count("props_placed").
Decisions: PropsMessages.Validate validates message schema/types/ranges without rejecting unknown catalog itemIds so PK-T19 range tests with arbitrary itemIds work; PropsFeature/DesktopPropOps enforces catalog ownership.
API: PropsMessages (Rules, Validate), PropsFeature (Id="props", PropsChanged, CurrentProps, AddState, HandleMessage), docs/contracts/props.md.
Stubs: None (Pet.Count, DesktopPropCatalog, DesktopPropOps, HomeWindow already exist).
Tests: PropsMessagesTests (7/7 passed); Cuy.csproj Release build succeeded (0 warnings, 0 errors).
