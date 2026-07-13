#!/bin/bash
cd mobile
npm install
npx expo export --platform web
mkdir -p dist/admin
cp ../admin/index.html dist/admin/index.html
