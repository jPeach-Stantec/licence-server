$body = @{
    licenseKey = "TEST-LICENSE-123"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri ($env:DEPLOYED_URL + "validate") -Method Post -Body $body -ContentType "application/json"
