using System;

namespace Cuy.Behaviors
{
    /// <summary>
    /// Context passed to a desktop behavior when it starts.
    /// </summary>
    public sealed class BehaviorContext
    {
        /// <summary>
        /// The logical pet instance, from the GameSession. Set by the BehaviorHost.
        /// </summary>
        public Core.Pet Pet { get; }

        /// <summary>
        /// The visual pet form. Set by the BehaviorHost.
        /// </summary>
        public FormPet ActivePet { get; }

        /// <summary>
        /// The global brain controller. Set by the BehaviorHost.
        /// </summary>
        public BrainController Brain { get; }

        /// <summary>
        /// Action to write to the application log. Set by the BehaviorHost.
        /// </summary>
        public Action<string> Log { get; }

        /// <summary>
        /// Whether the pig is currently busy (e.g. script, drag, toss, sulk). Set by the BehaviorHost.
        /// </summary>
        public bool IsBusy { get; }

        /// <summary>
        /// Whether the Home window is open. Set by the BehaviorHost.
        /// </summary>
        public bool IsHomeOpen { get; }

        /// <summary>
        /// Requests an animation by name. Returns false and does nothing if a script holds the pig. Set by the BehaviorHost.
        /// </summary>
        public Func<string, bool> RequestAnimation { get; }

        public BehaviorContext(
            Core.Pet pet,
            FormPet activePet,
            BrainController brain,
            Action<string> log,
            bool isBusy,
            bool isHomeOpen,
            Func<string, bool> requestAnimation)
        {
            Pet = pet;
            ActivePet = activePet;
            Brain = brain;
            Log = log;
            IsBusy = isBusy;
            IsHomeOpen = isHomeOpen;
            RequestAnimation = requestAnimation;
        }
    }
}
