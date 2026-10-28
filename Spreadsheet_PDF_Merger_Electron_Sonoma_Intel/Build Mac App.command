#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Run setup.command first."
  read -p "Press Return to close..."
  exit 1
fi
npm run dist:mac:intel
echo
echo "Build output is in the dist folder."
echo "For Intel Mac builds, run this on the Intel Mac itself."
echo "The app is unsigned and not notarized."
read -p "Press Return to close..."
