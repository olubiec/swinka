namespace Cuy.Core
{
    public partial class Pet
    {
        public bool IsAway { get; private set; }

        public void SetAway(bool away)
        {
            IsAway = away;
        }
    }
}
