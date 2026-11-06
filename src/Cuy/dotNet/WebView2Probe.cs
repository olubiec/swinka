using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Cuy
{
    /// <summary>
    /// Cuy.exe --webview-check: starts a real WebView2 control exactly like Home does (hidden form), loads a tiny page
    /// and writes a report to %TEMP%\cuy-webview-check.txt. Exit code 0 = works, 1 = failed. Catches loader/bitness
    /// problems (HRESULT 0x8007000B) that --selftest and --diag cannot see.
    /// </summary>
    internal static class WebView2Probe
    {
        private static readonly StringBuilder Report = new StringBuilder();
        private static int _exit = 1;

        public static string ReportPath { get { return Path.Combine(Path.GetTempPath(), "cuy-webview-check.txt"); } }

        /// <summary>One-line text for logs: type, HRESULT, message, inner exceptions, process bitness and loader files.</summary>
        public static string Describe(Exception ex)
        {
            var sb = new StringBuilder();
            sb.Append("process=").Append(Environment.Is64BitProcess ? "x64" : "x86");
            sb.Append(" os64=").Append(Environment.Is64BitOperatingSystem);
            if (ex != null)
            {
                for (Exception e = ex; e != null; e = e.InnerException)
                    sb.Append(" | ").Append(e.GetType().Name).Append(" 0x").Append(e.HResult.ToString("X8")).Append(": ").Append(e.Message);
            }
            sb.Append(" | loaders: ").Append(string.Join("; ", LoaderFiles()));
            return sb.ToString();
        }

        private static List<string> LoaderFiles()
        {
            var list = new List<string>();
            string dir = AppDomain.CurrentDomain.BaseDirectory;
            string[] rel =
            {
                "WebView2Loader.dll",
                Path.Combine("runtimes", "win-x86", "native", "WebView2Loader.dll"),
                Path.Combine("runtimes", "win-x64", "native", "WebView2Loader.dll"),
                Path.Combine("runtimes", "win-arm64", "native", "WebView2Loader.dll"),
            };
            foreach (string r in rel)
            {
                string full = Path.Combine(dir, r);
                list.Add(r + "=" + (File.Exists(full) ? PeMachine(full) : "missing"));
            }
            return list;
        }

        private static string PeMachine(string path)
        {
            try
            {
                using (var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
                using (var br = new BinaryReader(fs))
                {
                    fs.Position = 0x3C;
                    int pe = br.ReadInt32();
                    fs.Position = pe + 4;
                    ushort m = br.ReadUInt16();
                    switch (m)
                    {
                        case 0x014c: return "x86";
                        case 0x8664: return "x64";
                        case 0xAA64: return "arm64";
                        default: return "machine 0x" + m.ToString("X4");
                    }
                }
            }
            catch (Exception ex) { return "unreadable: " + ex.Message; }
        }

        public static int Run()
        {
            Report.AppendLine("Cuy --webview-check");
            Report.AppendLine("exe dir: " + AppDomain.CurrentDomain.BaseDirectory);
            Report.AppendLine(Describe(null));
            try
            {
                Report.AppendLine("browser version: " + CoreWebView2Environment.GetAvailableBrowserVersionString());
            }
            catch (Exception ex) { Report.AppendLine("browser version FAILED: " + ex); }

            try
            {
                Application.EnableVisualStyles();
                var form = new Form { ShowInTaskbar = false, Width = 420, Height = 640, StartPosition = FormStartPosition.Manual, Left = -3000, Top = -3000 };
                var timeout = new Timer { Interval = 60000 };
                timeout.Tick += (s, e) => { Report.AppendLine("FAIL: timeout after 60 s"); _exit = 1; form.Close(); };
                form.Shown += async (s, e) =>
                {
                    timeout.Start();
                    try
                    {
                        var wv = new WebView2 { Dock = DockStyle.Fill };
                        form.Controls.Add(wv);
                        string data = Path.Combine(Path.GetTempPath(), "CuyWebViewCheck_" + Guid.NewGuid().ToString("N"));
                        Directory.CreateDirectory(data);
                        var env = await CoreWebView2Environment.CreateAsync(null, data);
                        await wv.EnsureCoreWebView2Async(env);
                        var done = new System.Threading.Tasks.TaskCompletionSource<bool>();
                        wv.CoreWebView2.NavigationCompleted += (s2, e2) => done.TrySetResult(e2.IsSuccess);
                        wv.CoreWebView2.NavigateToString("<html><body>cuy</body></html>");
                        bool ok = await done.Task;
                        Report.AppendLine(ok ? "PASS: WebView2 started and loaded a page" : "FAIL: navigation failed");
                        _exit = ok ? 0 : 1;
                    }
                    catch (Exception ex)
                    {
                        Report.AppendLine("FAIL: " + Describe(ex));
                        Report.AppendLine(ex.ToString());
                        _exit = 1;
                    }
                    finally
                    {
                        timeout.Stop();
                        form.Close();
                    }
                };
                Application.Run(form);
            }
            catch (Exception ex)
            {
                Report.AppendLine("FAIL (outer): " + Describe(ex));
                Report.AppendLine(ex.ToString());
                _exit = 1;
            }

            try { File.WriteAllText(ReportPath, Report.ToString(), new UTF8Encoding(false)); } catch (Exception) { }
            return _exit;
        }
    }
}
