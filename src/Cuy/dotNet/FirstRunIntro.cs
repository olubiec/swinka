using System;

namespace Cuy
{
    /// <summary>
    /// First start of a new game: the pig stands on the taskbar hidden behind the left screen edge and shows
    /// only its nose. When the cursor comes close it hides; when left alone for a while it shows more of its head
    /// and finally walks out and lives as usual. A few seconds later Home opens for naming and the tutorial.
    /// </summary>
    internal sealed class FirstRunIntro
    {
        public static void Start(Action onDone)
        {
            var intro = new EdgePeekScene(EdgeSide.Left, onDone, firstRun: true);
            intro.Start();
        }
    }
}
