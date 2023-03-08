@echo off
title Heating the engine...

if "%1"=="" (
    title Checking for updates
    echo Checking for updates...
    echo Waiting for network availability...
    ping -n 4 www.github.com >nul
    if %errorlevel%==0 (
        git fetch
        git pull
        if %errorlevel%==1 (
            echo Repository has been updated.
            start.bat --updated
            exit
        ) else (
            echo Repository is up to date.
            echo Starting server...
            node ./bin/www
        )
    ) else (
        REM Internet is not accessible, do something else here
        title Web file convertor
        echo Internet is not accessible.
        echo Update skipped.
        echo Starting server...
        node ./bin/www
    )
) else (
    echo Repository updated...
    git log -1
    timeout>nul /t 5
    cls
    echo Starting server...
    node ./bin/www
)