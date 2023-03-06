@echo off
echo Checking for updates
git fetch && git pull
cls
node ./bin/www