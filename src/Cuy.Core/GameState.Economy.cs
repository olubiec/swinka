using Cuy.Core.Economy;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private EconomyState _economy;

        public EconomyState Economy
        {
            get
            {
                if (_economy == null)
                {
                    _economy = new EconomyState();
                }
                return _economy;
            }
            set
            {
                _economy = value;
            }
        }
    }
}
