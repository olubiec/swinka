#!/bin/bash
export DOTNET_ROLL_FORWARD=Major
dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
