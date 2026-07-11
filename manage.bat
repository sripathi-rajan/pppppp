@echo off

if "%1"=="install" goto install
if "%1"=="install-backend" goto install-backend
if "%1"=="install-mobile" goto install-mobile
if "%1"=="host-backend" goto host-backend
if "%1"=="host-mobile" goto host-mobile
if "%1"=="host-web" goto host-web
if "%1"=="help" goto help
if "%1"=="" goto help

echo Unknown command. Run 'manage.bat help' for a list of commands.
goto :eof

:install
echo Installing backend dependencies...
cd backend && pip install -r requirements.txt && cd ..
echo Installing mobile dependencies...
cd mobile && npm install && cd ..
goto :eof

:install-backend
cd backend && pip install -r requirements.txt && cd ..
goto :eof

:install-mobile
cd mobile && npm install && cd ..
goto :eof

:host-backend
cd backend && python main.py
goto :eof

:host-mobile
cd mobile && npm start
goto :eof

:host-web
cd mobile && npm run web
goto :eof

:help
echo Available commands:
echo   manage.bat host-backend    - Run the FastAPI backend server
echo   manage.bat host-mobile     - Start the Expo mobile server (for iOS/Android apps)
echo   manage.bat host-web        - Start the Expo web server (for web app)
echo   manage.bat install         - Install all dependencies (backend + mobile)
echo   manage.bat install-backend - Install backend dependencies
echo   manage.bat install-mobile  - Install mobile dependencies
goto :eof
