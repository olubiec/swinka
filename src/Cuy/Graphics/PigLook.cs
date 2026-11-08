using System;
using Cuy.Core.Pigs;

namespace Cuy.Look
{
    /// <summary>
    /// Desktop look adapter that delegates look resolution to Core's PigLookResolver.
    /// </summary>
    public static class PigLook
    {
        public static PigLookDescriptor Resolve(PigProfile pig, string stageKey = null)
        {
            return PigLookResolver.Resolve(pig, stageKey);
        }

        public static PigLookDescriptor Resolve(string breed, string coat, string stage = null, string namedId = null)
        {
            return PigLookResolver.Resolve(breed, coat, stage, namedId);
        }
    }
}
