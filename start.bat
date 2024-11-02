@echo off
title Heating the engine...

taskkill>nul /f /im node.exe
if "%1"=="" (
    title Web file convertor
    :wifiCheck
    cls
    echo Checking Wi-Fi Connection...
    timeout>nul /t 3
    netsh wlan show interfaces | findstr /i "State" | findstr /i "connected" >nul
    if %errorlevel%==0 (
        echo Connected to network.
        echo Checking for updates...
        echo Waiting for network availability...
        timeout>nul /t 2
        nslookup www.google.com >nul 2>&1
        if %errorlevel%==0 (
            echo Updating repository...
            git fetch
            git pull
            start.bat --updated
            exit
        ) else (
            REM Internet is not accessible, do something else here
            echo Internet is not accessible.
            echo Update skipped.
            echo Starting server...
            npm run start
        )
    ) else (
        echo An error occured.
        echo It looks like you are not connected to a network.
        echo Check your network connection and press any to continue...
        pause>nul
        goto :wifiCheck
    )
) else (
    echo Repository updated...
    git log -1
    timeout>nul /t 2
    echo Installing dependencies...
    echo This may take a while.
    npm install
    cls
    echo Starting server...
    npm run start
)
pause