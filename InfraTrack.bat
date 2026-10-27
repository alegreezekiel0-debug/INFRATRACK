@echo off
setlocal
cd /d "%~dp0"
start "InfraTrack MySQL Backend" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\start-backend.ps1"
echo Waiting for the InfraTrack backend...
for /L %%i in (1,1,60) do (
    powershell.exe -NoProfile -Command "try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/health' -TimeoutSec 1; if ($response.status -eq 'ok') { exit 0 } } catch {}; exit 1" >nul 2>&1
    if not errorlevel 1 goto backendReady
    timeout /t 2 /nobreak >nul
)
echo The backend did not become ready. Check the InfraTrack MySQL Backend window for an error.
echo Confirm that MySQL Server is running, then launch InfraTrack again.
exit /b 1
:backendReady
start "" "%~dp0node_modules\electron\dist\electron.exe" . %*
endlocal
