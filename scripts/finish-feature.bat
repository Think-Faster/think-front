@echo off
setlocal

:: Get current branch
for /f %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

if "%CURRENT_BRANCH%"=="dev" (
    color 0C
    echo You are already on dev.
    color 07
    pause
    exit /b 1
)

:: Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    color 0C
    echo Working tree is not clean.
    echo Commit or stash your changes first.
    color 07
    pause
    exit /b 1
)

echo Current branch: %CURRENT_BRANCH%
echo.

echo Switching to dev...
git checkout dev
if errorlevel 1 (
    pause
    exit /b 1
)

echo.
echo Updating dev...
git pull origin dev
if errorlevel 1 (
    git checkout %CURRENT_BRANCH%
    pause
    exit /b 1
)

echo.
echo Merging...
set "MERGE_MSG=Merge branch '%CURRENT_BRANCH%' into dev"
set CURRENT_BRANCH=%CURRENT_BRANCH: =%
set MERGE_MSG=Merge branch "%CURRENT_BRANCH%" into dev

git merge --no-ff %CURRENT_BRANCH% -m "%MERGE_MSG%"

if errorlevel 1 (
    color 0C
    echo.
    echo ==============================================
    echo            MERGE CONFLICT DETECTED!
    echo ==============================================
    color 0A
    echo.
    echo Resolve the conflicts and continue manually.
    echo.
    echo Commands:
    echo.
    echo     git status
    echo     ^<resolve conflicts^>
    echo     git add .
    echo     git commit
    echo     git push origin dev
    echo.
    color 07
    pause
    exit /b 1
)

echo.
echo Pushing dev...
git push origin dev

if errorlevel 1 (
    color 0C
    echo Push failed.
    color 07
    git checkout %CURRENT_BRANCH%
    pause
    exit /b 1
)

echo.
echo Returning to %CURRENT_BRANCH%...
git checkout %CURRENT_BRANCH%

echo.
color 0A
echo ==============================================
echo Feature successfully merged into dev.
echo GitHub Actions will now deploy dev.
echo ==============================================
color 07

:: Open GitHub Actions page
start https://github.com/Think-Faster/think-front/actions

pause
endlocal