using System;

namespace Cuy.Behaviors
{
    /// <summary>
    /// Interface for a desktop behavior plug-in.
    /// </summary>
    public interface IDesktopBehavior
    {
        /// <summary>
        /// The unique ID of this behavior.
        /// </summary>
        string Id { get; }

        /// <summary>
        /// Called when the behavior is starting.
        /// </summary>
        /// <param name="ctx">The context the behavior will use.</param>
        void Start(BehaviorContext ctx);

        /// <summary>
        /// Called on the UI thread, about every 100 ms. Must return fast.
        /// </summary>
        /// <param name="dt">The time elapsed since the last tick.</param>
        void Tick(TimeSpan dt);

        /// <summary>
        /// Called when the behavior is stopping.
        /// </summary>
        void Stop();
    }
}
