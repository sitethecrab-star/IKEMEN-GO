@echo off
setlocal
cd /d "%~dp0"
title IKEMEN GO Launcher - build package

echo.
echo  ================================================
echo   IKEMEN GO Launcher - build a package to share
echo  ================================================
echo.

rem ---- 0. Dependencies (first time only) ----------------------------
if not exist "node_modules" (
  echo  [0/4] Installing dependencies ^(first time only^)...
  call npm install
  if errorlevel 1 goto build_error
)

rem ---- 1. Build -----------------------------------------------------
echo  [1/4] Building the program (this may take a few minutes)...
echo.
rem --no-bundle: only the .exe is needed (no MSI/NSIS installers, which
rem download extra tools and can fail without internet).
call npm run tauri build -- --no-bundle
if errorlevel 1 goto build_error

set "EXE=src-tauri\target\release\ikemen_go_launcher.exe"
if not exist "%EXE%" goto build_error

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content 'src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json).version"`) do set "VER=%%v"
if "%VER%"=="" set "VER=1.0.0"

rem ---- 2. Update the exe in this folder (your own use) --------------
echo.
echo  [2/4] Updating ikemen_go_launcher.exe in this folder...
copy /y "%EXE%" "ikemen_go_launcher.exe" >nul
if errorlevel 1 echo        WARNING: close the Launcher if it is open and run this again to update this exe.

rem ---- 3. Assemble the package folder -------------------------------
echo  [3/4] Assembling the package folder...
set "OUT=Package\IKEMEN-GO-Launcher"
if exist "Package" rmdir /s /q "Package"
xcopy /e /i /q /y "package-template" "%OUT%" >nul
copy /y "%EXE%" "%OUT%\IKEMEN GO Launcher.exe" >nul
if exist "LICENSE.txt" copy /y "LICENSE.txt" "%OUT%\LICENSE.txt" >nul

rem ---- 4. Zip -------------------------------------------------------
echo  [4/4] Creating the .zip file...
set "ZIP=Package\IKEMEN-GO-Launcher-v%VER%.zip"
rem tar.exe (Windows 10/11) writes standard "/" paths in the zip, which
rem every unzip tool reads correctly. Compress-Archive is the fallback.
tar -a -c -f "%ZIP%" -C "Package" "IKEMEN-GO-Launcher" 2>nul
if errorlevel 1 (
  if exist "%ZIP%" del /q "%ZIP%"
  powershell -NoProfile -Command "Compress-Archive -Path '%OUT%' -DestinationPath '%ZIP%' -Force"
  if errorlevel 1 goto zip_error
)

echo.
echo  Done! Package created:
echo     %CD%\%ZIP%
echo.
echo  Just share this .zip. Users extract it inside their IKEMEN GO folder.
echo.
start "" explorer "%CD%\Package"
pause
exit /b 0

:build_error
echo.
echo  ERROR: the build failed. See the messages above.
echo  (Node.js and Rust are required - only on your PC, not on the users' PCs.)
echo.
pause
exit /b 1

:zip_error
echo.
echo  ERROR creating the .zip. The folder "%OUT%" was assembled anyway.
echo.
pause
exit /b 1
