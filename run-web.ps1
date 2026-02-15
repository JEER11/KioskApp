# KioskApp RunWeb PowerShell Script
# Installs dependencies, builds components, and starts the map-template dev server

npm install
cd packages/components
npm install
npm run build
cd ../map-template
npx vite
