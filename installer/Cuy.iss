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

[Code]
// Cuy's Home needs the Microsoft Edge WebView2 runtime. Windows 10 may not have it:
// download the small Evergreen bootstrapper and run it when the runtime is missing.
const
  WebView2Guid = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function WebView2Installed: Boolean;
var
  V: String;
begin
  Result := False;
  if RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', V) and (V <> '') and (V <> '0.0.0.0') then Result := True
  else if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', V) and (V <> '') and (V <> '0.0.0.0') then Result := True
  else if RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', V) and (V <> '') and (V <> '0.0.0.0') then Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Code: Integer;
begin
  if (CurStep = ssPostInstall) and (not WebView2Installed) then
  begin
    try
      WizardForm.StatusLabel.Caption := 'Pobieranie Microsoft Edge WebView2 (potrzebne do okna Home)...';
      DownloadTemporaryFile('https://go.microsoft.com/fwlink/p/?LinkId=2124703', 'MicrosoftEdgeWebview2Setup.exe', '', nil);
      WizardForm.StatusLabel.Caption := 'Instalowanie Microsoft Edge WebView2...';
      Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_SHOW, ewWaitUntilTerminated, Code);
    except
      Log('WebView2 install failed: ' + GetExceptionMessage);
      MsgBox('Nie udało się zainstalować Microsoft Edge WebView2. Okno Home nie otworzy się, dopóki go nie zainstalujesz: https://go.microsoft.com/fwlink/p/?LinkId=2124703', mbInformation, MB_OK);
    end;
  end;
end;
