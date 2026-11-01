# W-UPD-02: Update downloader and restart applier script
Goal: Download update zip in background to temp and apply file replacement upon app exit.
Zmieniaj: src/Cuy/dotNet/Platform/UpdateApplier.cs, tools/apply-update.cmd
Wymagane: src/Cuy/dotNet/Platform/UpdateApplier.cs, tools/apply-update.cmd
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Rules: Clean exit, preserve user save data in %AppData%.
Steps:
1. Create `UpdateApplier`:
   - `DownloadUpdateAsync(string downloadUrl, IProgress<int> progress)`: downloads zip to `%TEMP%\CuyUpdate\update.zip`.
   - `ApplyAndRestart(string appDir)`:
     - Writes `tools/apply-update.cmd` passing current PID, temp zip path, and destination folder.
     - Spawns the batch script hidden and shuts down Cuy.exe cleanly.
2. `tools/apply-update.cmd`:
   - Waits for Cuy process PID to exit (`waitfor /T 1` or powershell loop).
   - Extracts zip using PowerShell `Expand-Archive -Force` into the app directory (preserving user save data in %AppData%).
   - Relaunches `Cuy.exe` and deletes temp files.

