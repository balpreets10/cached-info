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
REM Dev DB: uses the LOCAL Postgres on 127.0.0.1:5432 (see server\.env.development).
REM Only open the SSH tunnel (local 5433 -> droplet 5432) if you want dev to point
REM at the droplet DB instead. See gamingdronzz_cachedinfo.md.
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
  echo [build] Using LOCAL Postgres on 127.0.0.1:5432 ^(see server\.env.development^).
  call :killport 5000
  call :killport 3000
  pushd "%CLIENT%"
  call npx concurrently "cd /d %SERVER% && npm run start:dev" "npm start"
  popd
  goto :end
)

if /i "%ENVARG%"=="staging" (
  call :killport 5000
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
  call :killport 5000
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

REM ---------------------------------------------------------------------------
REM :killport <port> - terminate any process LISTENING on the given TCP port,
REM along with its child processes.
REM Frees a stale server/client before we start a new one (avoids EADDRINUSE
REM and stale-env processes that miss .env edits made after they started).
REM
REM /T kills the whole process tree: CRA's `npm start` and `concurrently` spawn
REM a webpack-dev-server child that keeps the socket open after the parent dies,
REM so killing only the parent PID would leave port 3000 occupied for the next run.
REM The "_K_<PID>" env flag dedupes PIDs (IPv4 + IPv6 rows share one PID) so we
REM don't taskkill the same process twice.
REM
REM IMPORTANT: this runs inside its own setlocal/endlocal. A bare `set` in a
REM subroutine leaks into the script's environment, and the child processes we
REM later spawn (concurrently, the API, CRA) inherit it. In particular the var
REM name PORT is read by the server's config and by react-scripts, so leaking
REM PORT=3000 here made the API bind to 3000 and steal the client's port. The
REM setlocal below scopes KPORT and the _K_<PID> flags to this call only.
REM ---------------------------------------------------------------------------
:killport
setlocal
set "KPORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano -p TCP ^| findstr /R /C:":%KPORT%[ ]" ^| findstr "LISTENING"') do (
  if not defined _K_%%P (
    set "_K_%%P=1"
    echo [build] Killing process tree on port %KPORT% ^(PID %%P^)...
    taskkill /F /T /PID %%P >nul 2>&1
  )
)
endlocal
exit /b 0

:end
endlocal
