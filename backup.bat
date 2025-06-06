@echo off
set BACKUP_DIR=family-ai-assistant.backup.2025-06-06

:: Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Copy main project files
xcopy /E /I /H /Y main "%BACKUP_DIR%\main"
xcopy /E /I /H /Y renderer "%BACKUP_DIR%\renderer"
xcopy /E /I /H /Y src "%BACKUP_DIR%\src"
xcopy /E /I /H /Y tests "%BACKUP_DIR%\tests"
xcopy /E /I /H /Y assets "%BACKUP_DIR%\assets"

:: Copy configuration files
copy package.json "%BACKUP_DIR%"
copy package-lock.json "%BACKUP_DIR%"
copy tsconfig.json "%BACKUP_DIR%"
copy .babelrc "%BACKUP_DIR%"
copy jest.config.js "%BACKUP_DIR%"
copy playwright.config.ts "%BACKUP_DIR%"
copy preload.js "%BACKUP_DIR%"
copy main.js "%BACKUP_DIR%"
copy project-context.md "%BACKUP_DIR%"
copy README.md "%BACKUP_DIR%"
copy .gitignore "%BACKUP_DIR%"
copy docker-compose.yml "%BACKUP_DIR%"
copy Dockerfile "%BACKUP_DIR%"

echo Backup completed to %BACKUP_DIR% 