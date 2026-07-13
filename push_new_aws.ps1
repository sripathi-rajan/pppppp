# Script to quickly zip and push local changes to the new AWS instance (13.222.36.11)
$ErrorActionPreference = "Stop"

Write-Host "Zipping updated files (excluding venv, node_modules, etc)..." -ForegroundColor Cyan
tar -czf update_new.tar.gz --exclude=backend/venv --exclude=backend/__pycache__ --exclude=mobile/node_modules --exclude=mobile/.expo --exclude=.git --exclude=update.tar.gz --exclude=update_new.tar.gz .

Write-Host "Uploading to NEW AWS EC2 instance..." -ForegroundColor Cyan
scp -i ".\aws-key.pem" -o StrictHostKeyChecking=no update_new.tar.gz ubuntu@13.222.36.11:~/drivelegal/

Write-Host "Extracting files and restarting backend service on AWS..." -ForegroundColor Cyan
ssh -i ".\aws-key.pem" -o StrictHostKeyChecking=no ubuntu@13.222.36.11 "cd ~/drivelegal && tar -xzf update_new.tar.gz && sudo systemctl restart drivelegal-backend"

Remove-Item update_new.tar.gz -Force
Write-Host "Done! New AWS instance successfully updated with your latest code." -ForegroundColor Green
