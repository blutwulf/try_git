#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is required. Install the macOS Intel installer from https://nodejs.org/en/download."
  read -p "Press Return to close..."
  exit 1
fi
echo "Installing JavaScript dependencies…"
npm install
echo
echo "Setup complete. Starting the desktop app…"
npm start
