#!/bin/bash
set -e

echo "Setting up DriveLegal Backend on new AWS..."

sudo apt update
sudo apt install -y python3-pip python3-venv nginx

# Setup backend
cd ~/drivelegal/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_md

# Setup Ollama (if not disabled)
if [ ! -f /usr/local/bin/ollama ]; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
ollama serve &
sleep 5
ollama pull llama3.1:8b

# Setup systemd service
sudo cp ../scripts/drivelegal-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable drivelegal-backend
sudo systemctl start drivelegal-backend

echo "Setup complete!"
