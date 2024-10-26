@echo off
title Heating the engine...
taskkill>nul /f /im node.exe
if "%1"=="" (
    title Web file convertor
    echo Checking for updates...
    echo Waiting for network availability...
    ping -n 8 www.google.com >nul 2>&1
    if %errorlevel%==0 (
        git fetch>nul
        git pull>nul
        if %errorlevel%==1 (
            start.bat --updated
            exit
        ) else (
            echo Repository is up to date.
            echo Starting server...
            npm run start
        )
    ) else (
        REM Internet is not accessible, do something else here
        echo Internet is not accessible.
        echo Update skipped.
        echo Starting server...
        npm run start
    )
) else (
    echo Repository updated...
    git log -1
    timeout>nul /t 5
    cls
    echo Starting server...
    npm run start
)
pause