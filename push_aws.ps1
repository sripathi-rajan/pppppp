# Script to quickly zip and push local changes to AWS without using Git
$ErrorActionPreference = "Stop"

Write-Host "Building web frontend locally..." -ForegroundColor Cyan
Push-Location mobile
npx expo export --platform web
Pop-Location

Write-Host "Zipping updated files (excluding venv, node_modules, etc)..." -ForegroundColor Cyan
tar -czf update.tar.gz --exclude=backend/venv --exclude=backend/__pycache__ --exclude=mobile/node_modules --exclude=mobile/.expo --exclude=.git --exclude=update.tar.gz .

Write-Host "Uploading to AWS EC2 instance..." -ForegroundColor Cyan
scp -i ".\aws-key.pem" -o StrictHostKeyChecking=no update.tar.gz ubuntu@13.50.138.113:~/drivelegal/

Write-Host "Extracting files and restarting backend service on AWS..." -ForegroundColor Cyan
ssh -i ".\aws-key.pem" -o StrictHostKeyChecking=no ubuntu@13.50.138.113 "cd ~/drivelegal && tar -xzf update.tar.gz && sudo systemctl restart drivelegal-backend"

Remove-Item update.tar.gz -Force
Write-Host "Done! AWS instance successfully updated with your latest code." -ForegroundColor Green
