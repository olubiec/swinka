# testuj_10min.ps1
# Uruchamia swinke (DesktopPet.exe) na dokladnie 10 minut (600 sekund),
# zbiera logi zachowan z behavior_log.txt i generuje szczegolowy raport.

$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " TEST ZACHOWAN SWINKI NA PULPICIE (10 MINUT / 600 S)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Zatrzymanie poprzednich instancji
Stop-Process -Name DesktopPet -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Sciezki
$baseDir = "esheep/build/DesktopPetPortable/bin/Debug"
$exePath = Join-Path $baseDir "DesktopPet.exe"
$logPath = Join-Path $baseDir "behavior_log.txt"
$installPet = Join-Path $baseDir "installpet.xml"
$sourceXml = "esheep/src/Resources/animations.xml"
$reportPath = "narzedzia/raport_10min.txt"

if (-not (Test-Path $exePath)) {
    Write-Error "Nie znaleziono pliku wykonywalnego: $exePath"
    exit 1
}

# 3. Czyszczenie starego logu i konfiguracji
if (Test-Path $logPath) {
    Remove-Item $logPath -Force
}
$configPath = Join-Path $baseDir "DesktopPet.config"
if (Test-Path $configPath) {
    Remove-Item $configPath -Force
}

# Upewniamy sie, ze installpet.xml jest aktualny
Copy-Item $sourceXml $installPet -Force

# 4. Uruchomienie DesktopPet.exe
Write-Host "Uruchamianie zwierzaka: $exePath..." -ForegroundColor Green
$process = Start-Process -FilePath (Resolve-Path $exePath) -WorkingDirectory (Resolve-Path $baseDir) -PassThru

if (-not $process -or $process.HasExited) {
    Write-Error "Blad podczas uruchamiania procesu DesktopPet.exe!"
    exit 1
}

Write-Host "Swinka dziala (PID = $($process.Id)). Rozpoczynam monitorowanie przez 600 sekund (10 minut)..." -ForegroundColor Yellow

$totalSeconds = 600
$interval = 30
$elapsed = 0

while ($elapsed -lt $totalSeconds) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    
    # Sprawdz czy proces nadal dziala
    if ($process.HasExited) {
        Write-Warning "Proces DesktopPet.exe zakonczyl sie przedwczesnie!"
        break
    }
    
    # Odczytaj biezacy stan logu
    $linesCount = 0
    if (Test-Path $logPath) {
        $lines = Get-Content $logPath -ErrorAction SilentlyContinue
        $linesCount = $lines.Count
    }
    
    $remaining = $totalSeconds - $elapsed
    $minElapsed = [math]::Floor($elapsed / 60)
    $secElapsed = $elapsed % 60
    Write-Host "[Postep $minElapsed m $secElapsed s / 10 m] Zarejestrowano zdarzen animacji: $linesCount (pozostalo: $remaining s)" -ForegroundColor Gray
}

# 5. Zakonczenie procesu po 10 minutach
Write-Host "`nCzas 10 minut minal! Zamykanie procesu DesktopPet.exe (PID $($process.Id))..." -ForegroundColor Green
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 6. Analiza logu behavior_log.txt
if (-not (Test-Path $logPath)) {
    Write-Error "Brak pliku logu $logPath! Nie zarejestrowano zadnych zachowan."
    exit 1
}

$logLines = Get-Content $logPath
Write-Host "Laczna liczba zarejestrowanych akcji w ciagu 10 minut: $($logLines.Count)" -ForegroundColor Cyan

# Przetwarzanie sekwencji
$counts = @{}
$sequence = @()

foreach ($line in $logLines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Split('|')
    if ($parts.Count -ge 2) {
        $name = $parts[1].Trim()
        $sequence += $name
        if (-not $counts.ContainsKey($name)) {
            $counts[$name] = 0
        }
        $counts[$name]++
    }
}

# Analiza specyficznych regul:
$popcornDouble = 0
$wheekDouble = 0
$landCount = 0
$landScratch = 0

for ($i = 0; $i -lt $sequence.Count - 1; $i++) {
    $curr = $sequence[$i]
    $next = $sequence[$i+1]
    
    if ($curr -eq "popcorn" -and $next -eq "popcorn") {
        $popcornDouble++
    }
    if ($curr -eq "wheek" -and $next -eq "wheek") {
        $wheekDouble++
    }
    if ($curr -eq "land") {
        $landCount++
        if ($next -eq "scratch") {
            $landScratch++
        }
    }
}
if ($sequence.Count -gt 0 -and $sequence[$sequence.Count - 1] -eq "land") {
    $landCount++
}

