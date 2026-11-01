using System.Collections.Generic;

namespace Cuy.Core
{
    public partial class GameState
    {
        private Dictionary<string, int> _minigamePlays;

        public Dictionary<string, int> MinigamePlays
        {
            get
            {
                if (_minigamePlays == null) _minigamePlays = new Dictionary<string, int>();
                return _minigamePlays;
            }
            set => _minigamePlays = value;
        }
    }
}
