get-content .env | ForEach-Object {
    $name, $value = $_.split('=')
    set-content env:\$name $value
}


$body = @{
    licenseKey = "TEST-LICENSE-123"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/validate" -Method Post -Body $body -ContentType "application/json"


$body = @{
    licenseKey = "TEST-LICENSE-123-INVALIDKEY"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/validate" -Method Post -Body $body -ContentType "application/json"

$body = @{
    licenseKey = "TEST-LICENSE-123-EXPIRED"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/validate" -Method Post -Body $body -ContentType "application/json"