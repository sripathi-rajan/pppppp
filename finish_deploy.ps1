# Run this to upload the fixed script and restart the setup!
Write-Host "Uploading fixed setup script..." -ForegroundColor Cyan
scp -i ".\aws-key.pem" -o StrictHostKeyChecking=no "scripts/setup-aws.sh" ubuntu@13.50.138.113:~/drivelegal/scripts/

Write-Host "Running setup on AWS..." -ForegroundColor Cyan
ssh -i ".\aws-key.pem" -o StrictHostKeyChecking=no ubuntu@13.50.138.113 "cd ~/drivelegal && sed -i 's/\r$//' scripts/setup-aws.sh && chmod +x scripts/setup-aws.sh && sudo ./scripts/setup-aws.sh"

Write-Host "Done! The API should now be live at http://13.50.138.113:8000" -ForegroundColor Green
