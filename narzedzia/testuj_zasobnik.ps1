# Test automatyczny dla zadania B5: menu w zasobniku, ikona glowa_swinki, tooltip i Domek

$ErrorActionPreference = "Stop"

Write-Host "=== TEST ZADANIA B5: MENU W ZASOBNIKU ===" -ForegroundColor Cyan

# Ścieżka do skompilowanej biblioteki DesktopPet i SwinkaCore
$binDir = Resolve-Path "esheep/build/DesktopPetPortable/bin/Debug"
$exePath = Join-Path $binDir "DesktopPet.exe"
$coreDll = Join-Path $binDir "SwinkaCore.dll"

if (-not (Test-Path $exePath)) {
    Write-Error "Nie znaleziono $exePath - skompiluj projekt najpierw!"
}

Add-Type -Path $coreDll
[System.Reflection.Assembly]::LoadFrom($exePath) | Out-Null
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Inicjalizacja kontrolera mózgu
[DesktopPet.SwinkaBrainController]::Initialize(1.0)
$ctrl = [DesktopPet.SwinkaBrainController]::Instance
$pet = $ctrl.Pet

Write-Host "1. Inicjalizacja SwinkaBrainController..." -ForegroundColor Yellow
if ($ctrl -eq $null -or $pet -eq $null) {
    throw "SwinkaBrainController lub Pet jest null!"
}
Write-Host "   OK: SwinkaBrainController i Pet zainicjalizowane." -ForegroundColor Green

# 2. Test ikony w zasobniku (glowa_swinki)
Write-Host "2. Test ikony w zasobniku (SwinkaIcons.GetTrayIcon)..." -ForegroundColor Yellow
$icon = [DesktopPet.SwinkaIcons]::GetTrayIcon()
if ($icon -eq $null) {
    throw "GetTrayIcon() zwróciło null!"
}
Write-Host "   OK: Ikona załadowana, wymiary: $($icon.Width)x$($icon.Height)" -ForegroundColor Green

# 3. Test ikon przedmiotów (SwinkaIcons.GetIconBitmap)
Write-Host "3. Test ikon przedmiotów (SwinkaIcons.GetIconBitmap)..." -ForegroundColor Yellow
$bmpSiano = [DesktopPet.SwinkaIcons]::GetIconBitmap("siano")
$bmpDomek = [DesktopPet.SwinkaIcons]::GetIconBitmap("domek")
$bmpHead = [DesktopPet.SwinkaIcons]::GetIconBitmap("glowa_swinki")
if ($bmpSiano -eq $null -or $bmpDomek -eq $null -or $bmpHead -eq $null) {
    throw "Nie udało się wyciąć ikon z ikony_16.png!"
}
Write-Host "   OK: Ikony siano, domek, glowa_swinki wycięte poprawnie (16x16)." -ForegroundColor Green

# 4. Test menu w zasobniku (ContextMenus.Create)
Write-Host "4. Test menu w zasobniku (ContextMenus.Create)..." -ForegroundColor Yellow
$cm = New-Object DesktopPet.ContextMenus
$menu = $cm.Create()

$itemTexts = @()
foreach ($it in $menu.Items) {
    if ($it.Text) { $itemTexts += $it.Text }
}
Write-Host "   Elementy menu: $($itemTexts -join ', ')"

$hasNakarm = ($itemTexts -contains "Nakarm")
$hasZawolaj = ($itemTexts | Where-Object { $_ -match "^Zawo" }) -ne $null
$hasDomek = ($itemTexts -contains "Domek")
$hasUstawienia = ($itemTexts -contains "Ustawienia")
$hasZamknij = ($itemTexts -contains "Zamknij")

if (-not ($hasNakarm -and $hasZawolaj -and $hasDomek -and $hasUstawienia -and $hasZamknij)) {
    throw "W menu brakuje wymaganego elementu! Znalezione: $($itemTexts -join ', ')"
}
Write-Host "   OK: Menu zawiera wszystkie wymagane elementy: Nakarm, Zawołaj, Domek, Ustawienia, Zamknij." -ForegroundColor Green

# 5. Test podmenu Nakarm - zawsze Siano bez limitu
Write-Host "5. Test podmenu Nakarm..." -ForegroundColor Yellow
$feedItem = $null
foreach ($it in $menu.Items) {
    if ($it.Text -eq "Nakarm") { $feedItem = $it; break }
}
if ($feedItem -eq $null) { throw "Nie znaleziono menu Nakarm!" }

[DesktopPet.ContextMenus]::PopulateFeedSubmenu($feedItem)
$subItems = @()
foreach ($sub in $feedItem.DropDownItems) {
    if ($sub.Text) { $subItems += $sub.Text }
}
Write-Host "   Podmenu Nakarm: $($subItems -join ', ')"

if (-not ($subItems -contains "Siano (bez limitu)")) {
    throw "Podmenu Nakarm nie zawiera pozycji 'Siano (bez limitu)'!"
}
Write-Host "   OK: Podmenu Nakarm zawiera 'Siano (bez limitu)'." -ForegroundColor Green

