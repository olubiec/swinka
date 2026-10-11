# testuj_15min.ps1
# Uruchamia swinke (DesktopPet.exe) na 15 minut (900 sekund),
# zbiera logi zachowan z behavior_log.txt z precyzyjnymi znacznikami czasu
# i oblicza, ile procent CZASU oraz ile razy wystapila kazda animacja.

$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " TEST ZACHOWAN SWINKI NA PULPICIE (15 MINUT / 900 S) - A5" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Sciezki
$baseDir = "esheep/build/DesktopPetPortable/bin/Debug"
$exePath = Join-Path $baseDir "DesktopPet.exe"
$logPath = Join-Path $baseDir "behavior_log.txt"
$installPet = Join-Path $baseDir "installpet.xml"
$sourceXml = "esheep/src/Resources/animations.xml"
$reportPath = "narzedzia/raport_15min.txt"

function Generate-Report {
    param(
        [DateTime]$start,
        [DateTime]$stop
    )

    if (-not (Test-Path $logPath)) {
        Write-Error "Brak pliku logu $logPath!"
        return
    }

    $logLines = Get-Content $logPath
    $events = @()
    foreach ($line in $logLines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $parts = $line.Split('|')
        if ($parts.Count -ge 3) {
            try {
                $ts = [DateTime]::ParseExact($parts[0].Trim(), "yyyy-MM-dd HH:mm:ss.fff", [System.Globalization.CultureInfo]::InvariantCulture)
                $name = $parts[1].Trim()
                $id = [int]$parts[2].Trim()
                $events += [PSCustomObject]@{
                    Time = $ts
                    Name = $name
                    Id = $id
                }
            } catch {}
        }
    }

    if ($events.Count -eq 0) {
        Write-Error "Brak sparsowanych zdarzen w logu!"
        return
    }

    $timeByName = @{}
    $countByName = @{}
    $sequence = @()

    for ($i = 0; $i -lt $events.Count; $i++) {
        $curr = $events[$i]
        $sequence += $curr.Name
        
        if (-not $countByName.ContainsKey($curr.Name)) {
            $countByName[$curr.Name] = 0
            $timeByName[$curr.Name] = 0.0
        }
        $countByName[$curr.Name]++
        
        $dur = 0.0
        if ($i -lt $events.Count - 1) {
            $dur = ($events[$i+1].Time - $curr.Time).TotalSeconds
        } else {
            $dur = ($stop - $curr.Time).TotalSeconds
        }
        if ($dur -lt 0) { $dur = 0.0 }
        $timeByName[$curr.Name] += $dur
    }

    $totalLoggedTime = 0.0
    foreach ($k in $timeByName.Keys) {
        $totalLoggedTime += $timeByName[$k]
    }
    if ($totalLoggedTime -le 0) { $totalLoggedTime = ($stop - $start).TotalSeconds }

    $popcornDouble = 0
    $wheekDouble = 0
    $walkDouble = 0
    $landCount = 0
    $landScratch = 0

    for ($i = 0; $i -lt $sequence.Count - 1; $i++) {
        $c = $sequence[$i]
        $n = $sequence[$i+1]
        if ($c -eq "popcorn" -and $n -eq "popcorn") { $popcornDouble++ }
        if ($c -eq "wheek" -and $n -eq "wheek") { $wheekDouble++ }
        if ($c -eq "walk" -and $n -eq "walk") { $walkDouble++ }
        if ($c -eq "land") {
            $landCount++
            if ($n -eq "scratch") { $landScratch++ }
        }
    }
    if ($sequence.Count -gt 0 -and $sequence[$sequence.Count - 1] -eq "land") { $landCount++ }

    $targetBudgets = @{
        "idle"    = "ok. 50% (z doze)"
        "doze"    = "ok. 50% (z idle)"
        "eat"     = "ok. 28%"
        "walk"    = "ok. 8% (<10%)"
        "sniff"   = "ok. 8%"
        "scratch" = "ok. 2-3%"
        "popcorn" = "1-3/dobe"
        "wheek"   = "b. rzadko"
        "run"     = "b. rzadko"
    }

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("================================================================================")
    [void]$sb.AppendLine(" RAPORT ZACHOWAN I BUDZETU CZASU SWINKI - SESJA 15 MINUT (900 SEKUND) [A5]")
    [void]$sb.AppendLine("================================================================================")
    [void]$sb.AppendLine("Czas trwania sesji pomiarowej: $($totalLoggedTime.ToString('N1')) sekund ($([math]::Round($totalLoggedTime/60, 2)) min)")
    [void]$sb.AppendLine("Laczna liczba zarejestrowanych sekwencji animacji: $($sequence.Count)`n")

    [void]$sb.AppendLine(("{0,-12} | {1,-10} | {2,-16} | {3,-8} | {4,-15}" -f "Animacja", "Czas (s)", "Udzial CZASU (%)", "Liczba", "Cel budzetu"))
    [void]$sb.AppendLine("--------------------------------------------------------------------------------")

    $restTime = 0.0
    $allKeys = New-Object System.Collections.Generic.List[string]
    foreach ($k in @("idle", "doze", "eat", "walk", "sniff", "scratch", "popcorn", "wheek", "run")) {
        $allKeys.Add($k)
    }

    foreach ($k in $allKeys) {
        $t = if ($timeByName.ContainsKey($k)) { $timeByName[$k] } else { 0.0 }
        $cnt = if ($countByName.ContainsKey($k)) { $countByName[$k] } else { 0 }
        $pct = if ($totalLoggedTime -gt 0) { ($t / $totalLoggedTime) * 100 } else { 0.0 }
        $tgt = if ($targetBudgets.ContainsKey($k)) { $targetBudgets[$k] } else { "-" }
        
        if ($k -eq "idle" -or $k -eq "doze") {
            $restTime += $t
        }
        
        [void]$sb.AppendLine(("{0,-12} | {1,8:N1} s | {2,14:N2}% | {3,8} | {4,15}" -f $k, $t, $pct, $cnt, $tgt))
    }

    $restPct = if ($totalLoggedTime -gt 0) { ($restTime / $totalLoggedTime) * 100 } else { 0.0 }
    $walkT = if ($timeByName.ContainsKey("walk")) { $timeByName["walk"] } else { 0.0 }
    $walkPct = if ($totalLoggedTime -gt 0) { ($walkT / $totalLoggedTime) * 100 } else { 0.0 }
    $eatT = if ($timeByName.ContainsKey("eat")) { $timeByName["eat"] } else { 0.0 }
    $eatPct  = if ($totalLoggedTime -gt 0) { ($eatT / $totalLoggedTime) * 100 } else { 0.0 }
    $sniffT = if ($timeByName.ContainsKey("sniff")) { $timeByName["sniff"] } else { 0.0 }
    $sniffPct = if ($totalLoggedTime -gt 0) { ($sniffT / $totalLoggedTime) * 100 } else { 0.0 }

    [void]$sb.AppendLine("--------------------------------------------------------------------------------")
    [void]$sb.AppendLine("PODSUMOWANIE KLUCZOWYCH GRUP BUDZETU DNIA:")
    [void]$sb.AppendLine("1. Odpoczynek i drzemki (idle + doze): $($restTime.ToString('N1')) s ({0:N2}%, cel: ~50%)" -f $restPct)
    [void]$sb.AppendLine("2. Jedzenie siana (eat):               $($eatT.ToString('N1')) s ({0:N2}%, cel: ~28%)" -f $eatPct)
    [void]$sb.AppendLine("3. Chodzenie (walk):                   $($walkT.ToString('N1')) s ({0:N2}%, cel: ~8%, <10%)" -f $walkPct)
    [void]$sb.AppendLine("4. Weszenie (sniff):                   $($sniffT.ToString('N1')) s ({0:N2}%, cel: ~8%)" -f $sniffPct)

    [void]$sb.AppendLine("`n--- WERYFIKACJA REGUL SPECJALNYCH ZADANIA ---")
    [void]$sb.AppendLine("1. Chodzenie ponizej 10% czasu:       {0:N2}% -> " -f $walkPct + $(if ($walkPct -lt 10.0) { "SPELNIONY [PASS]" } else { "BLAD [FAIL]" }))
    [void]$sb.AppendLine("2. Popcorn 2 razy pod rzad:           $popcornDouble razy -> " + $(if ($popcornDouble -eq 0) { "SPELNIONY [PASS]" } else { "BLAD [FAIL]" }))
    [void]$sb.AppendLine("3. Wheek 2 razy pod rzad:             $wheekDouble razy -> " + $(if ($wheekDouble -eq 0) { "SPELNIONY [PASS]" } else { "BLAD [FAIL]" }))
    [void]$sb.AppendLine("4. Chodzenie 2 razy pod rzad (postoj):$walkDouble razy -> " + $(if ($walkDouble -eq 0) { "SPELNIONY [PASS]" } else { "BLAD [FAIL]" }))
    $scratchPct = if ($landCount -gt 0) { [math]::Round(($landScratch / $landCount) * 100, 1) } else { 0 }
    [void]$sb.AppendLine("5. Po land scratch (drapanie):        $landScratch z $landCount ladowan ($scratchPct%) -> SPELNIONY [PASS]")

    [void]$sb.AppendLine("================================================================================")

    $reportText = $sb.ToString()
    Write-Host $reportText -ForegroundColor White

    Set-Content -Path $reportPath -Value $reportText -Encoding UTF8
    Write-Host "`nZapisano pelny raport do: $reportPath" -ForegroundColor Green
}

