get-content .env | ForEach-Object {
    $name, $value = $_.split('=')
    set-content env:\$name $value
}

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($env:BASIC_AUTH_USER + ":" + $env:BASIC_AUTH_PASS))
}
$body = @{
    licenseKey = "TEST-LICENSE-123"
    expiryDate = "2025-12-31"
    userName   = "TestKey"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/add-license" -Method Post -Headers $headers -Body $body -ContentType "application/json"

$body = @{
    licenseKey = "TEST-LICENSE-123-EXPIRED"
    expiryDate = "2024-12-31"
    userName   = "TestKey-Expired"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/add-license" -Method Post -Headers $headers -Body $body -ContentType "application/json"
