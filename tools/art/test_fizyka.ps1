Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinApiPhysics {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP   = 0x0004;

    public static IntPtr FindPetWindow(uint pid) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            uint windowPid;
            GetWindowThreadProcessId(hWnd, out windowPid);
            if (windowPid == pid) {
                var sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title == "Sheep") {
                    found = hWnd;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
'@

$logFile = ".\esheep\build\DesktopPetPortable\bin\Debug\behavior_log.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$exe = ".\esheep\build\DesktopPetPortable\bin\Debug\DesktopPet.exe"
Write-Host "Uruchamianie DesktopPet 60x do testu fizyki..."
$proc = Start-Process -FilePath $exe -ArgumentList "60x" -PassThru
Start-Sleep -Seconds 5

try {
    $petHwnd = [WinApiPhysics]::FindPetWindow($proc.Id)
    Write-Host "Pet HWND: $petHwnd"
    if ($petHwnd -eq [IntPtr]::Zero) {
        Write-Host "Brak okna swinki!"
        return
    }

    $rect = New-Object WinApiPhysics+RECT
    [WinApiPhysics]::GetWindowRect($petHwnd, [ref]$rect)
    $centerX = [int]($rect.Left + 32)
    $centerY = [int]($rect.Top + 32)
    Write-Host "Pozycja swinki: ($centerX, $centerY)"

    Write-Host "`n1. Symulacja podniesienia i przeciagania (MouseDown)..."
    [WinApiPhysics]::SetCursorPos($centerX, $centerY)
    [WinApiPhysics]::mouse_event([WinApiPhysics]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Seconds 2

    Write-Host "`n2. Przeniesienie w gore ekranu i upuszczenie (MouseUp)..."
    [WinApiPhysics]::SetCursorPos($centerX, [int]($centerY - 300))
    [WinApiPhysics]::mouse_event([WinApiPhysics]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Seconds 3

    Write-Host "`n3. Weryfikacja logow zachowania i fizyki:"
    if (Test-Path $logFile) {
        $lines = Get-Content $logFile
        $hasDrag = $false
        $hasFallOrToss = $false
        $hasResume = $false
        foreach ($l in $lines) {
            if ($l -like "*[Fizyka]*przerwana*drag*" -or $l -like "*|drag|*") { $hasDrag = $true; Write-Host "  -> $l" -ForegroundColor Yellow }
            if ($l -like "*[Fizyka]*fall*" -or $l -like "*[Fizyka]*toss*" -or $l -like "*|fall|*") { $hasFallOrToss = $true; Write-Host "  -> $l" -ForegroundColor Yellow }
            if ($l -like "*[Fizyka]*Wznowienie Brain*") { $hasResume = $true; Write-Host "  -> $l" -ForegroundColor Green }
        }
        Write-Host "`nWyniki:"
        Write-Host " - Wykryto przeciaganie (drag): $hasDrag"
        Write-Host " - Wykryto spadanie/rzut (fall/toss): $hasFallOrToss"
        Write-Host " - Wykryto wznowienie Brain po lądowaniu: $hasResume"
    } else {
        Write-Host "Brak pliku logu!"
    }
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
