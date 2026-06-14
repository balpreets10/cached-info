@echo off
REM ===========================================================================
REM build.bat - run the client + server for a chosen environment.
REM
REM Usage:  build.bat dev        (live: CRA dev server + nodemon API)
REM         build.bat staging    (build client w/ .env.staging, run staging API)
REM         build.bat prod       (build client for production, run prod API)
REM
REM dev      -> client: npm start            server: NODE_ENV=development
REM staging  -> client: npm run build:staging server: NODE_ENV=staging
REM prod     -> client: npm run build         server: NODE_ENV=production
REM
REM Reminder: for dev, open the SSH tunnel first (local 5433 -> droplet 5432).
REM See gamingdronzz_cachedinfo.md.
REM ===========================================================================
setlocal

set "ENVARG=%~1"

if "%ENVARG%"=="" (
  echo [build] ERROR: missing environment argument.
  echo [build] Usage: build.bat ^<dev^|staging^|prod^>
  exit /b 1
)

set "ROOT=%~dp0"
set "CLIENT=%ROOT%client"
set "SERVER=%ROOT%server"

if /i "%ENVARG%"=="dev" (
  echo [build] Starting DEV: live client dev server + API ^(NODE_ENV=development^)
  echo [build] Make sure the SSH tunnel is open ^(local 5433 -^> droplet 5432^).
  pushd "%CLIENT%"
  call npx concurrently "cd /d %SERVER% && npm run start:dev" "npm start"
  popd
  goto :end
)

if /i "%ENVARG%"=="staging" (
  echo [build] Building CLIENT for STAGING ^(.env.staging^)...
  pushd "%CLIENT%"
  call npm run build:staging
  if errorlevel 1 ( echo [build] Client staging build FAILED. & popd & exit /b 1 )
  popd
  echo [build] Starting SERVER ^(NODE_ENV=staging^)...
  pushd "%SERVER%"
  call npm run start:staging
  popd
  goto :end
)

if /i "%ENVARG%"=="prod" (
  echo [build] Building CLIENT for PRODUCTION...
  pushd "%CLIENT%"
  call npm run build:production
  if errorlevel 1 ( echo [build] Client production build FAILED. & popd & exit /b 1 )
  popd
  echo [build] Starting SERVER ^(NODE_ENV=production^)...
  pushd "%SERVER%"
  call npm run start:prod
  popd
  goto :end
)

echo [build] ERROR: unknown environment "%ENVARG%".
echo [build] Usage: build.bat ^<dev^|staging^|prod^>
exit /b 1

:end
endlocal
