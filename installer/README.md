# Cuy - Instalator i Auto-Update

Ten folder zawiera narzędzia instalacyjne i skrypty auto-aktualizacji dla gry **Cuy (Pixel Art Guinea Pig Desktop Pet)**.

---

## 📦 Sposoby uruchomienia i instalacji

### Opcja 0 (zalecana): `Cuy-Setup-<wersja>.exe` z GitHub Releases
Zwykły kreator instalacji (Inno Setup, skrypt `Cuy.iss`): bez uprawnień administratora, skróty w Menu Start i opcjonalnie na Pulpicie, opcjonalny autostart, deinstalacja w „Aplikacje i funkcje”. Uruchomiony na zainstalowanej wersji robi aktualizację w miejscu; zapis w `%AppData%\Cuy` zostaje. Plik buduje workflow `.github/workflows/release.yml` po wypchnięciu taga `vX.Y.Z` zgodnego z `AssemblyVersion`.

### Opcja 1: Skrypt `Cuy-Installer.cmd`
1. Kliknij dwukrotnie plik `Cuy-Installer.cmd`.
2. Skrypt automatycznie:
   - Tworzy katalog gry w `%LocalAppData%\Programs\Cuy`.
   - Wypakowuje i kopiuje wszystkie niezbędne pliki wykonywalne, biblioteki i zasoby graficzno-dźwiękowe.
   - Tworzy skrót na Twoim **Pulpicie**.
   - Pozwala od razu uruchomić grę.

### Opcja 2: Wersja przenośna (Portable ZIP)
1. Pobierz plik `Cuy_v1.zip` z sekcji [Releases](https://github.com/olubiec/swinka/releases).
2. Rozpakuj archiwum w dowolnym folderze (np. na Pulpicie lub dysku `C:\Gry\Cuy`).
3. Uruchom `Cuy.exe`.

---

## 🌐 Jak działa Auto-Update (Aktualizacje przez internet)

Gra posiada wbudowany, automatyczny system sprawdzania i pobierania aktualizacji:
1. **Wykrywanie nowej wersji:**
   - Cuy przy połączeniu z internetem sprawdza API GitHub Releases (`olubiec/swinka`) co 4 godziny lub na żądanie w panelu **Settings -> Game Updates**.
   - Po opublikowaniu nowego wydania (np. `v1.1.0`), w zakładce **Settings** w oknie Home pojawia się plakietka **`NEW`** oraz powiadomienie.
2. **Pobieranie i instalacja:**
   - Kliknięcie przycisku **"Update & Restart"** w Settings automatycznie pobiera nową wersję w tle.
   - Po pobraniu archiwum skrypt `apply-update.cmd` podmienia pliki programu i ponownie uruchamia Cuy.
3. **Bezpieczeństwo danych i stan zapisu:**
   - Twój postęp, imię świnki, poziom więzi, odblokowane sztuczki i koniczynki są zapisywane w `%AppData%\Cuy\save.json` – aktualizacja programu **nigdy nie kasuje ani nie modyfikuje Twoich zapisów**.

