# Client Credentials Grant Demo - Startup Script
Write-Host "Starting Client Credentials Grant Demo..." -ForegroundColor Green

# Function to check if a command exists
function Test-CommandExists {
    param ($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Check for required tools
$requiredTools = @("docker", "npm", "node")
$missingTools = @()

foreach ($tool in $requiredTools) {
    if (-not (Test-CommandExists $tool)) {
        $missingTools += $tool
    }
}

if ($missingTools.Count -gt 0) {
    Write-Host "Error: The following required tools are missing:" -ForegroundColor Red
    foreach ($tool in $missingTools) {
        Write-Host "  - $tool" -ForegroundColor Red
    }
    Write-Host "Please install the missing tools and try again." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$nodeVersion = node -v
Write-Host "Using Node.js version: $nodeVersion" -ForegroundColor Cyan
Write-Host "Recommended version: v22.16.0" -ForegroundColor Cyan

# Create a new job for each component
$jobs = @()

# Start Keycloak
Write-Host "Starting Keycloak..." -ForegroundColor Yellow
$keycloakJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\keycloak
    docker compose up
}
$jobs += @{Name = "Keycloak"; Job = $keycloakJob}

# Wait for Keycloak to start
Write-Host "Waiting for Keycloak to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Start Local API
Write-Host "Starting Local API..." -ForegroundColor Yellow
$localApiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\local-app\api
    npm install
    npm start
}
$jobs += @{Name = "Local API"; Job = $localApiJob}

# Wait for Local API to start
Write-Host "Waiting for Local API to start (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start Local Frontend
Write-Host "Starting Local Frontend..." -ForegroundColor Yellow
$localFrontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\local-app\frontend
    npm install
    npm run dev
}
$jobs += @{Name = "Local Frontend"; Job = $localFrontendJob}

# Start Third-Party API
Write-Host "Starting Third-Party API..." -ForegroundColor Yellow
$thirdPartyApiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\third-party-app\api
    npm install
    npm start
}
$jobs += @{Name = "Third-Party API"; Job = $thirdPartyApiJob}

# Start Third-Party Frontend
Write-Host "Starting Third-Party Frontend..." -ForegroundColor Yellow
$thirdPartyFrontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\third-party-app\frontend
    npm install
    npm run dev
}
$jobs += @{Name = "Third-Party Frontend"; Job = $thirdPartyFrontendJob}

# Display URLs
Write-Host "`nApplication URLs:" -ForegroundColor Green
Write-Host "Keycloak:              http://localhost:8080" -ForegroundColor Cyan
Write-Host "Local API:             http://localhost:3001" -ForegroundColor Cyan
Write-Host "Local Frontend:        http://localhost:5173" -ForegroundColor Cyan
Write-Host "Third-Party API:       http://localhost:3002" -ForegroundColor Cyan
Write-Host "Third-Party Frontend:  http://localhost:5174" -ForegroundColor Cyan

Write-Host "`nKeycloak Admin Credentials:" -ForegroundColor Green
Write-Host "Username: admin" -ForegroundColor Cyan
Write-Host "Password: admin" -ForegroundColor Cyan

Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Yellow

# Monitor jobs and display output
try {
    while ($true) {
        foreach ($jobInfo in $jobs) {
            $jobName = $jobInfo.Name
            $job = $jobInfo.Job

            $jobOutput = Receive-Job -Job $job
            if ($jobOutput) {
                Write-Host "[$jobName] $jobOutput" -ForegroundColor Gray
            }
        }

        Start-Sleep -Seconds 1
    }
}
finally {
    # Clean up jobs when script is interrupted
    Write-Host "`nStopping all services..." -ForegroundColor Yellow

    foreach ($jobInfo in $jobs) {
        $jobName = $jobInfo.Name
        $job = $jobInfo.Job

        Write-Host "Stopping $jobName..." -ForegroundColor Yellow
        Stop-Job -Job $job
        Remove-Job -Job $job -Force
    }

    # Stop Docker containers
    Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
    Set-Location $PWD\keycloak
    docker compose down

    Write-Host "All services stopped." -ForegroundColor Green
}
