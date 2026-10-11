Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinApiCheck2 {
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
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public static List<Tuple<IntPtr, RECT, string>> FindAllWindows(uint pid) {
        var list = new List<Tuple<IntPtr, RECT, string>>();
        EnumWindows((hWnd, lParam) => {
            uint windowPid;
            GetWindowThreadProcessId(hWnd, out windowPid);
            if (windowPid == pid && IsWindowVisible(hWnd)) {
                RECT r;
                GetWindowRect(hWnd, out r);
                var sbTitle = new StringBuilder(256);
                GetWindowText(hWnd, sbTitle, 256);
                string title = sbTitle.ToString();
                list.Add(Tuple.Create(hWnd, r, title));
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
'@

$exe = ".\esheep\build\DesktopPetPortable\bin\Debug\DesktopPet.exe"
Write-Host "Uruchamianie DesktopPet 60x..."
$proc = Start-Process -FilePath $exe -ArgumentList "60x" -PassThru
Start-Sleep -Seconds 5

try {
    Write-Host "Szukanie okien dla PID $($proc.Id)..."
    $windows = [WinApiCheck2]::FindAllWindows($proc.Id)
    Write-Host "Znaleziono $($windows.Count) okien przed F9:"
    $petHwnd = [IntPtr]::Zero
    foreach ($w in $windows) {
        $hwnd = $w.Item1
        $rect = $w.Item2
        $title = $w.Item3
        Write-Host " - HWND=$hwnd, Title='$title', Bounds=($($rect.Left), $($rect.Top), $($rect.Right), $($rect.Bottom))"
        if ($title -eq "Sheep" -or ($rect.Right - $rect.Left -eq 64 -and $rect.Bottom - $rect.Top -eq 64)) {
            $petHwnd = $hwnd
        }
    }

    Write-Host "`nTestowanie klawisza F9 (WM_HOTKEY / keybd_event)..."
    # Wyslanie WM_HOTKEY
    if ($petHwnd -ne [IntPtr]::Zero) {
        [WinApiCheck2]::PostMessage($petHwnd, 0x0312, [IntPtr]9009, [IntPtr]0)
    }
    # Wyslanie F9 przez keybd_event
    [WinApiCheck2]::keybd_event(0x78, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 50
    [WinApiCheck2]::keybd_event(0x78, 0, 2, [UIntPtr]::Zero)
    Start-Sleep -Seconds 2

    Write-Host "Szukanie okien po nacisnieciu F9..."
    $windowsAfter = [WinApiCheck2]::FindAllWindows($proc.Id)
    Write-Host "Znaleziono $($windowsAfter.Count) okien po F9:"
    $overlayFound = $false
    foreach ($w in $windowsAfter) {
        $hwnd = $w.Item1
        $rect = $w.Item2
        $title = $w.Item3
        Write-Host " - HWND=$hwnd, Title='$title', Bounds=($($rect.Left), $($rect.Top), $($rect.Right), $($rect.Bottom))"
        if ($title -like "*Mózg*" -or $title -like "*Brain*") {
            $overlayFound = $true
            Write-Host "SUKCES: Nakladka telemetryczna F9 zostala znaleziona i jest widoczna na ekranie!" -ForegroundColor Green
        }
    }

    if (-not $overlayFound) {
        Write-Host "UWAGA: Okno nakladki nie zostalo wykryte po tytule" -ForegroundColor Yellow
    }

} finally {
    Write-Host "`nZamykanie procesu testowego PID $($proc.Id)..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
