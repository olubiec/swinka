using System;
using System.Collections.Generic;
using System.Drawing;

namespace Cuy.Core.Physics
{
    /// <summary>
    /// Chooses the window a falling pet lands on. Pure geometry: FormPet supplies the window rectangles
    /// (possibly cached during a toss) and answers the live "is covered" question for one window.
    /// </summary>
    public static class FallWindowPicker
    {
        /// <param name="windows">Window rectangles in Z-order (top first).</param>
        /// <param name="petX">Pet X position.</param>
        /// <param name="petY">Pet Y position.</param>
        /// <param name="petWidth">Pet width.</param>
        /// <param name="petHeight">Pet height.</param>
        /// <param name="stepY">Vertical movement for the next step.</param>
        /// <param name="screenTop">Top of the working area.</param>
        /// <param name="isCovered">Called only for windows the pet would land on; true if another window is over it.</param>
        /// <returns>Index of the first window the pet lands on and that is not covered, or -1.</returns>
        public static int Pick(IList<Rectangle> windows, double petX, double petY, int petWidth, int petHeight,
                               int stepY, int screenTop, Func<int, bool> isCovered)
        {
            for (int i = 0; i < windows.Count; i++)
            {
                Rectangle r = windows[i];
                double feet = petY + petHeight;
                if (feet < r.Top && feet + stepY >= r.Top &&
                    petX >= r.Left - petWidth / 2 && petX + petWidth <= r.Right + petWidth / 2 &&
                    petY > 20 + screenTop)
                {
                    if (!isCovered(i)) return i;
                }
            }
            return -1;
        }
    }
}
