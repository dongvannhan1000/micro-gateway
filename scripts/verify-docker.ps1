# Docker Setup Verification Script for Micro-Security Gateway (Windows)
# This script verifies that Docker is properly configured for the Dashboard UI

# Print header
function Print-Header {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Docker Setup Verification" -ForegroundColor Cyan
    Write-Host "  Micro-Security Gateway" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# Print section
function Print-Section {
    param([string]$Message)
    Write-Host "`n→ $Message" -ForegroundColor Cyan
}

# Print success
function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

# Print error
function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Print warning
function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Check if command exists
function Test-CommandExists {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Verify Docker installation
function Verify-Docker {
    Print-Section "Checking Docker Installation"

    if (Test-CommandExists "docker") {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Docker is installed ($dockerVersion)"

            # Check if Docker daemon is running
            try {
                $null = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Print-Success "Docker daemon is running"
                } else {
                    Print-Error "Docker daemon is not running"
                    Write-Host "  Please start Docker Desktop and try again"
                    exit 1
                }
            } catch {
                Print-Error "Docker daemon is not running"
                Write-Host "  Please start Docker Desktop and try again"
                exit 1
            }
        } else {
            Print-Error "Docker is not working correctly"
            exit 1
        }
    } else {
        Print-Error "Docker is not installed"
        Write-Host "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
        exit 1
    }
}

# Verify Docker Compose
function Verify-DockerCompose {
    Print-Section "Checking Docker Compose"

    try {
        $composeVersion = docker compose version --short 2>$null
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Docker Compose is installed (version: $composeVersion)"
        } else {
            Print-Error "Docker Compose is not available"
            Write-Host "  Docker Compose should be included with Docker Desktop"
            exit 1
        }
    } catch {
        Print-Error "Docker Compose is not available"
        Write-Host "  Docker Compose should be included with Docker Desktop"
        exit 1
    }
}

# Verify required files
function Verify-Files {
    Print-Section "Checking Required Files"

    $requiredFiles = @(
        "docker-compose.yml",
        "apps\dashboard-ui\Dockerfile",
        "apps\dashboard-ui\Dockerfile.prod",
        "apps\dashboard-ui\.env.docker",
        ".dockerignore"
    )

    $missingFiles = @()

    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Print-Success "Found: $file"
        } else {
            Print-Error "Missing: $file"
            $missingFiles += $file
        }
    }

    if ($missingFiles.Count -gt 0) {
        Write-Host ""
        Print-Error "Missing required files. Please run: git clone https://github.com/dongvannhan1000/micro-gateway.git"
        exit 1
    }
}

# Verify environment configuration
function Verify-Environment {
    Print-Section "Checking Environment Configuration"

    $envFile = "apps\dashboard-ui\.env"

    if (Test-Path $envFile) {
        Print-Success "Environment file exists: $envFile"

        # Check for required variables
        $requiredVars = @(
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "NEXT_PUBLIC_GATEWAY_URL"
        )

        $envContent = Get-Content $envFile

        foreach ($var in $requiredVars) {
            if ($envContent -match "^$var=") {
                Print-Success "Variable set: $var"
            } else {
                Print-Warning "Variable missing: $var"
            }
        }
    } else {
        Print-Warning "Environment file not found: $envFile"
        Write-Host "  Create it with: copy apps\dashboard-ui\.env.docker apps\dashboard-ui\.env"
        Write-Host "  Then edit with your Supabase credentials"
    }
}

# Verify ports are available
function Verify-Ports {
    Print-Section "Checking Port Availability"

    # Check port 3000 (Dashboard)
    $port3000InUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($port3000InUse) {
        Print-Warning "Port 3000 is already in use"
        Write-Host "  Dashboard UI may not start correctly"
    } else {
        Print-Success "Port 3000 is available"
    }

    # Check port 8787 (Gateway)
    $port8787InUse = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
    if ($port8787InUse) {
        Print-Success "Port 8787 is in use (Gateway API should be running)"
    } else {
        Print-Warning "Port 8787 is not in use"
        Write-Host "  Start Gateway API with: npm run dev:gateway"
    }
}

# Test Docker build
function Verify-DockerBuild {
    Print-Section "Testing Docker Build"

    Write-Host "Building Dashboard Docker image (this may take a few minutes)..."

    $buildOutput = docker compose build dashboard 2>&1
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Docker image built successfully"
    } else {
        Print-Error "Docker build failed"
        Write-Host "  Run with verbose output: docker compose build dashboard"
        exit 1
    }
}

# Summary and next steps
function Print-Summary {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✓ Docker Setup Verification Complete" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:"
    Write-Host ""
    Write-Host "1. Start Gateway API (Terminal 1):"
    Write-Host "   " -NoNewline
    Write-Host "npm run dev:gateway" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Start Dashboard UI in Docker (Terminal 2):"
    Write-Host "   " -NoNewline
    Write-Host "docker compose up dashboard" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Access your gateway:"
    Write-Host "   " -NoNewline
    Write-Host "Dashboard UI:" -ForegroundColor Green -NoNewline
    Write-Host " http://localhost:3000"
    Write-Host "   " -NoNewline
    Write-Host "Gateway API:" -ForegroundColor Green -NoNewline
    Write-Host "  http://localhost:8787"
    Write-Host ""
    Write-Host "For more information, see:"
    Write-Host "  - DOCKER_QUICKSTART.md (quick reference)"
    Write-Host "  - DOCKER.md (complete documentation)"
    Write-Host ""
}

# Main execution
function Main {
    Print-Header

    # Run verification checks
    Verify-Docker
    Verify-DockerCompose
    Verify-Files
    Verify-Environment
    Verify-Ports

    # Ask if user wants to test build
    Write-Host ""
    $testBuild = Read-Host "Do you want to test Docker build? (y/n)"
    if ($testBuild -eq 'y' -or $testBuild -eq 'Y') {
        Verify-DockerBuild
    } else {
        Write-Host ""
        Print-Warning "Skipping Docker build test"
        Write-Host "  Run manually: docker compose build dashboard"
    }

    # Print summary
    Print-Summary
}

# Run main function
Main
