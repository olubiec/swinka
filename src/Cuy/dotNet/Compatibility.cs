using System;
using Cuy;

namespace DesktopPet
{
    public static class SwinkaBrainController
    {
        public static BrainController Instance => BrainController.Instance;
        public static void Initialize(double speedMultiplier = 1.0) => BrainController.Initialize(speedMultiplier);
        public static void Log(string message) => BrainController.Log(message);
    }

    public static class SwinkaIcons
    {
        public static System.Drawing.Icon GetTrayIcon() => PetIcons.GetTrayIcon();
        public static System.Drawing.Bitmap GetIconBitmap(string iconName) => PetIcons.GetIconBitmap(iconName);
    }

    public class ProcessIcon : Cuy.ProcessIcon { }
    public class ContextMenus : Cuy.ContextMenus { }
    public class FormPet : Cuy.FormPet
    {
        public FormPet() : base() { }
        public FormPet(Cuy.Animations a, Cuy.Xml x) : base(a, x) { }
        public FormPet(Cuy.Animations a, Cuy.Xml x, System.Drawing.Point p, bool f, int d) : base(a, x, p, f, d) { }
    }

    public static class FormDomek
    {
        public static HomeWindow Instance => HomeWindow.Instance;
        public static void ShowDomek() => HomeWindow.ShowHome();
        public static void NotifyStateChanged() => HomeWindow.NotifyStateChanged();
    }
}
