; Inno Setup script for the Cuy installer / updater (one Setup.exe does both).
; Built by .github/workflows/release.yml:
;   iscc /DAppVersion=2.6.160 /DSourceDir=dist\Cuy_v1 /DOutDir=dist installer\Cuy.iss
; Per-user install (no admin rights), so the in-app updater can replace files later.
; Running a newer Setup over an existing install upgrades it (same AppId, same folder).
; The save in %AppData%\Cuy is never touched, also not by the uninstaller.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\dist\Cuy_v1"
#endif
#ifndef OutDir
  #define OutDir "..\dist"
#endif

[Setup]
AppId={{0FB0BDE5-4A2D-4742-BC3E-D3224A629233}
AppName=Cuy
AppVersion={#AppVersion}
AppPublisher=olubiec
AppPublisherURL=https://github.com/olubiec/swinka
AppSupportURL=https://github.com/olubiec/swinka/issues
AppUpdatesURL=https://github.com/olubiec/swinka/releases
DefaultDirName={localappdata}\Programs\Cuy
DefaultGroupName=Cuy
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
OutputDir={#OutDir}
OutputBaseFilename=Cuy-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\Cuy.exe
UninstallDisplayName=Cuy
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no
LicenseFile={#SourceDir}\THIRD_PARTY_NOTICES.md
VersionInfoVersion={#AppVersion}

[Languages]
Name: "polish"; MessagesFile: "compiler:Languages\Polish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "autostart"; Description: "Uruchamiaj Cuy razem z Windows / Start Cuy with Windows"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Cuy"; Filename: "{app}\Cuy.exe"
Name: "{autodesktop}\Cuy"; Filename: "{app}\Cuy.exe"; Tasks: desktopicon
Name: "{userstartup}\Cuy"; Filename: "{app}\Cuy.exe"; Tasks: autostart

[Run]
Filename: "{app}\Cuy.exe"; Description: "{cm:LaunchProgram,Cuy}"; Flags: nowait postinstall skipifsilent