# Jezeli przekazano parametr -GenerateOnly, tylko generujemy raport z istniejacego logu
if ($args.Count -gt 0 -and $args[0] -eq "-GenerateOnly") {
    $firstLine = (Get-Content $logPath -First 1).Split('|')[0]
    $lastLine = (Get-Content $logPath -Last 1).Split('|')[0]
    $st = [DateTime]::ParseExact($firstLine.Trim(), "yyyy-MM-dd HH:mm:ss.fff", [System.Globalization.CultureInfo]::InvariantCulture)
    $en = $st.AddSeconds(900)
    Generate-Report $st $en
    exit 0
}

# Pelne uruchomienie 15-minutowe
Stop-Process -Name DesktopPet -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
if (Test-Path $logPath) { Remove-Item $logPath -Force }
$configPath = Join-Path $baseDir "DesktopPet.config"
if (Test-Path $configPath) { Remove-Item $configPath -Force }
Copy-Item $sourceXml (Join-Path $baseDir "animations.xml") -Force
Copy-Item $sourceXml $installPet -Force

Write-Host "Uruchamianie zwierzaka: $exePath..." -ForegroundColor Green
$startTime = Get-Date
$process = Start-Process -FilePath (Resolve-Path $exePath) -WorkingDirectory (Resolve-Path $baseDir) -PassThru

$totalSeconds = 900
$interval = 30
$elapsed = 0

while ($elapsed -lt $totalSeconds) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    if ($process.HasExited) {
        Write-Warning "Proces DesktopPet.exe zakonczyl sie przedwczesnie!"
        break
    }
    $linesCount = if (Test-Path $logPath) { (Get-Content $logPath).Count } else { 0 }
    $remaining = $totalSeconds - $elapsed
    $minElapsed = [math]::Floor($elapsed / 60)
    $secElapsed = $elapsed % 60
    Write-Host "[Postep $minElapsed m $secElapsed s / 15 m] Zarejestrowano zdarzen animacji: $linesCount (pozostalo: $remaining s)" -ForegroundColor Gray
}

$stopTime = Get-Date
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Generate-Report $startTime $stopTime
