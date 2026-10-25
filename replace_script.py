import re

with open('src/Cuy/dotNet/FormPet.cs', 'r') as f:
    content = f.read()

replacement = """        private void NextStep()
        {
            if (Visible)
            {
                EdgePeekDirector.EnsureStarted();
            }
            if (HomeWindow.IsOpen && !_inHome)
            {
                EnterHome();
                BrainController.Log("[Home] Bug corrected: forced pig into Home.");
            }
            else if (!HomeWindow.IsOpen && _inHome && !Visible)
            {
                var wa = Screen.PrimaryScreen.WorkingArea;
                LeaveHome(new Point(wa.Left + wa.Width / 2, wa.Bottom));
                BrainController.Log("[Home] Bug corrected: forced pig out of Home.");
            }

            if (_brain == null) _brain = BrainController.Instance;
            _brain?.Update();"""

content = content.replace("""        private void NextStep()
        {
            if (_brain == null) _brain = BrainController.Instance;
            _brain?.Update();""", replacement)

with open('src/Cuy/dotNet/FormPet.cs', 'w') as f:
    f.write(content)
