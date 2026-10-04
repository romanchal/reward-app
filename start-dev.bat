@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js 20 or newer is required.
    pause
    exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
    echo Node.js 20 or newer is required.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo npm is required. Reinstall Node.js with npm included.
    pause
    exit /b 1
)
where docker >nul 2>nul
if errorlevel 1 (
    echo Docker Desktop is required for the local PostgreSQL database.
    pause
    exit /b 1
)

if not exist "package-lock.json" (
    echo package-lock.json is missing. Run this from a complete project checkout.
    pause
    exit /b 1
)
if not exist "node_modules\.bin\tsx.cmd" (
    echo Installing project dependencies...
    call npm ci
    if errorlevel 1 (
        echo Dependency installation failed.
        pause
        exit /b 1
    )
)

if not exist ".env" copy ".env.example" ".env" >nul
if not exist "web\.env" copy "web\.env.example" "web\.env" >nul

echo Starting PostgreSQL...
docker compose up -d --wait postgres
if errorlevel 1 (
    echo Failed to start PostgreSQL. Check that Docker Desktop is running.
    pause
    exit /b 1
)

echo Synchronizing the database schema...
npm exec --workspace backend -- prisma db push --skip-generate
if errorlevel 1 (
    echo Failed to synchronize the database schema.
    pause
    exit /b 1
)

echo Generating Prisma client...
npm exec --workspace backend -- prisma generate
if errorlevel 1 (
    echo Failed to generate the Prisma client.
    pause
    exit /b 1
)

echo Starting Reward App...
npm run dev
exit /b %ERRORLEVEL%