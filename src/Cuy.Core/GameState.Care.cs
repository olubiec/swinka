namespace Cuy.Core
{
    public sealed partial class GameState
    {
        private Care.CareState _care;
        public Care.CareState Care
        {
            get { return _care ?? (_care = new Care.CareState()); }
            set { _care = value; }
        }
    }
}
