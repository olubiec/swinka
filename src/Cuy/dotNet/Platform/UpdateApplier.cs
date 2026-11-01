using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Cuy.Platform
{
    public static class UpdateApplier
    {
        public static async Task<string> DownloadUpdateAsync(string downloadUrl, IProgress<int> progress = null)
        {
            if (string.IsNullOrWhiteSpace(downloadUrl))
                throw new ArgumentException("Download URL cannot be null or empty.", nameof(downloadUrl));

            string tempDir = Path.Combine(Path.GetTempPath(), "CuyUpdate");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            string zipPath = Path.Combine(tempDir, "update.zip");

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Cuy-Pet");

                using (var response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false))
                {
                    response.EnsureSuccessStatusCode();

                    long? totalBytes = response.Content.Headers.ContentLength;

                    using (var contentStream = await response.Content.ReadAsStreamAsync().ConfigureAwait(false))
                    using (var fileStream = new FileStream(zipPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true))
                    {
                        var buffer = new byte[81920];
                        long totalRead = 0;
                        int bytesRead;

                        while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length).ConfigureAwait(false)) > 0)
                        {
                            await fileStream.WriteAsync(buffer, 0, bytesRead).ConfigureAwait(false);
                            totalRead += bytesRead;

                            if (progress != null && totalBytes.HasValue && totalBytes.Value > 0)
                            {
                                int pct = (int)((totalRead * 100L) / totalBytes.Value);
                                if (pct > 100) pct = 100;
                                progress.Report(pct);
                            }
                        }

                        if (progress != null)
                        {
                            progress.Report(100);
                        }
                    }
                }
            }

            return zipPath;
        }

        public static bool ApplyAndRestart(string zipPath, string appDir = null)
        {
            if (string.IsNullOrEmpty(zipPath) || !File.Exists(zipPath))
            {
                return false;
            }

            if (string.IsNullOrEmpty(appDir))
            {
                appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            }
            else
            {
                appDir = appDir.TrimEnd('\\', '/');
            }

            string scriptPath = FindUpdateScript(appDir);
            if (string.IsNullOrEmpty(scriptPath) || !File.Exists(scriptPath))
            {
                return false;
            }

            int pid = Process.GetCurrentProcess().Id;

            var startInfo = new ProcessStartInfo
            {
                FileName = scriptPath,
                Arguments = $"{pid} \"{zipPath}\" \"{appDir}\"",
                CreateNoWindow = true,
                UseShellExecute = false,
                WorkingDirectory = appDir
            };

            try
            {
                Process.Start(startInfo);
            }
            catch
            {
                return false;
            }

            try
            {
                if (Application.MessageLoop)
                {
                    Application.Exit();
                }
                else
                {
                    Environment.Exit(0);
                }
            }
            catch
            {
                Environment.Exit(0);
            }

            return true;
        }

        private static string FindUpdateScript(string appDir)
        {
            if (!string.IsNullOrEmpty(appDir))
            {
                string directTools = Path.Combine(appDir, "tools", "apply-update.cmd");
                if (File.Exists(directTools))
                {
                    return Path.GetFullPath(directTools);
                }

                string direct = Path.Combine(appDir, "apply-update.cmd");
                if (File.Exists(direct))
                {
                    return Path.GetFullPath(direct);
                }
            }

            string[] baseCandidates = { appDir, AppDomain.CurrentDomain.BaseDirectory };
            foreach (var baseDir in baseCandidates)
            {
                if (string.IsNullOrEmpty(baseDir))
                    continue;

                string current = Path.GetFullPath(baseDir);
                while (!string.IsNullOrEmpty(current))
                {
                    string candidate = Path.Combine(current, "tools", "apply-update.cmd");
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }

                    if (File.Exists(Path.Combine(current, "Cuy.sln")))
                    {
                        candidate = Path.Combine(current, "tools", "apply-update.cmd");
                        if (File.Exists(candidate))
                        {
                            return candidate;
                        }
                    }

                    var parent = Directory.GetParent(current);
                    current = parent?.FullName;
                }
            }

            return null;
        }
    }
}
