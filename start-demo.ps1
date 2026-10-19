# Client Credentials Grant Demo - Startup Script
# Windows convenience wrapper around the npm scripts in package.json
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
$minimumNodeMajor = 24
Write-Host "Using Node.js version: $nodeVersion" -ForegroundColor Cyan
if ([int]$nodeVersion.TrimStart('v').Split('.')[0] -lt $minimumNodeMajor) {
    Write-Host "Error: Node.js $minimumNodeMajor or newer is required." -ForegroundColor Red
    exit 1
}

# Run all commands from the repository root
Push-Location $PSScriptRoot

try {
    # Install dependencies for all apps (npm workspaces)
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: npm install failed." -ForegroundColor Red
        exit 1
    }

    # Start Keycloak and wait until its health check reports it ready
    Write-Host "Starting Keycloak and waiting until it is ready..." -ForegroundColor Yellow
    npm run keycloak:up
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Keycloak failed to start." -ForegroundColor Red
        exit 1
    }

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

    # Start the APIs and frontends; each output line is prefixed with the app name
    npm run dev
}
finally {
    # Clean up when the script exits or is interrupted
    Write-Host "`nStopping Docker containers..." -ForegroundColor Yellow
    npm run keycloak:down
    Pop-Location

    Write-Host "All services stopped." -ForegroundColor Green
}
