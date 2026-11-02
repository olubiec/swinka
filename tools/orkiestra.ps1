param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgsList
)
& python -m orkiestra @ArgsList
exit $LASTEXITCODE
