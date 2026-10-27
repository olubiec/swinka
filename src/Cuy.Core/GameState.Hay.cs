namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private double? _hayRack;

        public double HayRack
        {
            get
            {
                if (!_hayRack.HasValue)
                {
                    _hayRack = 60.0;
                }
                return _hayRack.Value;
            }
            set
            {
                _hayRack = value;
            }
        }
    }
}
