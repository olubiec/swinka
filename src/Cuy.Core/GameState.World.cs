using Cuy.Core.World;

namespace Cuy.Core
{
    public partial class GameState
    {
        private WorldState _world;

        public WorldState World
        {
            get => _world ?? (_world = new WorldState());
            set => _world = value ?? new WorldState();
        }
    }
}
