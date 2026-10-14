#if DEBUG
using System;
using System.Windows.Forms;

namespace Cuy
{
    /// <summary>Debug-only dump of everything that decides whether the pet is visible. Output goes to cuy.log.</summary>
    public static class PetDiagnostics
    {
        public static void Dump()
        {
            try
            {
                var pets = Program.Mainthread != null ? Program.Mainthread.GetActivePets() : new FormPet[0];
                BrainController.Log("[DIAG] ---- begin ----");
                BrainController.Log("[DIAG] pets: " + pets.Length);
                for (int i = 0; i < pets.Length; i++)
                {
                    FormPet pet = pets[i];
                    string info = pet.InvokeRequired
                        ? (string)pet.Invoke(new Func<string>(pet.DescribeForDiagnostics))
                        : pet.DescribeForDiagnostics();
                    BrainController.Log(string.Format("[DIAG] pet {0}: {1}", i, info));
                }

                foreach (Screen screen in Screen.AllScreens)
                {
                    BrainController.Log(string.Format("[DIAG] screen {0}{1}: Bounds={2} WorkingArea={3}",
                        screen.DeviceName, screen.Primary ? " (primary)" : "", screen.Bounds, screen.WorkingArea));
                }

                string[] decisions = BrainController.RecentDecisions;
                BrainController.Log("[DIAG] last " + decisions.Length + " brain decisions:");
                foreach (string d in decisions) BrainController.Log("[DIAG]   " + d);

                InteractionManager im = InteractionManager.Instance;
                if (im == null)
                {
                    BrainController.Log("[DIAG] interaction: not initialized");
                }
                else
                {
                    int rewarded = im.RewardedPettingTimes.Count;
                    BrainController.Log(string.Format("[DIAG] interaction: petting rewards={0} (last {1}), watching={2}, sulking={3} ({4:0}s left), called={5}",
                        rewarded, rewarded > 0 ? im.RewardedPettingTimes[rewarded - 1].ToString("HH:mm:ss") : "never",
                        im.LookState, im.IsOffended, im.OffendedRemainingSeconds, im.CallState));
                }

                BrainController.Log("[DIAG] warnings/errors logged since start: " + BrainController.ExceptionCount);
                BrainController.Log("[DIAG] ---- end ----");
            }
            catch (Exception ex)
            {
                BrainController.Log("[WARN] PetDiagnostics.Dump: " + ex.Message);
            }
        }
    }
}
#endif
