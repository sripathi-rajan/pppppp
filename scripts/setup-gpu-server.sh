#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DriveLegal — GPU Server Setup (g4dn.xlarge, Ubuntu 24.04, NVIDIA T4)
# ═══════════════════════════════════════════════════════════════════════════════
#
# HOW TO USE (run ON the server, as user 'ubuntu'):
#   bash setup-gpu-server.sh
#
# The script is IDEMPOTENT and safe to re-run.
# On first run (no NVIDIA driver yet) it installs the driver and asks you to
# reboot. After `sudo reboot`, run it AGAIN and it finishes everything.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="/home/ubuntu/drivelegal"
REPO="https://github.com/Dakshankarthic/ppppppppp"   # backend code source
MODEL="llama3.1:8b"                                    # main chat model (fits T4 16GB)

echo "═══ Step 0: NVIDIA driver check ═══"
if ! command -v nvidia-smi &>/dev/null || ! nvidia-smi &>/dev/null; then
  echo "NVIDIA driver not active — installing (one-time)..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq ubuntu-drivers-common
  sudo ubuntu-drivers install --gpgpu || sudo apt-get install -y nvidia-driver-535-server
  echo ""
  echo ">>> NVIDIA driver installed. NOW REBOOT, then run this script again:"
  echo ">>>     sudo reboot"
  exit 0
fi
nvidia-smi
echo "✅ GPU detected."

echo "═══ Step 1: System packages ═══"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  python3-venv python3-pip python3-dev build-essential git curl nginx

echo "═══ Step 2: Get backend code ═══"
if [ ! -d "$APP_DIR/backend" ]; then
  git clone "$REPO" "$APP_DIR"
else
  echo "Code already present at $APP_DIR."
fi
cd "$APP_DIR"

echo "═══ Step 3: Python venv + dependencies ═══"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip -q
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/pip install email-validator          # required (pydantic EmailStr), not in requirements.txt
.venv/bin/python -m spacy download en_core_web_sm || true

echo "═══ Step 4: Ollama (GPU) ═══"
if ! command -v ollama &>/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
sudo systemctl enable --now ollama
sleep 5
ollama pull "$MODEL"
# Optional image/vision support (large ~8GB, uncomment if you use photo queries):
# ollama pull llama3.2-vision:latest

echo "═══ Step 5: Production .env ═══"
if [ ! -f backend/.env ]; then
  JWT=$(openssl rand -hex 32)
  cat > backend/.env <<EOF
# DriveLegal Production — GPU server (Elastic IP 13.222.36.11)
JWT_SECRET=${JWT}
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_API_KEY=ollama
OLLAMA_MODEL=${MODEL}
OLLAMA_VISION_MODEL=llama3.2-vision:latest
GEMINI_API_KEY=
DISABLE_OLLAMA=false
PORT=8000
PRODUCTION=true
EOF
  echo "Wrote backend/.env (JWT secret generated)."
else
  echo "backend/.env already exists — leaving as is."
fi

echo "═══ Step 6: systemd service ═══"
sudo tee /etc/systemd/system/drivelegal-backend.service >/dev/null <<EOF
[Unit]
Description=DriveLegal FastAPI Backend
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=${APP_DIR}
Environment="PATH=${APP_DIR}/.venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=${APP_DIR}/.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable drivelegal-backend
sudo systemctl restart drivelegal-backend
sleep 8

echo "═══ Step 7: Health check ═══"
curl -s http://localhost:8000/health || true
echo ""
echo "═══ GPU usage (should say GPU, not CPU) ═══"
ollama ps || true
echo ""
echo "✅ DONE. Test from anywhere:  curl http://13.222.36.11:8000/health"
echo "   (Make sure port 8000 is open in the instance's security group.)"
