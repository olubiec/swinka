namespace Cuy.Core
{
    public partial class Pet
    {
        private BondUnlocks _bondTable;

        public BondUnlocks BondTable
        {
            get
            {
                if (_bondTable == null) return BondUnlocks.Current;
                return _bondTable;
            }
            set
            {
                _bondTable = value;
            }
        }

        public bool IsUnlocked(string id)
        {
            return BondTable.IsUnlocked(id, State.Bond.Level);
        }

        public BondUnlock NextUnlock()
        {
            return BondTable.Next(State.Bond.Level);
        }
    }
}
