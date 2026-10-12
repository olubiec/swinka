Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinApiCheck {
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

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    public static List<Tuple<IntPtr, RECT, string>> FindPetWindows(uint pid) {
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
                int w = r.Right - r.Left;
                int h = r.Bottom - r.Top;
                if (title == "Sheep" || (w == 64 && h == 64)) {
                    list.Add(Tuple.Create(hWnd, r, title));
                }
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
'@

$p = Get-Process DesktopPet -ErrorAction SilentlyContinue | Select-Object -First 1
if ($p) {
    Write-Host "Process found: PID=$($p.Id)"
    $petWindows = [WinApiCheck]::FindPetWindows($p.Id)
    if ($petWindows.Count -gt 0) {
        foreach ($pet in $petWindows) {
            $hwnd = $pet.Item1
            $rect = $pet.Item2
            $title = $pet.Item3
            Write-Host "Pet Window HWND=$hwnd, Title='$title'"
            Write-Host "Window bounds: Left=$($rect.Left), Top=$($rect.Top), Right=$($rect.Right), Bottom=$($rect.Bottom)"
            $w = $rect.Right - $rect.Left
            $h = $rect.Bottom - $rect.Top
            Write-Host "Size: Width=$w, Height=$h"
            
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen
            $taskbarTop = $screen.WorkingArea.Bottom
            # W sprite świnki podłoga jest na y=59 (indeks 0..63), spód stóp na y=60
            $feetBottom = $rect.Top + 60
            Write-Host "Taskbar top (WorkingArea.Bottom): $taskbarTop"
            Write-Host "Feet sole (Top + 60 px): $feetBottom"
            $delta = $feetBottom - $taskbarTop
            Write-Host "Delta (stopy vs pasek zadan): $delta px"
            if ($delta -eq 0) {
                Write-Host "WYNIK: Stopy stoja IDEALNIE rowno na pasku zadan (delta = 0 px)!" -ForegroundColor Green
            } else {
                Write-Host "WYNIK: Roznica wynosi $delta px" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Pet window not found for PID $($p.Id) (yet invisible or loading)"
    }
} else {
    Write-Host "DesktopPet process not found"
}
