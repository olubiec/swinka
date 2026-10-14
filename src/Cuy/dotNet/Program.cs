using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using System.Xml.Serialization;
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

        public static string ArgumentLocalXML = "";

        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(string[] args)
        {
            Application.SetCompatibleTextRenderingDefault(false);

            AppDomain.CurrentDomain.AssemblyResolve += new ResolveEventHandler(CurrentDomain_AssemblyResolve);

            try
            {
                if (!mutex.WaitOne(TimeSpan.FromSeconds(1), false))
                {
                    MessageBox.Show("Cuy is already running. Only one copy can run at a time.", "Cuy", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Cuy could not start: " + ex.Message);
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
            Application.ThreadException += (s, e) => BrainController.Log("[ERROR] " + e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (s, e) => BrainController.Log("[ERROR] " + e.ExceptionObject);

            try
            {
                double initialSpeed = ParseSpeedMultiplier(args);
                BrainController.Initialize(initialSpeed);
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

                // Show the system tray icon.
                using (ProcessIcon pi = new ProcessIcon())
                {
                    pi.Display();

                    Mainthread = new StartUp(pi);

                    if (autoOpenHome)
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
