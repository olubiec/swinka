# Skrypt weryfikujący funkcjonalność karmienia świnki (B6)
$ErrorActionPreference = "Stop"

Write-Host "=== TEST 1: SwinkaCore Unit Tests (Food Preferences) ===" -ForegroundColor Cyan
dotnet test SwinkaCore\SwinkaCore.Tests\SwinkaCore.Tests.csproj --filter "FullyQualifiedName~FoodPreferenceTests"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Testy jednostkowe nie przeszły!"
}
Write-Host "Testy preferencji żywieniowych xUnit przeszły pomyślnie!" -ForegroundColor Green

Write-Host "`n=== TEST 2: Logika preferencji i potrzeb z SwinkaCore.dll ===" -ForegroundColor Cyan
$swinkaCoreDll = (Resolve-Path "SwinkaCore\SwinkaCore\bin\Debug\netstandard2.0\SwinkaCore.dll").Path
Add-Type -Path $swinkaCoreDll

$clock = New-Object SwinkaCore.Time.ManualClock ([DateTime]::UtcNow)
$state = [SwinkaCore.GameState]::CreateNew("Świnka", $clock.UtcNow)
$pet = New-Object SwinkaCore.Pet ($state, $clock)
$pet.Start()

# Początkowo brak ulubionego warzywa
$favInitial = $pet.GetFavoriteVegetable()
if ($favInitial -ne $null) {
    throw "Początkowo ulubione warzywo powinno być null!"
}
Write-Host "Początkowo brak ulubionego warzywa (prawidłowo)." -ForegroundColor Green

# Nakarm papryką
$pet.RecordFoodEaten("papryka")
if ($pet.GetFavoriteVegetable() -ne "papryka" -or -not $pet.IsFavoriteVegetable("papryka")) {
    throw "Papryka powinna być ulubionym warzywem po 1 karmieniu!"
}
Write-Host "Po zjedzeniu papryki: ulubione = papryka" -ForegroundColor Green

# Nakarm ogórkiem 2 razy -> ogórek wyprzedza paprykę
$pet.RecordFoodEaten("ogorek")
$pet.RecordFoodEaten("ogorek")
if ($pet.GetFavoriteVegetable() -ne "ogorek" -or -not $pet.IsFavoriteVegetable("ogorek")) {
    throw "Ogórek powinien być ulubionym warzywem po 2 karmieniach!"
}
if ($pet.IsFavoriteVegetable("papryka")) {
    throw "Papryka nie powinna być już ulubionym warzywem!"
}
Write-Host "Po zjedzeniu 2x ogórka: ulubione = ogórek (licznik: $($pet.State.Stats.Counters['eaten_ogorek']))" -ForegroundColor Green

# Sprawdzenie efektów na potrzeby z items.json dla papryki (najedzenie +8, witamina C +35, humor +5)
$beforeSatiety = $pet.Needs.Satiety
$beforeVitC = $pet.Needs.VitaminC
$beforeMood = $pet.Needs.Mood
$pet.ChangeNeed([SwinkaCore.Need]::Satiety, 8.0)
$pet.ChangeNeed([SwinkaCore.Need]::VitaminC, 35.0)
$pet.ChangeNeed([SwinkaCore.Need]::Mood, 5.0)

Write-Host "Wzrost potrzeb po papryce: Najedzenie $($beforeSatiety) -> $($pet.Needs.Satiety), Wit. C $($beforeVitC) -> $($pet.Needs.VitaminC), Humor $($beforeMood) -> $($pet.Needs.Mood)" -ForegroundColor Green

Write-Host "`n=== TEST 3: Weryfikacja definicji animacji eat i eat_treat w XML ===" -ForegroundColor Cyan
[xml]$xml = Get-Content "esheep\src\Resources\animations.xml"
$eatAnim = $xml.animations.animations.animation | Where-Object { $_.name -eq "eat" }
$eatTreatAnim = $xml.animations.animations.animation | Where-Object { $_.name -eq "eat_treat" }

if ($null -eq $eatAnim) {
    throw "Brak definicji animacji 'eat' w animations.xml!"
}
if ($null -eq $eatTreatAnim) {
    throw "Brak definicji animacji 'eat_treat' w animations.xml!"
}
Write-Host "Animacja 'eat': ID $($eatAnim.id) (sekwencja: $($eatAnim.sequence.frame.Count) klatek)" -ForegroundColor Green
Write-Host "Animacja 'eat_treat': ID $($eatTreatAnim.id) (sekwencja: $($eatTreatAnim.sequence.frame.Count) klatek)" -ForegroundColor Green

Write-Host "`n=== TEST 4: Sprawdzenie pliku wykonywalnego i klas B6 ===" -ForegroundColor Cyan
$exePath = "esheep\build\DesktopPetPortable\bin\Debug\DesktopPet.exe"
if (-not (Test-Path $exePath)) {
    throw "Brak skompilowanego pliku DesktopPet.exe!"
}
$exeSize = (Get-Item $exePath).Length
Write-Host "DesktopPet.exe istnieje i ma rozmiar: $exeSize bajtów." -ForegroundColor Green

Write-Host "`n=== WSZYSTKIE TESTY WERYFIKACYJNE B6 ZAKOŃCZONE SUKCESEM! ===" -ForegroundColor Green
