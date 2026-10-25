cat patch_test.cs > Program.cs
csc Program.cs /r:src/Cuy.Core/bin/Release/netstandard2.0/Cuy.Core.dll && ./Program.exe
