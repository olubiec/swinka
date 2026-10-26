using System;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private DecorState _decor;

        public DecorState Decor
        {
            get
            {
                if (_decor == null)
                {
                    _decor = new DecorState();
                }
                if (_decor.Equipped == null)
                {
                    _decor.Equipped = new System.Collections.Generic.Dictionary<string, string>();
                }
                return _decor;
            }
            set => _decor = value;
        }

        public void EquipDecor(string slot, string itemId)
        {
            if (string.IsNullOrEmpty(slot))
                return;

            if (slot != "wallpaper" && slot != "floor" && slot != "rug" && slot != "plant" && slot != "picture" && slot != "lamp")
            {
                throw new ArgumentException("Unknown decor slot", nameof(slot));
            }

            Decor.Equipped[slot] = itemId;
        }

        public void UnequipDecor(string slot)
        {
            if (string.IsNullOrEmpty(slot))
                return;

            if (slot != "wallpaper" && slot != "floor" && slot != "rug" && slot != "plant" && slot != "picture" && slot != "lamp")
            {
                throw new ArgumentException("Unknown decor slot", nameof(slot));
            }

            Decor.Equipped[slot] = null;
        }
    }
}
