#!/usr/bin/env bash
# Environment script for Jules (Settings -> repo -> Configuration -> Run and Snapshot).
# Light and finite: installs the .NET 9 SDK if missing, restores/builds the Core tests, installs the web QA tools.
# Never starts a dev server or the game.
set -e

need_dotnet=1
if command -v dotnet >/dev/null 2>&1 && dotnet --list-sdks | grep -q '^9\.'; then need_dotnet=0; fi
if [ "$need_dotnet" = "1" ]; then
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 9.0 --install-dir "$HOME/.dotnet"
  export PATH="$HOME/.dotnet:$PATH"
  grep -q '.dotnet' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.dotnet:$PATH"' >> "$HOME/.bashrc"
fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

dotnet restore tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj
dotnet build tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --no-restore

npm --prefix tools/qa ci
# Chromium for the Home smoke test (the Jules base image already ships Playwright browsers; this is a no-op then)
npx --prefix tools/qa playwright install chromium || true
