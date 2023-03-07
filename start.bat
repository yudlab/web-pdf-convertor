@echo off
title Checking for updates
echo Checking for updates...
echo ...
echo Waiting for network availability...

ping -n 4 www.github.com >nul
if %errorlevel%==0 (
    git fetch
    git pull
    if %errorlevel%==1 (
        echo Repository has been updated.
        echo Starting server...
        node ./bin/www
    ) else (
        echo Repository is up to date.
        echo Starting server...
        node ./bin/www
    )
) else (
    REM Internet is not accessible, do something else here
    echo Internet is not accessible.
    echo Update skipped.
    echo Starting server...
    node ./bin/www
)