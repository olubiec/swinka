using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using System.Xml.Serialization;
using Microsoft.Win32;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Main entry point of the Cuy app.
    /// </summary>
    class Program
    {
        /// <summary>
        /// StartUp is the main program.
        /// </summary>
        public static StartUp Mainthread;

        static Assembly CurrentDomain_AssemblyResolve(object sender, ResolveEventArgs args)
        {
            return EmbeddedAssembly.Get(args.Name);
        }

        /// <summary>
        /// Mutual Exclusion, to allow only 1 instance of this application.
        /// </summary>
        static readonly Mutex mutex = new Mutex(false, "Cuy.SingleInstance");

        public static LocalData MyData = new LocalData();

#if DEBUG
        public static double ParseSpeedMultiplier(string[] args)
        {
            if (args == null) return 1.0;
            for (int i = 0; i < args.Length; i++)
            {
                string arg = (args[i] ?? "").Trim().ToLowerInvariant();
                if (arg == "60x" || arg == "-60x" || arg == "/60x" || arg == "--60x")
                {
                    return 60.0;
                }
                if (arg.StartsWith("speed="))
                {
                    string val = arg.Substring("speed=".Length);
                    if (double.TryParse(val, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double parsed))
                        return parsed;
                }
                if ((arg == "--speed" || arg == "-speed" || arg == "/speed") && i + 1 < args.Length)
                {
                    if (double.TryParse(args[i + 1], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double parsed))
                        return parsed;
                }
            }
            return 1.0;
        }
#endif

        public static string ArgumentLocalXML = "";

        /// <summary>Tray icon, so Home can refresh the tooltip after naming the pig.</summary>
        public static ProcessIcon Tray;

        private const string ShowHomeEventName = "Cuy.ShowHome";
        private static Control _uiInvoker;
        private static bool _crashHandling;

        private static string CrashFile
        {
            get
            {
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Cuy", "lastcrash.txt");
            }
        }

        /// <summary>Seconds since the last recorded crash, or a large number when there is none.</summary>
        private static double SecondsSinceLastCrash()
        {
            try
            {
                if (File.Exists(CrashFile)
                    && DateTime.TryParse(File.ReadAllText(CrashFile).Trim(), null,
                        System.Globalization.DateTimeStyles.RoundtripKind, out DateTime last))
                {
                    return (DateTime.UtcNow - last.ToUniversalTime()).TotalSeconds;
                }
            }
            catch (Exception) { }
            return double.MaxValue;
        }

        /// <summary>Logs the crash, tells the user once and restarts, unless the previous crash was less than 60 s ago.</summary>
        private static void HandleCrash(Exception ex)
        {
            if (_crashHandling) return;
            _crashHandling = true;
            try
            {
                BrainController.Log("[ERROR] Crash: " + ex);
                bool tooSoon = SecondsSinceLastCrash() < 60;
                try
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(CrashFile));
                    File.WriteAllText(CrashFile, DateTime.UtcNow.ToString("o"));
                }
                catch (Exception) { }

                if (tooSoon)
                {
                    BrainController.Log("[ERROR] Second crash within 60 s. Not restarting.");
                    Environment.Exit(1);
                    return;
                }

                try { BrainController.Instance?.Close(); } catch (Exception) { }
                MessageBox.Show("Cuy hit a snag and will restart.", "Cuy", MessageBoxButtons.OK, MessageBoxIcon.Information);
                Application.Restart();
            }
            catch (Exception inner)
            {
                BrainController.Log("[ERROR] HandleCrash: " + inner.Message);
            }
            Environment.Exit(1);
        }

        /// <summary>
        /// Takes the single-instance mutex. Right after a crash the old process may still be shutting down, so wait for it.
        /// </summary>
        private static bool AcquireSingleInstance()
        {
            TimeSpan wait = SecondsSinceLastCrash() < 30 ? TimeSpan.FromSeconds(10) : TimeSpan.Zero;
            try
            {
                return mutex.WaitOne(wait, false);
            }
            catch (AbandonedMutexException)
            {
                return true; // the previous instance died; we own the mutex now
            }
        }

        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(string[] args)
        {
            Application.SetCompatibleTextRenderingDefault(false);

            AppDomain.CurrentDomain.AssemblyResolve += new ResolveEventHandler(CurrentDomain_AssemblyResolve);

            if (Array.Exists(args, x => string.Equals(x, "--selftest", StringComparison.OrdinalIgnoreCase)))
            {
                Environment.Exit(SelfTest.Run());
                return;
            }

            EventWaitHandle showHomeEvent = new EventWaitHandle(false, EventResetMode.AutoReset, ShowHomeEventName);
            try
            {
                if (!AcquireSingleInstance())
                {
                    showHomeEvent.Set(); // ask the running Cuy to open Home, then leave quietly
                    return;
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[ERROR] Single instance check failed: " + ex.Message);
                return;
            }

            // Check and parse the arguments
            string SearchStringLocalXml = "localxml=";
            bool loadExternalXml = false;
            foreach (string s in args)
            {
                if (s.IndexOf(SearchStringLocalXml) >= 0)
                {
                    ArgumentLocalXML = s.Substring(s.IndexOf(SearchStringLocalXml) + SearchStringLocalXml.Length);
                    if (ArgumentLocalXML.IndexOf(" ") >= 0)
                    {
                        ArgumentLocalXML = ArgumentLocalXML.Substring(0, ArgumentLocalXML.IndexOf(" "));
                    }
                    loadExternalXml = true;
                }
            }

            if (loadExternalXml)
            {
                MyData.SetXml(MyData.LoadXML(), "");
            }

            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) => HandleCrash(e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (s, e) => HandleCrash(e.ExceptionObject as Exception);

            try
            {
#if DEBUG
                double initialSpeed = ParseSpeedMultiplier(args);
#else
                double initialSpeed = 1.0;
#endif
                BrainController.Initialize(initialSpeed);
                Cuy.Features.HomeFeatures.LoadAll();
                Cuy.Features.HomeFeatures.InitializeAll(BrainController.Instance);
                bool isNewGame = BrainController.Instance.Session.IsNewGame;
                ItemCatalog.ErrorLogger = message => BrainController.Log("[ERROR] " + message);
                Application.ApplicationExit += (s, e) => { BrainController.Instance?.Close(); };

                BrainController.Log("[Program] Args: " + (args != null ? string.Join(" ", args) : "null"));
                bool autoOpenHome = false;
                foreach (string s in args)
                {
                    if (string.Equals(s, "--home", StringComparison.OrdinalIgnoreCase))
                    {
                        autoOpenHome = true;
                    }
                }

                if (isNewGame) AutoStart.Enable();
                AutoStart.RefreshPath();

                // Helper control: lets background threads run code on the UI thread.
                _uiInvoker = new Control();
                IntPtr invokerHandle = _uiInvoker.Handle;

                // A second start of Cuy signals this one to open Home.
                var showHomeThread = new Thread(() =>
                {
                    while (true)
                    {
                        showHomeEvent.WaitOne();
                        RunOnUiThread(HomeWindow.ShowHome);
                    }
                }) { IsBackground = true, Name = "Cuy.ShowHomeWaiter" };
                showHomeThread.Start();

                // After sleep or hibernation apply the offline rules once for the time that passed.
                SystemEvents.PowerModeChanged += (s, e) =>
                {
                    if (e.Mode == PowerModes.Resume)
                    {
                        RunOnUiThread(() => BrainController.Instance?.OnResume());
                    }
                };

                // Show the system tray icon.
                using (ProcessIcon pi = new ProcessIcon())
                {
                    Tray = pi;
                    pi.Display();

                    Mainthread = new StartUp(pi);

                    if (BrainController.Instance.Pet.State.NeedsNaming && !autoOpenHome)
                    {
                        // New game: the pig first peeks out from the screen corner, then Home opens for naming.
                        FirstRunIntro.Start(() => HomeWindow.ShowHome());
                    }
                    else if (autoOpenHome)
                    {
                        try
                        {
                            BrainController.Log("[Program] Calling HomeWindow.ShowHome()...");
                            HomeWindow.ShowHome();
                            BrainController.Log("[Program] HomeWindow.ShowHome() done.");
                        }
                        catch (Exception ex)
                        {
                            BrainController.Log("[Program] ERROR HomeWindow: " + ex.ToString());
                        }
                    }

#if DEBUG
                    foreach (string s in args)
                    {
                        if (string.Equals(s, "--diag", StringComparison.OrdinalIgnoreCase))
                        {
                            var diagTimer = new System.Windows.Forms.Timer { Interval = 10000 };
                            diagTimer.Tick += (sender, e) => { diagTimer.Stop(); PetDiagnostics.Dump(); };
                            diagTimer.Start();
                        }
                    }
#endif

                    // Make sure the application runs!
                    Application.Run();
                }
            }
            catch (Exception ex)
            {
                BrainController.Log("[FATAL] " + ex);
            }

            try
            {
                mutex.ReleaseMutex();
            }
            catch (Exception ex) { BrainController.Log("[WARN] Program.Main: " + ex.Message); }
        }

        private static void RunOnUiThread(Action action)
        {
            try
            {
                if (_uiInvoker != null && _uiInvoker.IsHandleCreated)
                {
                    _uiInvoker.BeginInvoke(action);
                }
            }
            catch (Exception ex) { BrainController.Log("[WARN] Program.RunOnUiThread: " + ex.Message); }
        }

        public static void RestartApp()
        {
            Application.Restart();
            Application.Exit();
        }

        public static bool OpenLink(string httpsUrl)
        {
            if (Uri.TryCreate(httpsUrl, UriKind.Absolute, out Uri validatedUri) && validatedUri.Scheme == Uri.UriSchemeHttps)
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = validatedUri.AbsoluteUri,
                        UseShellExecute = true
                    });
                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error opening browser: {ex.Message}");
                    return false;
                }
            }
            else
            {
                Console.WriteLine("Invalid URL or not a https.");
                return false;
            }
        }
    }
}
