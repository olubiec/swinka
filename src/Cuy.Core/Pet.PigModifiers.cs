using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;

namespace Cuy.Core
{
    public sealed partial class Pet
    {
        private NamedPigCatalog _namedPigs;

        public NamedPigCatalog NamedPigs
        {
            get => _namedPigs ?? NamedPigCatalog.Current;
            set => _namedPigs = value;
        }

        public PigModifiers ActiveModifiers
        {
            get
            {
                if (Balance == null || !Balance.PigModifiersActive)
                {
                    return PigModifiers.Neutral;
                }

                if (State?.ActivePigIds == null || State.ActivePigIds.Count == 0 || State.Roster == null || State.Roster.Count == 0)
                {
                    return PigModifiers.Neutral;
                }

                var catalog = NamedPigs;
                if (catalog == null)
                {
                    return PigModifiers.Neutral;
                }

                var list = new List<PigModifiers>();
                int maxActive = Math.Min(State.ActivePigIds.Count, 2);
                for (int i = 0; i < maxActive; i++)
                {
                    string activeId = State.ActivePigIds[i];
                    if (string.IsNullOrEmpty(activeId)) continue;

                    PigProfile profile = null;
                    for (int j = 0; j < State.Roster.Count; j++)
                    {
                        var p = State.Roster[j];
                        if (p != null && string.Equals(p.Id, activeId, StringComparison.OrdinalIgnoreCase))
                        {
                            profile = p;
                            break;
                        }
                    }

                    if (profile == null)
                    {
                        for (int j = 0; j < State.Roster.Count; j++)
                        {
                            var p = State.Roster[j];
                            if (p != null && p.NamedId != null && string.Equals(p.NamedId, activeId, StringComparison.OrdinalIgnoreCase))
                            {
                                profile = p;
                                break;
                            }
                        }
                    }

                    if (profile == null) continue;
                    if (profile.Memorial) continue;
                    if (string.IsNullOrWhiteSpace(profile.NamedId)) continue;

                    var def = catalog.Find(profile.NamedId);
                    if (def != null && def.Modifiers != null)
                    {
                        list.Add(PigModifiers.FromDictionary(def.Modifiers));
                    }
                }

                if (list.Count == 0)
                {
                    return PigModifiers.Neutral;
                }

                return PigModifiers.AverageClamped(list, catalog.ModifierMin, catalog.ModifierMax);
            }
        }
    }
}
