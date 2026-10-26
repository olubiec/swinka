using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace Cuy.Core
{
    public partial class Pet
    {
        private static readonly Regex _coloringRegex = new Regex("^[01]{1,4096}$", RegexOptions.Compiled);

        public void SaveColoringProgress(string id, string painted)
        {
            if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(painted)) return;
            if (!_coloringRegex.IsMatch(painted)) return;

            if (State.Coloring.Progress.Count >= 300 && !State.Coloring.Progress.ContainsKey(id))
            {
                var firstKey = State.Coloring.Progress.Keys.FirstOrDefault();
                if (firstKey != null)
                {
                    State.Coloring.Progress.Remove(firstKey);
                }
            }

            State.Coloring.Progress[id] = painted;
        }

        public string GetColoringProgress(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            return State.Coloring.Progress.TryGetValue(id, out var painted) ? painted : null;
        }

        public int CompleteColoring(string id, int colourableCells, int paintedOnes)
        {
            if (string.IsNullOrEmpty(id)) return 0;
            if (paintedOnes != colourableCells) return 0;
            if (State.Coloring.Completed.Contains(id)) return 0;

            State.Coloring.Progress.Remove(id);
            State.Coloring.Completed.Add(id);

            int clovers = AwardColoring(colourableCells);

            State.Coloring.LastRewardPictureId = id;
            State.Coloring.LastRewardClovers = clovers;

            return clovers;
        }

        public bool UnlockColoringPack(string packId, int price)
        {
            if (string.IsNullOrEmpty(packId)) return false;
            if (State.Coloring.UnlockedPacks.Contains(packId)) return true;

            if (TryPay(price, "coloring"))
            {
                State.Coloring.UnlockedPacks.Add(packId);
                return true;
            }

            return false;
        }
    }
}
