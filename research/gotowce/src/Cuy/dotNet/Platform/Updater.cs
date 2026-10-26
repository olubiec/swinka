using System;
using System.Threading.Tasks;
using Velopack;
using Velopack.Sources;

namespace Cuy.Platform
{
    /// <summary>
    /// Optional auto-update through Velopack (MIT, NuGet "Velopack", targets net472 -> works on net48).
    /// Releases are read from GitHub Releases of the repo (public repo: no token, 60 req/h per IP is plenty).
    /// Never blocks the pig: runs in the background 2 minutes after start, downloads quietly and applies the update
    /// when Cuy exits (WaitExitThenApplyUpdates: the updater waits for the process to end, e.g. at shutdown),
    /// so the pig is never killed mid-animation; the new version runs from the next start.
    /// Saves live in %AppData%\Cuy and are untouched by Velopack (it only replaces the app folder).
    ///
    /// Program.Main, first line (before the mutex):   VelopackApp.Build().Run();
    /// After the pet starts:                         Updater.StartBackgroundCheck(BrainController.Log);
    /// </summary>
    public static class Updater
    {
        public const string RepoUrl = "https://github.com/olubiec/swinka";

        public static void StartBackgroundCheck(Action<string> log)
        {
            Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(2)).ConfigureAwait(false);
                    var mgr = new UpdateManager(new GithubSource(RepoUrl, null, false));
                    if (!mgr.IsInstalled)
                    {
                        log("[Update] not installed with Setup.exe (zip copy): skipped");
                        return;
                    }

                    var update = await mgr.CheckForUpdatesAsync().ConfigureAwait(false);
                    if (update == null)
                    {
                        log("[Update] up to date (" + mgr.CurrentVersion + ")");
                        return;
                    }

                    log("[Update] downloading " + update.TargetFullRelease.Version);
                    await mgr.DownloadUpdatesAsync(update).ConfigureAwait(false);
                    mgr.WaitExitThenApplyUpdates(update.TargetFullRelease, silent: true, restart: false);
                    log("[Update] ready, applied when Cuy closes");
                }
                catch (Exception ex)
                {
                    log("[Update] skipped: " + ex.GetType().Name + " " + ex.Message);
                }
            });
        }
    }
}
