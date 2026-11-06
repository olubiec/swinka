param(
    [int]$Seconds = 25,
    [string]$Config = "Release"
)

$ErrorActionPreference = "Stop"
$Allowed = @(
    # Lines already known as harmless
)

$repoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$exePath = Join-Path $repoRoot "src\Cuy\bin\$Config\Cuy.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "Cuy.exe not found at $exePath. Run tools/build.ps1 first."
}

$appData = [Environment]::GetFolderPath('ApplicationData')
$savePath = Join-Path $appData "Cuy\save.json"
$backupPath = "$savePath.qa-backup"

$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
$logPath = Join-Path $localAppData "Cuy\logs\cuy.log"

$hasBackup = $false
try {
    if (Test-Path $savePath) {
        Copy-Item -Path $savePath -Destination $backupPath -Force
        $hasBackup = $true
        Write-Host "Backed up save to: $backupPath"
    }

    # 1. Run selftest
    Write-Host "Running Cuy.exe --selftest..."
    $selftestProc = Start-Process -FilePath $exePath -ArgumentList "--selftest" -Wait -PassThru -NoNewWindow
    $selftestExit = $selftestProc.ExitCode
    $selftestFile = Join-Path ([System.IO.Path]::GetTempPath()) "cuy-selftest.txt"
    if (Test-Path $selftestFile) {
        $stLines = Get-Content $selftestFile
        $stFails = $stLines | Where-Object { $_ -match "^FAIL" }
        if ($stFails) {
            Write-Host "Selftest failures:"
            $stFails | ForEach-Object { Write-Host "  $_" }
        }
    }
    if ($selftestExit -ne 0) {
        Write-Error "Cuy.exe --selftest failed with exit code $selftestExit"
    }
    Write-Host "Selftest passed."

    # 2. Remember log length and start Cuy.exe
    $initialLogLen = 0
    if (Test-Path $logPath) {
        $initialLogLen = (Get-Item $logPath).Length
    }

    Write-Host "Starting Cuy.exe for $Seconds seconds..."
    $proc = Start-Process -FilePath $exePath -PassThru
    $procId = $proc.Id

    Start-Sleep -Seconds $Seconds

    $diedEarly = $proc.HasExited
    if (-not $diedEarly) {
        cmd /c "taskkill /PID $procId /T /F" 2>&1 | Out-Null
    }

    if ($diedEarly) {
        Write-Error "Cuy.exe died unexpectedly before $Seconds seconds elapsed."
    }

    # 3. Read new log lines
    $newLines = @()
    if (Test-Path $logPath) {
        $fs = [System.IO.File]::Open($logPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        try {
            if ($fs.Length -gt $initialLogLen) {
                [void]$fs.Seek($initialLogLen, [System.IO.SeekOrigin]::Begin)
                $reader = New-Object System.IO.StreamReader($fs)
                $content = $reader.ReadToEnd()
                $newLines = $content -split "`r?`n"
            }
        } finally {
            $fs.Close()
        }
    }

    $bubbleCount = 0
    $offending = @()

    foreach ($line in $newLines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match "\[Bubble\]") {
            $bubbleCount++
        }
        if ($line -match "\[ERROR\]|Unhandled|Exception") {
            $isAllowed = $false
            foreach ($pattern in $Allowed) {
                if ($line -match $pattern) {
                    $isAllowed = $true
                    break
                }
            }
            if (-not $isAllowed) {
                $offending += $line
            }
        }
    }

    Write-Host "New log lines read: $($newLines.Count)"
    Write-Host "Bubble lines count: $bubbleCount"

    if ($offending.Count -gt 0) {
        Write-Host "FAIL: Found $($offending.Count) offending log lines (showing up to 20):"
        $offending | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
        exit 1
    }

    Write-Host "EXE SMOKE OK"
} finally {
    if ($hasBackup -and (Test-Path $backupPath)) {
        Copy-Item -Path $backupPath -Destination $savePath -Force
        Remove-Item -Path $backupPath -Force
        Write-Host "Restored save from: $backupPath"
    }
}

