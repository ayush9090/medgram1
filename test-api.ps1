# API Test Script
$baseUrl = "http://74.208.158.126:3000"

Write-Host "Testing MedGram API..." -ForegroundColor Green
Write-Host ""

# Test 1: Get Feed (should work without auth)
Write-Host "1. Testing GET /feed..." -ForegroundColor Yellow
try {
    $feed = Invoke-RestMethod -Uri "$baseUrl/feed" -Method Get
    Write-Host "✅ Feed endpoint works!" -ForegroundColor Green
    Write-Host "   Posts found: $($feed.Count)" -ForegroundColor Cyan
    if ($feed.Count -gt 0) {
        Write-Host "   First post: $($feed[0].content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Feed endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Register a test user
Write-Host "2. Testing POST /auth/register..." -ForegroundColor Yellow
$registerData = @{
    username = "testuser_$(Get-Random)"
    password = "test123"
    fullName = "Test User"
    role = "USER"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerData -ContentType "application/json"
    Write-Host "✅ Registration works!" -ForegroundColor Green
    Write-Host "   User: $($register.user.username)" -ForegroundColor Cyan
    Write-Host "   Token received: $($register.token.Substring(0, 20))..." -ForegroundColor Gray
    $token = $register.token
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $token = $null
}
Write-Host ""

# Test 3: Login (if registration worked, try with same credentials)
if ($token) {
    Write-Host "3. Testing POST /auth/login..." -ForegroundColor Yellow
    $loginData = @{
        username = ($registerData | ConvertFrom-Json).username
        password = "test123"
    } | ConvertTo-Json
    
    try {
        $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginData -ContentType "application/json"
        Write-Host "✅ Login works!" -ForegroundColor Green
        Write-Host "   User: $($login.user.username)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: Get Presigned URL (requires auth)
if ($token) {
    Write-Host "4. Testing POST /upload/presigned (with auth)..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $uploadData = @{
        filename = "test-video.mp4"
    } | ConvertTo-Json
    
    try {
        $presigned = Invoke-RestMethod -Uri "$baseUrl/upload/presigned" -Method Post -Body $uploadData -Headers $headers
        Write-Host "✅ Presigned URL endpoint works!" -ForegroundColor Green
        Write-Host "   Upload URL received: $($presigned.uploadUrl.Substring(0, 50))..." -ForegroundColor Gray
    } catch {
        Write-Host "❌ Presigned URL failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "API Testing Complete!" -ForegroundColor Green

