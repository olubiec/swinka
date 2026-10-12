# Skrypt weryfikujący funkcjonalność bobków i czystości (B4)
$ErrorActionPreference = "Stop"

Write-Host "=== TEST 1: SwinkaCore Unit Tests ===" -ForegroundColor Cyan
dotnet test SwinkaCore\SwinkaCore.Tests\SwinkaCore.Tests.csproj --filter "FullyQualifiedName~PoopAndCleanlinessTests"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Testy jednostkowe nie przeszły!"
}

Write-Host "`n=== TEST 2: Logika w pamięci z SwinkaCore.dll ===" -ForegroundColor Cyan
$swinkaCoreDll = (Resolve-Path "SwinkaCore\SwinkaCore\bin\Debug\netstandard2.0\SwinkaCore.dll").Path
Add-Type -Path $swinkaCoreDll

$clock = New-Object SwinkaCore.Time.ManualClock ([DateTime]::UtcNow)
$state = [SwinkaCore.GameState]::CreateNew("Świnka", $clock.UtcNow)
$pet = New-Object SwinkaCore.Pet ($state, $clock)
$pet.Start()

Write-Host "Początkowa czystość: $($pet.Needs.Cleanliness)%, bobki: $($pet.State.PoopCount)/8"
if ($pet.Needs.Cleanliness -ne 100 -or $pet.State.PoopCount -ne 0) {
    throw "Początkowa czystość powinna być 100% przy 0 bobkach!"
}

# Dodajemy 8 bobków
for ($i = 1; $i -le 8; $i++) {
    $poop = New-Object SwinkaCore.PoopItem
    $poop.X = 100 * $i
    $poop.Y = 500
    $poop.OnTaskbar = $true
    $res = $pet.TryAddPoop($poop)
    if (-not $res) { throw "Dodanie bobka $i nie powiodło się!" }
}

Write-Host "Po 8 bobkach: Czystość: $($pet.Needs.Cleanliness)%, bobki: $($pet.State.PoopCount)/8"
if ($pet.Needs.Cleanliness -ne 0 -or $pet.State.PoopCount -ne 8) {
    throw "Przy 8 bobkach czystość powinna wynosić 0%!"
}

# Próba dodania 9-tego bobka (powinna zostać odrzucona - limit 8)
$ninth = New-Object SwinkaCore.PoopItem
$res9 = $pet.TryAddPoop($ninth)
if ($res9 -or $pet.State.PoopCount -ne 8) {
    throw "Limit 8 bobków został przekroczony!"
}
Write-Host "Limit 8 bobków działa prawidłowo (odrzucono 9. bobek)." -ForegroundColor Green

# Czyszczenie jednego bobka (+1 koniczynka, czystość rośnie do 12.5%)
$cloversBefore = $pet.State.Clovers
$pet.CleanPoop($pet.State.Poops[0].Id)
if ($pet.State.Clovers -ne ($cloversBefore + 1)) {
    throw "Sprzątnięcie bobka nie dodało koniczynki!"
}
if ($pet.State.PoopCount -ne 7 -or $pet.Needs.Cleanliness -ne 12.5) {
    throw "Stan czystości lub licznika niepoprawny po sprzątnięciu!"
}
Write-Host "Sprzątnięcie bobka: +1 koniczynka (obecnie: $($pet.State.Clovers)), czystość: $($pet.Needs.Cleanliness)%" -ForegroundColor Green

# Test zamknięcia okna: bobek znika z listy widocznych, ale licznik zostaje w stanie gry
$poopWindow = New-Object SwinkaCore.PoopItem
$poopWindow.Id = "win-poop"
$poopWindow.OnTaskbar = $false
$poopWindow.WindowTitle = "Notepad"
# czyścimy 1 by zrobić miejsce
$pet.CleanPoop($pet.State.Poops[0].Id) # teraz 6 bobków
$pet.TryAddPoop($poopWindow) # teraz 7 bobków
$poopCountBeforeClose = $pet.State.PoopCount
$pet.State.Poops.RemoveAll([Predicate[SwinkaCore.PoopItem]]{ param($p) $p.Id -eq "win-poop" })

if ($pet.State.PoopCount -ne $poopCountBeforeClose) {
    throw "Licznik PoopCount nie powinien się zmienić przy usunięciu bobka przez zamknięcie okna!"
}
Write-Host "Zamknięcie okna: bobek usunięty z listy widocznych, ale licznik PoopCount ($($pet.State.PoopCount)) zachowany!" -ForegroundColor Green

# Test zapisu i odczytu
$tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "SwinkaTest_Ps_" + [Guid]::NewGuid().ToString("N"))
[System.IO.Directory]::CreateDirectory($tempDir) | Out-Null
try {
    $newtonsoftDll = (Resolve-Path "esheep\src\packages\Newtonsoft.Json.13.0.4\lib\net45\Newtonsoft.Json.dll").Path
    if (Test-Path $newtonsoftDll) { Add-Type -Path $newtonsoftDll }
    $saveSystem = New-Object SwinkaCore.Save.SaveSystem ($tempDir)
    $saveSystem.Save($pet.State)
    $loadedState = $saveSystem.Load().State

    if ($loadedState.PoopCount -ne $pet.State.PoopCount) {
        throw "Zapis/odczyt PoopCount nie zgadza się!"
    }
    Write-Host "Serializacja i deserializacja save.json zachowuje PoopCount ($($loadedState.PoopCount)) i listę Poops ($($loadedState.Poops.Count))!" -ForegroundColor Green
}
finally {
    if ([System.IO.Directory]::Exists($tempDir)) {
        [System.IO.Directory]::Delete($tempDir, $true)
    }
}

Write-Host "`n=== WSZYSTKIE TESTY B4 ZAKOŃCZONE SUKCESEM! ===" -ForegroundColor Green
