@echo off
setlocal enabledelayedexpansion
title Heating the engine...

:: Attempt to kill the node process without generating an error if it doesn't exist
taskkill /f /im node.exe >nul 2>&1

if "%1"=="" (
    title Web file converter
    :wifiCheck
    cls
    echo Checking Wi-Fi Connection...
    
    set /a retryCount=5
    set /a attempt=1

    :retryLoop
    echo Attempt !attempt! of !retryCount! to check network connection
    netsh wlan show interfaces | findstr /i "State" | findstr /i "connected" >nul
    if %errorlevel%==0 (
        echo Connected to network.
        echo Checking for updates...
        echo Waiting for network availability...
        timeout /t 2 >nul
        nslookup www.google.com >nul 2>&1
        if %errorlevel%==0 (
            echo Updating repository...
            git fetch
            git pull
            start.bat --updated
            exit
        ) else (
            echo Internet is not accessible.
            echo Update skipped.
            echo Starting server...
            npm run start
            exit
        )
    ) else (
        if "%attempt%" lss "%retryCount%" (
            echo Network not detected, retrying... [%attempt%/%retryCount%]
            set /a attempt+=1
            timeout /t 3 >nul
            goto retryLoop
        ) else (
            echo An error occurred.
            echo It looks like you are not connected to a network.
            echo Check your network connection and press any key to continue...
            pause >nul
            goto :wifiCheck
        )
    )
) else (
    echo Repository updated...
    git log -1
    timeout /t 2 >nul
    echo Installing dependencies...
    echo This may take a while.
    npm install
    echo Starting server...
    npm run start
)

pause