# 6. Test podmenu Nakarm z przedmiotami z ekwipunku
Write-Host "6. Test podmenu Nakarm z ekwipunkiem..." -ForegroundColor Yellow
$pet.AddItem("papryka", 3)
$pet.AddItem("marchewka", 1)

[DesktopPet.ContextMenus]::PopulateFeedSubmenu($feedItem)
$subItemsWithInv = @()
foreach ($sub in $feedItem.DropDownItems) {
    if ($sub.Text) { $subItemsWithInv += $sub.Text }
}
Write-Host "   Podmenu Nakarm z ekwipunkiem: $($subItemsWithInv -join ', ')"

$hasPapryka = $false
$hasMarchewka = $false
foreach ($txt in $subItemsWithInv) {
    if ($txt -match "Papryka \(3\)") { $hasPapryka = $true }
    if ($txt -match "Marchewka \(1\)") { $hasMarchewka = $true }
}
if (-not $hasPapryka -or -not $hasMarchewka) {
    throw "Podmenu Nakarm nie wyświetla poprawnie przedmiotów z ekwipunku z liczbą sztuk!"
}
Write-Host "   OK: Przedmioty z ekwipunku wyświetlane poprawnie: Papryka (3), Marchewka (1)." -ForegroundColor Green

# 7. Test karmienia (Feed)
Write-Host "7. Test karmienia (Siano i Papryka)..." -ForegroundColor Yellow
$pet.Needs.Satiety = 50.0
$pet.Needs.VitaminC = 20.0

$ctrl.Feed("siano")
if ($pet.Needs.Satiety -ne 60.0) {
    throw "Karmienie sianem nie podniosło najedzenia o 10! Jest: $($pet.Needs.Satiety)"
}

$ctrl.Feed("papryka")
if ($pet.GetItemCount("papryka") -ne 2) {
    throw "Zużycie papryki nie zmniejszyło licznika w ekwipunku! Jest: $($pet.GetItemCount('papryka'))"
}
if ($pet.Needs.VitaminC -lt 50.0) {
    throw "Papryka nie podniosła witaminy C! Jest: $($pet.Needs.VitaminC)"
}
Write-Host "   OK: Karmienie sianem i papryką działa poprawnie." -ForegroundColor Green

# 8. Test zawołania świnki (Zawołaj)
Write-Host "8. Test interakcji 'Zawołaj'..." -ForegroundColor Yellow
$initialBondPoints = $pet.State.Bond.Points
$ctrl.CallPet()
if ($pet.State.Bond.Points -le $initialBondPoints) {
    throw "Zawołanie świnki nie dodało punktu więzi!"
}
Write-Host "   OK: 'Zawołaj' dodaje punkty więzi i loguje reakcję." -ForegroundColor Green

# 9. Test tooltipa NotifyIcon (ProcessIcon.UpdateTooltip)
Write-Host "9. Test tooltipa (imię świnki i najniższa potrzeba)..." -ForegroundColor Yellow
$pi = New-Object DesktopPet.ProcessIcon
$pi.Display()

$piField = [DesktopPet.ProcessIcon].GetField("ni", [System.Reflection.BindingFlags]"NonPublic,Instance")
$niObj = $piField.GetValue($pi)
$tooltipText = $niObj.Text

Write-Host "   Wygenerowany tooltip: '$tooltipText'"
$lowestNeed = $pet.Needs.Lowest()
$lowestPolish = [SwinkaCore.NeedNames]::Polish($lowestNeed)

if (-not $tooltipText.Contains($pet.State.Name) -or -not $tooltipText.Contains($lowestPolish)) {
    throw "Tooltip '$tooltipText' nie zawiera imienia świnki ('$($pet.State.Name)') lub najniższej potrzeby ('$lowestPolish')!"
}
Write-Host "   OK: Tooltip zawiera imię świnki i najniższą potrzebę: '$tooltipText'" -ForegroundColor Green
$pi.Dispose()

# 10. Test okna Domku (FormDomek)
Write-Host "10. Test okna Domku (FormDomek)..." -ForegroundColor Yellow
[DesktopPet.FormDomek]::ShowDomek()
$domekInstanceField = [DesktopPet.FormDomek].GetField("_instance", [System.Reflection.BindingFlags]"NonPublic,Static")
$domekObj = $domekInstanceField.GetValue($null)

if ($domekObj -eq $null -or -not $domekObj.Visible) {
    throw "FormDomek.ShowDomek() nie otworzyło okna Domku!"
}
if (-not $domekObj.Text.StartsWith("Domek")) {
    throw "Tytuł okna Domku to '$($domekObj.Text)', oczekiwano 'Domek świnki'!"
}
Write-Host "   OK: Okno Domku otwarte pomyślnie, rozmiar: $($domekObj.Width)x$($domekObj.Height), tytuł: '$($domekObj.Text)'" -ForegroundColor Green
$domekObj.Hide()

Write-Host "`n=== WSZYSTKIE TESTY ZADANIA B5 ZAKOŃCZONE POWODZENIEM! ===" -ForegroundColor Green
