using Cuy.Core.Coloring;

namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private ColoringState _coloring;

        public ColoringState Coloring
        {
            get
            {
                if (_coloring == null)
                {
                    _coloring = new ColoringState();
                }
                return _coloring;
            }
            set => _coloring = value;
        }
    }
}