# Glowne zachowania do zliczenia
$targetWeights = [ordered]@{
    "sniff"   = 15.0
    "scratch" = 8.0
    "eat"     = 10.0
    "popcorn" = 4.0
    "wheek"   = 3.0
    "doze"    = 5.0
    "idle"    = 27.0
    "walk"    = 28.0
}

$mainTotal = 0
foreach ($k in $targetWeights.Keys) {
    if ($counts.ContainsKey($k)) {
        $mainTotal += $counts[$k]
    }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("=================================================================")
[void]$sb.AppendLine(" RAPORT ZACHOWAN SWINKI - SESJA 10 MINUT (600 SEKUND)")
[void]$sb.AppendLine("=================================================================")
[void]$sb.AppendLine("Laczna liczba zarejestrowanych sekwencji animacji: $($sequence.Count)")
[void]$sb.AppendLine("Liczba wystapien glownych zachowan losowych: $mainTotal`n")

[void]$sb.AppendLine(("{0,-15} | {1,-8} | {2,-12} | {3,-15}" -f "Zachowanie", "Liczba", "Udzial (%)", "Waga zadana (%)"))
[void]$sb.AppendLine("-----------------------------------------------------------------")

foreach ($k in $targetWeights.Keys) {
    $cnt = if ($counts.ContainsKey($k)) { $counts[$k] } else { 0 }
    $pct = if ($mainTotal -gt 0) { ($cnt / $mainTotal) * 100 } else { 0 }
    $tgt = $targetWeights[$k]
    [void]$sb.AppendLine(("{0,-15} | {1,-8} | {2,10:N2}% | {3,13:N1}%" -f $k, $cnt, $pct, $tgt))
}

[void]$sb.AppendLine("-----------------------------------------------------------------")
$idleCount = if ($counts.ContainsKey("idle")) { $counts["idle"] } else { 0 }
$walkCount = if ($counts.ContainsKey("walk")) { $counts["walk"] } else { 0 }
$idleWalkTotal = $idleCount + $walkCount
$idleWalkPct = if ($mainTotal -gt 0) { ($idleWalkTotal / $mainTotal) * 100 } else { 0 }
[void]$sb.AppendLine("Suma 'idle' + 'walk': $idleWalkTotal wystapien ({0:N2}%, zalozenie: 55%)" -f $idleWalkPct)

[void]$sb.AppendLine("`n--- WERYFIKACJA REGUL SPECJALNYCH ---")
[void]$sb.AppendLine("1. Popcorn wystapil 2 razy pod rzad: $popcornDouble razy (Wymog: 0) -> " + $(if ($popcornDouble -eq 0) { "SPELNIONY [PASS]" } else { "BLAD [FAIL]" }))
[void]$sb.AppendLine("2. Wheek wystapil 2 razy pod rzad:   $wheekDouble razy (Wymog: 0) -> " + $(if ($wheekDouble -eq 0) { "SPELNIONY [PASS]" } else { "BLAD [FAIL]" }))
$scratchPct = if ($landCount -gt 0) { [math]::Round(($landScratch / $landCount) * 100, 1) } else { 0 }
[void]$sb.AppendLine("3. Po land wystapil scratch:         $landScratch z $landCount ladowan ($scratchPct%) -> " + $(if ($landCount -eq 0 -or $landScratch -gt 0) { "SPELNIONY [PASS]" } else { "BRAK" }))

# Pozostale zarejestrowane akcje poboczne
[void]$sb.AppendLine("`n--- POZOSTALE ZAREJESTROWANE AKCJE (fizyka/obroty/ruch) ---")
foreach ($key in $counts.Keys) {
    if (-not $targetWeights.Contains($key)) {
        [void]$sb.AppendLine(("{0,-15} : {1} razy" -f $key, $counts[$key]))
    }
}
[void]$sb.AppendLine("=================================================================")

$reportText = $sb.ToString()
Write-Host $reportText -ForegroundColor White

Set-Content -Path $reportPath -Value $reportText -Encoding UTF8
Write-Host "Zapisano pelny raport do: $reportPath" -ForegroundColor Green
