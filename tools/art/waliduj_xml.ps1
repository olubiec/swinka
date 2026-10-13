$ErrorActionPreference = "Stop"
$settings = New-Object System.Xml.XmlReaderSettings
$settings.ValidationType = [System.Xml.ValidationType]::Schema
$schema = [System.Xml.Schema.XmlSchema]::Read([System.IO.File]::OpenRead("esheep/src/Resources/animations.xsd"), $null)
$settings.Schemas.Add($schema) | Out-Null
$hasErrors = $false
$settings.add_ValidationEventHandler({
    param($sender, $e)
    Write-Host "Validation Error: $($e.Message)"
    $script:hasErrors = $true
})
$reader = [System.Xml.XmlReader]::Create("esheep/src/Resources/animations.xml", $settings)
while ($reader.Read()) {}
$reader.Close()
if ($hasErrors) {
    Write-Host "FAILED: Schema validation errors detected."
    exit 1
} else {
    Write-Host "SUCCESS: animations.xml strictly complies with animations.xsd!"
}
