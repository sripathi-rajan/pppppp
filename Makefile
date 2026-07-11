.PHONY: help install install-backend install-mobile host-backend host-mobile host-web

# Default target
help:
	@echo "Available commands:"
	@echo "  make host-backend    - Run the FastAPI backend server"
	@echo "  make host-mobile     - Start the Expo mobile server (for iOS/Android apps)"
	@echo "  make host-web        - Start the Expo web server (for web app)"
	@echo "  make install         - Install all dependencies (backend + mobile)"
	@echo "  make install-backend - Install backend dependencies"
	@echo "  make install-mobile  - Install mobile dependencies"

install: install-backend install-mobile

install-backend:
	cd backend && pip install -r requirements.txt

install-mobile:
	cd mobile && npm install

host-backend:
	cd backend && python main.py

host-mobile:
	cd mobile && npm start

host-web:
	cd mobile && npm run web
